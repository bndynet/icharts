import type {
  TreeData,
  TreeNode,
  TreeChartOptions,
  TreeDirection,
  TreeNodeIconSpec,
} from '../types.js';
import type { ChartSetupResult, RenderContext } from './index.js';
import { sankeyChordParamsToTooltipContext } from '../tooltip-context.js';
import { getConfig } from '../config.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  applyConfiguredFontFamilyToOption,
  buildTitle,
  buildAsyncTooltipFormatter,
  compileRichText,
  getLabelFontSize,
  getTitleReserve,
  measureCompiledLabelWidth,
  mergeCompiledRichStyles,
  renderIconDataUrl,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common/index.js';

/**
 * Default node marker diameter (px). Matches the ECharts `tree-basic`
 * example, which is calibrated so a 12 px label sits cleanly next to the
 * symbol without crowding.
 */
const DEFAULT_NODE_SIZE = 7;

/**
 * Breathing room (px) between the rendered label glyph and the canvas
 * edge — keeps the text from kissing the chart's outer border even
 * after we've reserved its full pixel width.
 */
const TREE_LABEL_GAP_PX = 10;

/**
 * Hard cap (px) on label-overflow reserve per edge. Without this, a
 * single 60-char node name could shrink the tree body to nothing —
 * mirroring the `NETWORK_CIRCULAR_LABEL_MAX_RESERVE_PX` policy used by
 * the network adapter's circular variant. 200 px ≈ 28 chars at the
 * default 12 px sans-serif, which covers every reasonable identifier;
 * truly enormous names get clipped at the edge (a far less destructive
 * failure than swallowing the whole chart body).
 */
const TREE_LABEL_MAX_RESERVE_PX = 200;

/**
 * Floor (px) on label-overflow reserve per edge — applied to whichever
 * edges actually receive a label-driven reserve (i.e. *not* the
 * perpendicular axes in horizontal layouts). Guarantees enough room for
 * a short label like "A" even when measurement is unavailable (SSR /
 * jsdom without canvas layout). Tuned to the default 12 px font:
 * `'Frontend'` measures ~55 px, `'CEO'` ~25 px; 40 px is the threshold
 * where a one-word label looks padded rather than crammed.
 */
const TREE_LABEL_MIN_RESERVE_PX = 40;

/**
 * Approximate line-height ratio for the default sans-serif label font.
 * Used to derive the *perpendicular-axis* reserve in vertical layouts
 * (TB/BT): rotated -90° labels are a thin vertical strip whose
 * horizontal extent equals one line-height, anchored on the node's
 * x-position — so `fontSize * ratio / 2 + gap` per side is plenty.
 *
 * Multiplying by the effective `labelFontSize` (rather than baking in a
 * fixed 18 px) keeps the perp slot proportional when the user overrides
 * `ChartOptions.labelFontSize` — e.g. raising the global label size to
 * 18 px would otherwise leave vertical-layout side reserves too tight,
 * letting the leftmost / rightmost rotated labels kiss the canvas edge.
 */
const TREE_LABEL_LINE_HEIGHT_RATIO = 1.5;

/**
 * Per-direction layout metadata. Two label-rendering regimes:
 *
 * `'horizontal'` layouts (`'LR'`, `'RL'`) — labels render horizontally,
 * extending OUTSIDE each node along the X axis. Parent labels grow
 * toward the root edge, leaf labels grow toward the opposite edge.
 * Both side edges therefore need a label-width reserve; vertical
 * clipping is just half line-height (negligible next to padding).
 *
 * `'vertical'` layouts (`'TB'`, `'BT'`) — labels are rotated 90° so they
 * read in the same direction the tree grows: `'TB'` rotates labels
 * **clockwise** (`-90`) so text reads top-to-bottom alongside a
 * downward-growing tree; `'BT'` rotates labels **counter-clockwise**
 * (`+90`) so text reads bottom-to-top alongside an upward-growing tree.
 *
 * Practical wins of rotated labels in vertical layouts:
 *   - tall narrow node names ("AgglomerativeCluster") fit naturally in
 *     a deep vertical tree without overlapping horizontal neighbours;
 *   - the perpendicular (horizontal) axis only needs ~half font-height
 *     of reserve, freeing up canvas width for the actual tree spread.
 *
 * After rotation, the label's unrotated text-width becomes vertical
 * extent, so the active axis (top/bottom) needs a full label-width
 * reserve — same formula as horizontal layouts. The reserve math is
 * rotation-sign-agnostic: ±90° both produce the same bounding box.
 */
interface DirectionLayout {
  orient: 'LR' | 'RL' | 'TB' | 'BT';
  axis: 'horizontal' | 'vertical';
  parentPosition: 'left' | 'right' | 'top' | 'bottom';
  parentAlign: 'left' | 'right' | 'center';
  leafPosition: 'left' | 'right' | 'top' | 'bottom';
  leafAlign: 'left' | 'right' | 'center';
  /**
   * Rotation (degrees) applied to BOTH parent and leaf labels — ECharts
   * convention: positive = counter-clockwise.
   *   - `0` keeps labels horizontal (LR/RL).
   *   - `-90` rotates clockwise so text reads top-to-bottom (TB).
   *   - `+90` rotates counter-clockwise so text reads bottom-to-top (BT).
   * The sign tracks the tree growth direction, so the reading direction
   * always matches the tree's flow.
   */
  labelRotate: number;
  /** Canvas edge the root (and parent labels) grow toward. */
  rootEdge: 'top' | 'bottom' | 'left' | 'right';
  /** Canvas edge the leaves (and leaf labels) grow toward. */
  leafEdge: 'top' | 'bottom' | 'left' | 'right';
}

const DIRECTION_LAYOUT: Record<TreeDirection, DirectionLayout> = {
  LR: {
    orient: 'LR',
    axis: 'horizontal',
    parentPosition: 'left',
    parentAlign: 'right',
    leafPosition: 'right',
    leafAlign: 'left',
    labelRotate: 0,
    rootEdge: 'left',
    leafEdge: 'right',
  },
  RL: {
    orient: 'RL',
    axis: 'horizontal',
    parentPosition: 'right',
    parentAlign: 'left',
    leafPosition: 'left',
    leafAlign: 'right',
    labelRotate: 0,
    rootEdge: 'right',
    leafEdge: 'left',
  },
  // 'TB': clockwise rotation (`-90`). Text reads top-to-bottom alongside
  // the tree. With `rotate: -90`, the unrotated text's RIGHT end lands
  // at the BOTTOM of the rendered glyph — so to anchor parent labels
  // above the node (and grow them UPWARD into the top reserve) we use
  // `align: 'right'`. Leaf labels mirror with `align: 'left'`.
  TB: {
    orient: 'TB',
    axis: 'vertical',
    parentPosition: 'top',
    parentAlign: 'right',
    leafPosition: 'bottom',
    leafAlign: 'left',
    labelRotate: -90,
    rootEdge: 'top',
    leafEdge: 'bottom',
  },
  // 'BT': counter-clockwise rotation (`+90`) so text reads bottom-to-top,
  // matching the tree's upward growth direction. With `rotate: +90`
  // the unrotated text's RIGHT end lands at the TOP of the rendered
  // glyph — flipped vs. 'TB'. To anchor parent labels BELOW the node
  // (and grow them DOWNWARD into the bottom reserve), we still need
  // the rotated bottom to sit on the anchor: that's `align: 'right'`
  // (whose unrotated right-end is now the rotated top), so the
  // unrotated left-end (rotated bottom) sits at the anchor and text
  // grows away from the node. Leaf labels mirror with `align: 'left'`.
  BT: {
    orient: 'BT',
    axis: 'vertical',
    parentPosition: 'bottom',
    parentAlign: 'right',
    leafPosition: 'top',
    leafAlign: 'left',
    labelRotate: 90,
    rootEdge: 'bottom',
    leafEdge: 'top',
  },
};

/**
 * Walk the tree and collect every node name in pre-order. The resulting
 * array drives the palette lookup via {@link resolveColors} — one color
 * per node, in traversal order.
 */
function collectNodeNames(root: TreeNode): string[] {
  const out: string[] = [];
  const visit = (node: TreeNode): void => {
    out.push(node.name);
    if (node.children) for (const child of node.children) visit(child);
  };
  visit(root);
  return out;
}

/**
 * Names split by ECharts' "leaf vs parent" distinction — leaves are
 * nodes with no `children`, everything else is a parent (including
 * the root and any intermediate node). The two groups receive
 * different label `position` defaults from this adapter (parents on
 * the root-side, leaves on the opposite side), so we measure them
 * separately for the body-reserve math.
 */
interface SplitNodeNames {
  leafLabels: Array<{ name: string; compiled: ReturnType<typeof compileRichText> }>;
  parentLabels: Array<{ name: string; compiled: ReturnType<typeof compileRichText> }>;
}

const TREE_LABEL_TOKEN_KEY = '__ichLabelText';
const TREE_ICON_META_KEY = '__ichIconMeta';

/**
 * Fallback border / fill color when the resolver doesn't surface a
 * palette color for a node (e.g. the node's name isn't in the resolved
 * `names` array, which shouldn't happen for tree adapters but is
 * defensive). Slate-400-equivalent — visible against both light and
 * dark themes without screaming for attention. Adapters elsewhere use
 * the same neutral as a last-resort defensive color.
 */
const TREE_ICON_FALLBACK_COLOR = '#94a3b8';

/**
 * Icon→label gap calibration for nodes that carry a custom icon
 * (`formatNodeIcon` returned an `image` / `circle` spec). ECharts'
 * default `label.distance` is 5 px — fine for a 7 px dot, but reads
 * as cramped as soon as the symbol carries any real visual mass
 * (avatars, logos, app icons). We scale the gap proportionally to the
 * icon's larger dimension and clamp at a comfortable floor:
 *
 *   distance = max(round(maxIconDim * RATIO), FLOOR)
 *
 * Calibration:
 *   - 36 px avatar → 12 px gap (comfortable list-item spacing)
 *   - 24 px icon  → 8 px (clamped to floor; tight icons don't need
 *                          loose labels)
 *   - 12 px badge → 8 px (floor)
 *
 * Why 1/3 + an 8 px floor (vs. a fixed bump or a single magic number)?
 *   - The 1/3 ratio echoes typographic spacing rules of thumb (caption
 *     gap ≈ 1/3 of the visual element it labels) so it scales with
 *     custom sizes without surprising users.
 *   - The 8 px floor matches the smallest gap that consistently reads
 *     as "intentional space" rather than "rendering glitch" at typical
 *     label font sizes (12–14 px) — anything smaller and the label
 *     looks glued to the icon.
 *
 * Only applied when the node carries a custom icon. Default 7 px dot
 * nodes keep ECharts' built-in 5 px gap so existing layouts that
 * don't opt into `formatNodeIcon` see no reflow.
 */
const TREE_ICON_LABEL_DISTANCE_RATIO = 1 / 3;
const TREE_ICON_LABEL_DISTANCE_FLOOR_PX = 8;

/**
 * Metadata stashed on each node whose icon needs the canvas baking
 * pipeline. Two flavors of node end up with this:
 *
 *   - `shape: 'circle'` — *always* needs the canvas (for the circular
 *     clip + contain-fit), regardless of border. Sync placeholder is
 *     a `circle` ECharts symbol with palette fill (and palette ring
 *     when `borderWidth > 0`).
 *   - `shape: 'rect'`  — only when `borderWidth > 0`. Without a
 *     border, square icons skip canvas baking entirely and use a
 *     plain `image://<URL>` symbol that ECharts loads natively. With
 *     a border, the only way to draw a frame around an image symbol
 *     is to bake it into the bitmap (ECharts ignores
 *     `itemStyle.border*` on image symbols), so the rect goes through
 *     the same async-swap pipeline as circles. Sync placeholder is
 *     a `rect` ECharts symbol (which DOES respect `itemStyle.border*`
 *     because it's a shape symbol, not an image symbol).
 *
 * The metadata lives in a private symbol-keyed property so
 * {@link createTreeIconOnInit} can walk the tree post-render and
 * asynchronously swap each placeholder for a pre-composited
 * `image://<dataUrl>` symbol — see {@link renderIconDataUrl} for the
 * bitmap pipeline.
 */
interface IconMeta {
  shape: 'circle' | 'rect';
  src: string;
  width: number;
  height: number;
  borderColor: string;
  /** `0` means no border (canvas helper skips the stroke). */
  borderWidth: number;
}

function isRichTextSpecLike(
  value: unknown,
): value is Extract<Parameters<typeof compileRichText>[0], object> {
  if (typeof value !== 'object' || value === null) return false;
  if (!('segments' in value)) return false;
  return Array.isArray((value as { segments?: unknown }).segments);
}

function splitNodeNames(root: TreeNode, options: TreeChartOptions): SplitNodeNames {
  const leafLabels: Array<{ name: string; compiled: ReturnType<typeof compileRichText> }> = [];
  const parentLabels: Array<{ name: string; compiled: ReturnType<typeof compileRichText> }> =
    [];
  let labelIndex = 0;
  const visit = (node: TreeNode, depth: number): void => {
    if (node.children && node.children.length > 0) {
      parentLabels.push({
        name: node.name,
        compiled: compileNodeLabel(
          node,
          depth,
          false,
          options,
          `treeLabel_${labelIndex++}`,
        ),
      });
      for (const child of node.children) visit(child, depth + 1);
    } else {
      leafLabels.push({
        name: node.name,
        compiled: compileNodeLabel(node, depth, true, options, `treeLabel_${labelIndex++}`),
      });
    }
  };
  visit(root, 0);
  return { leafLabels, parentLabels };
}

function compileNodeLabel(
  node: TreeNode,
  depth: number,
  isLeaf: boolean,
  options: TreeChartOptions,
  keyPrefix: string,
): ReturnType<typeof compileRichText> {
  const ctx = { node, name: node.name, depth, isLeaf };
  const formatter = options.formatNodeLabel;
  let base = compileRichText(node.name, keyPrefix);
  try {
    if (formatter) {
      const out = formatter(ctx);
      if (typeof out === 'string' || isRichTextSpecLike(out)) {
        base = compileRichText(out, keyPrefix);
      }
    }
  } catch {
    // Fallback to raw node name when formatter fails.
  }
  return base;
}

function resolveTreeIconSpec(
  formatter: NonNullable<TreeChartOptions['formatNodeIcon']>,
  ctx: { node: TreeNode; name: string; depth: number; isLeaf: boolean },
): TreeNodeIconSpec | undefined {
  try {
    const out = formatter(ctx);
    if (!out) return undefined;
    if (typeof out === 'string') return { image: out };
    if (typeof out === 'object' && typeof out.image === 'string') return out;
    return undefined;
  } catch {
    return undefined;
  }
}

function measureWidestCompiledLabel(
  labels: ReadonlyArray<{ name: string; compiled: ReturnType<typeof compileRichText> }>,
): number {
  let widest = 0;
  for (const label of labels) {
    widest = Math.max(widest, measureCompiledLabelWidth(label.compiled));
  }
  return widest;
}

/** Clamp a label-driven reserve into `[MIN, MAX]`, then add the gap. */
function clampLabelReserve(widestPx: number): number {
  if (widestPx <= 0) return 0;
  const withGap = widestPx + TREE_LABEL_GAP_PX;
  return Math.max(
    TREE_LABEL_MIN_RESERVE_PX,
    Math.min(TREE_LABEL_MAX_RESERVE_PX, withGap),
  );
}

/**
 * Walk the tree, producing a deep copy of the ECharts-shaped node tree.
 *
 * Adapter responsibilities at each level:
 *   - copy `name` and (when present) `value` straight through;
 *   - honor `collapsed` from input;
 *   - assemble `itemStyle.color` from the resolved palette OR the
 *     per-node `node.color` override (override wins).
 *
 * Returns a plain object that ECharts can consume directly. Mutation of
 * the returned tree is safe — none of the original `TreeNode` instances
 * are reused.
 */
function annotateTree(
  root: TreeNode,
  nameToColor: ReadonlyMap<string, string>,
  options: TreeChartOptions,
): Record<string, unknown> {
  let labelIndex = 0;
  const hasCustomLabel = typeof options.formatNodeLabel === 'function';
  const formatIcon = options.formatNodeIcon;
  const visit = (node: TreeNode, depth: number): Record<string, unknown> => {
    const out: Record<string, unknown> = { name: node.name };
    if (node.value !== undefined) out.value = node.value;
    if (node.collapsed) out.collapsed = true;
    const isLeaf = !node.children || node.children.length === 0;
    if (hasCustomLabel) {
      const compiled = compileNodeLabel(
        node,
        depth,
        isLeaf,
        options,
        `treeLabel_${labelIndex++}`,
      );
      out[TREE_LABEL_TOKEN_KEY] = compiled.text;
    }
    const paletteColor = node.color ?? nameToColor.get(node.name);
    // Tracks whether the icon branch already emitted a custom `itemStyle`
    // (placeholder fill / border for nodes routed through the canvas
    // pipeline OR plain image-symbol nodes — note that image-symbol
    // nodes never set `itemStyle`, so this gate is really "did the icon
    // branch claim ownership of the node's appearance"). When false, we
    // fall through to the default `itemStyle: { color: paletteColor }`
    // assignment below; when true, we leave the icon's setup intact.
    let usesAsyncIcon = false;
    if (formatIcon) {
      const icon = resolveTreeIconSpec(formatIcon, {
        node,
        name: node.name,
        depth,
        isLeaf,
      });
      if (icon) {
        const width = icon.width ?? 20;
        const height = icon.height ?? width;
        // Border is opt-in: a missing `borderWidth` means no border,
        // even on circles. Users who want the old default 2 px palette
        // ring must say so explicitly. Setting `borderWidth: 0` is
        // equivalent to omitting it — both produce a no-border render.
        const hasBorder =
          icon.borderWidth !== undefined && icon.borderWidth > 0;
        const placeholderFill =
          paletteColor ?? TREE_ICON_FALLBACK_COLOR;
        // `borderColor` falls back to the palette fill so a node with
        // a per-node `color` (or palette token) still gets a tinted
        // ring even if the user only specified `borderWidth`.
        const borderColor = icon.borderColor ?? placeholderFill;
        const borderWidth = hasBorder ? (icon.borderWidth as number) : 0;

        if (icon.shape === 'circle') {
          // Circles ALWAYS go through the canvas pipeline — that's the
          // only way to get a circular clip + contain-fit on top of an
          // arbitrary source image. The border is optional (canvas
          // helper skips the stroke when `borderWidth === 0`).
          //
          // Synchronous placeholder: an ECharts `circle` shape symbol
          // tinted with the node's palette color. NO pattern fill with
          // `itemStyle.color: { image }` — that's the buggy path we
          // replaced: ECharts pattern fill is positioned in world
          // coords (not shape-local), so the avatar appears off-center
          // and cropped under a circle shape; `itemStyle.borderRadius`
          // has no effect on the built-in `circle` symbol either. The
          // placeholder exists ONLY to render a visible marker until
          // the async swap and stash metadata that the swap consumes.
          out.symbol = 'circle';
          usesAsyncIcon = true;
          out[TREE_ICON_META_KEY] = {
            shape: 'circle',
            src: icon.image,
            width,
            height,
            borderColor,
            borderWidth,
          } satisfies IconMeta;
          out.itemStyle = hasBorder
            ? { color: placeholderFill, borderColor, borderWidth }
            : { color: placeholderFill };
        } else {
          // Square: only run the canvas pipeline when the user wants a
          // border around the image. ECharts' image symbol cannot draw
          // `itemStyle.border*` (the image is the symbol; no underlying
          // shape geometry to stroke), so a bordered square avatar
          // *requires* baking the frame into the PNG. Without a border
          // we keep the simpler path — `image://<URL>` — which lets
          // ECharts load the image natively (no CORS friction).
          if (hasBorder) {
            // Sync placeholder: ECharts `rect` shape symbol — unlike
            // image symbols, shape symbols DO respect `itemStyle.border*`,
            // so we get a clean colored frame around a palette-fill
            // square until the baked PNG swaps in.
            out.symbol = 'rect';
            usesAsyncIcon = true;
            out[TREE_ICON_META_KEY] = {
              shape: 'rect',
              src: icon.image,
              width,
              height,
              borderColor,
              borderWidth,
            } satisfies IconMeta;
            out.itemStyle = {
              color: placeholderFill,
              borderColor,
              borderWidth,
            };
          } else {
            // No border requested → no canvas needed → ECharts loads
            // the image natively.
            const image = icon.image;
            out.symbol = image.startsWith('image://') ? image : `image://${image}`;
            out.symbolKeepAspect = true;
          }
        }
        out.symbolSize = width === height ? width : [width, height];
        // Per-node `label.distance` override — see
        // `TREE_ICON_LABEL_DISTANCE_*` for calibration. Deep-merges into
        // `series.label` / `series.leaves.label` so it applies whether
        // the node is a parent or leaf and survives any other label
        // overrides. Only set on icon-bearing nodes; default-dot nodes
        // keep ECharts' built-in 5 px gap.
        const maxIconDim = Math.max(width, height);
        const labelDistance = Math.max(
          Math.round(maxIconDim * TREE_ICON_LABEL_DISTANCE_RATIO),
          TREE_ICON_LABEL_DISTANCE_FLOOR_PX,
        );
        out.label = { distance: labelDistance };
      }
    }
    // Per-node `color` wins over the palette lookup so per-row overrides
    // can pin a single node without affecting the rest of the tree.
    if (paletteColor && !usesAsyncIcon) out.itemStyle = { color: paletteColor };
    if (node.children && node.children.length > 0) {
      out.children = node.children.map((child) => visit(child, depth + 1));
    }
    return out;
  };
  return visit(root, 0);
}

function collectNodesWithIconMeta(
  root: Record<string, unknown>,
): Array<{ node: Record<string, unknown>; meta: IconMeta }> {
  const out: Array<{ node: Record<string, unknown>; meta: IconMeta }> = [];
  const stack: Record<string, unknown>[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    const rawMeta = node[TREE_ICON_META_KEY];
    if (typeof rawMeta === 'object' && rawMeta !== null) {
      const meta = rawMeta as IconMeta;
      if (
        (meta.shape === 'circle' || meta.shape === 'rect') &&
        typeof meta.src === 'string' &&
        typeof meta.width === 'number' &&
        typeof meta.height === 'number' &&
        typeof meta.borderColor === 'string' &&
        typeof meta.borderWidth === 'number'
      ) {
        out.push({ node, meta });
      }
    }
    const kids = node.children;
    if (Array.isArray(kids)) {
      for (const child of kids) {
        if (typeof child === 'object' && child !== null) {
          stack.push(child as Record<string, unknown>);
        }
      }
    }
  }
  return out;
}

/**
 * After the synchronous placeholder is rendered, asynchronously
 * upgrade each canvas-pipeline avatar (circles always, rects only
 * when the user requested a border) to a real image symbol. Two
 * upgrade paths, picked per-node based on what the browser allows:
 *
 *   1. **Canvas path (preferred)** — {@link renderIconDataUrl}
 *      pre-composites the image into a PNG with a baked-in shape clip
 *      (circle or rect), contain-fit, and optional border stroke,
 *      then we set `symbol: 'image://<dataUrl>'` and drop the
 *      placeholder `itemStyle`. Only works when the image host ships
 *      `Access-Control-Allow-Origin` — otherwise the canvas is
 *      CORS-tainted and `toDataURL` throws `SecurityError`.
 *
 *   2. **Native image fallback** — when the canvas path returns
 *      `undefined` (CORS-blocked or load failed), use ECharts'
 *      built-in `image://<original-url>` symbol instead. ECharts
 *      loads the image as a regular `<img>` (no CORS needed for
 *      display, only for pixel extraction), so the avatar shows up
 *      as a *square* image. When the user asked for a border, we
 *      paint a rectangular frame around the image via
 *      `itemStyle.borderColor` / `borderWidth`. Circles lose the
 *      circular clip in this fallback (the avatar reads as square)
 *      but stay visible — strictly better than the colored-shape
 *      placeholder users see when both paths fail.
 *
 *   3. **Placeholder retained** — when both async paths fail (image
 *      404, network error, etc.), the synchronous colored-shape
 *      placeholder stays as the last-resort visible marker.
 *
 * The two-tier strategy means *most* avatar hosts work out of the
 * box. Hosts like DiceBear, Gravatar, S3-with-CORS get the full
 * baked-in treatment; hosts like pravatar.cc (no CORS) gracefully
 * degrade to a square framed avatar; total failures stay readable.
 *
 * Why a flat image symbol (not a canvas pattern fill on a shape)?
 *   ECharts pattern fill is positioned in world coordinates, not
 *   shape-local, so the avatar would appear mis-aligned under a
 *   centered shape and gets clipped to whatever slice of the canvas
 *   overlaps the shape. The image-symbol path treats the
 *   pre-composited PNG as a flat sprite — exactly what we want.
 *
 * Returns `undefined` when no node has a canvas-pipeline icon (no
 * circles, no bordered rects), so the adapter can skip wiring an
 * `onInit` callback entirely (saves a `Promise.all` + `setOption`
 * round-trip on every render of every tree without avatars). The
 * async work is wrapped in an IIFE-style void promise so the
 * engine's `onInit?.(this.ecInstance)` call returns immediately; the
 * swap happens on the next frame after the canvas paints (or images
 * load).
 */
function createTreeIconOnInit(
  root: Record<string, unknown>,
): ((instance: { setOption: (option: Record<string, unknown>, notMerge?: boolean) => void }) => void) | undefined {
  const targets = collectNodesWithIconMeta(root);
  if (targets.length === 0) return undefined;

  return (instance) => {
    void (async () => {
      let changed = false;
      await Promise.all(
        targets.map(async ({ node, meta }) => {
          const dataUrl = await renderIconDataUrl({
            shape: meta.shape,
            src: meta.src,
            width: meta.width,
            height: meta.height,
            borderColor: meta.borderColor,
            borderWidth: meta.borderWidth,
          });
          if (dataUrl) {
            // Canvas path — full avatar with shape clip + contain-fit
            // (+ optional border) baked into the PNG. Drop the
            // placeholder `itemStyle` so ECharts doesn't double-paint
            // the colored fill / border underneath or on top of the
            // image symbol. `symbolKeepAspect` is defensive — the
            // canvas is square when `width === height`, but the flag
            // prevents subtle distortion when they diverge.
            node.symbol = `image://${dataUrl}`;
            node.symbolKeepAspect = true;
            delete (node as Record<string, unknown>).itemStyle;
            changed = true;
            return;
          }
          // Native image fallback — host doesn't ship CORS headers (or
          // image load failed but we'll let ECharts retry the load with
          // its own loader). ECharts draws the image as a rectangular
          // image symbol — for circles this means losing the circular
          // clip (a known degradation; users see a square avatar
          // instead of a colored dot, which is strictly better).
          //
          // When the user asked for a border (`borderWidth > 0`) we
          // paint a rectangular frame around the symbol via
          // `itemStyle`. ECharts honors `border*` on image symbols
          // here as a stroke around the bounding box. `color:
          // 'transparent'` ensures the placeholder fill doesn't tint
          // the loaded image. When no border was requested, we omit
          // the `itemStyle` entirely so ECharts renders just the raw
          // image — matching the "no border" intent end-to-end.
          node.symbol = meta.src.startsWith('image://')
            ? meta.src
            : `image://${meta.src}`;
          node.symbolKeepAspect = true;
          if (meta.borderWidth > 0) {
            node.itemStyle = {
              color: 'transparent',
              borderColor: meta.borderColor,
              borderWidth: meta.borderWidth,
            };
          } else {
            delete (node as Record<string, unknown>).itemStyle;
          }
          changed = true;
        }),
      );
      if (!changed) return;
      // Runtime payload — must go through `applyConfiguredFontFamilyToOption`
      // per AGENTS.md architecture rule #9 even though we touch no text
      // fields here. Future contributors swapping in label tweaks via
      // this same payload pipeline get the font-family guard for free.
      const payload: Record<string, unknown> = {
        series: [{ data: [root] }],
      };
      applyConfiguredFontFamilyToOption(payload, getConfig().fontFamily);
      try {
        instance.setOption(payload, false);
      } catch {
        // Chart may already be disposed (e.g. component unmounted
        // mid-fetch). Swallow rather than rethrow — there's no way
        // for the swap to retroactively succeed.
      }
    })();
  };
}

function createTreeLabelFormatter(
  fallbackByName: ReadonlyMap<string, string>,
): (params: unknown) => string {
  return (params: unknown): string => formatTreeLabel(params, fallbackByName);
}

function formatTreeLabel(
  params: unknown,
  fallbackByName: ReadonlyMap<string, string>,
): string {
  const pr = params as Record<string, unknown>;
  const data =
    (pr.data as Record<string, unknown> | undefined) ??
    (pr.value as Record<string, unknown> | undefined);
  const custom = data?.[TREE_LABEL_TOKEN_KEY];
  if (typeof custom === 'string') return custom;
  if (typeof pr.name === 'string') {
    return fallbackByName.get(pr.name) ?? pr.name;
  }
  return '';
}

/**
 * Default sync tooltip for tree nodes. Mirrors the pattern used by other
 * "single item" tooltips in the library (network, pie, …): show the
 * colored marker, the node name, and (when present) the formatted value.
 */
function treeTooltipSyncHtml(
  params: unknown,
  options: TreeChartOptions,
): string {
  const pr = params as Record<string, unknown>;
  const marker = (pr.marker as string) ?? '';
  const name = String(pr.name ?? '');
  const value = pr.value;
  if (value === undefined) return `${marker}${name}`;
  const fmt = options.tooltip?.formatValue;
  const display = fmt ? fmt(value as number, name) : value;
  return `${marker}${name}: ${display}`;
}

function resolveRoamMode(
  enablePan: boolean | undefined,
  enableZoom: boolean | undefined,
): boolean | 'move' | 'scale' {
  const pan = enablePan ?? true;
  const zoom = enableZoom ?? false;
  if (pan && zoom) return true;
  if (pan) return 'move';
  if (zoom) return 'scale';
  return false;
}

/**
 * Resolve a `TreeData` + `TreeChartOptions` pair into an ECharts option
 * object. Single-series chart — emits one `{ type: 'tree' }` series.
 *
 * Layout: body-centered chart (no XY grid). Reserves the title height
 * on `top` via {@link getTitleReserve} (same pattern as pie / gauge /
 * radar). Both the root-side and leaf-side edges receive a measured
 * label reserve (parents grow toward the root, leaves grow toward the
 * opposite edge — so both directions can clip). Vertical layouts
 * (`'TB'` / `'BT'`) rotate labels 90° so they read along the tree's
 * growth direction; the rotation swaps the geometry, putting full
 * label-width onto the active vertical axis and a thin font-height
 * strip onto the perpendicular horizontal axis.
 *
 * Colors: every node name flows through {@link resolveColors}, then
 * the per-node `itemStyle.color` is injected during the tree walk in
 * {@link annotateTree}. Tree data is hierarchical, not a flat array,
 * so `paintGraphNodes` (which only walks `series.data[]`) doesn't fit
 * — the tree walk handles color injection in one pass instead.
 */
export function resolveTreeOptions(
  data: TreeData,
  options: TreeChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const direction: TreeDirection = options.direction ?? 'LR';
  const layout = DIRECTION_LAYOUT[direction];
  const labelRotate = options.disableLabelRotate ? 0 : layout.labelRotate;

  const names = collectNodeNames(data);
  const colors = resolveColors(names, options);
  const nameToColor = new Map<string, string>(names.map((n, i) => [n, colors[i]]));

  // Layout reserves — body-centered, mirrors radar / pie / gauge.
  const p = options.padding ?? 12;
  const titleR = getTitleReserve(options).top;

  const showLabel = options.showNodeLabel ?? true;
  const hasCustomLabel = typeof options.formatNodeLabel === 'function';
  const parentAlign = hasCustomLabel ? 'center' : layout.parentAlign;
  const leafAlign = hasCustomLabel ? 'center' : layout.leafAlign;

  // Effective label fontSize for this chart instance — drives both the
  // canvas measureText calls below AND the `series.label.fontSize` /
  // `series.leaves.label.fontSize` emitted further down. Keeping them
  // in lockstep is the measure-vs-render contract: if `measure` uses
  // 12 px but ECharts renders at 18 px, the reserved label slot under-
  // estimates and the rightmost / leafmost names clip.
  const labelFontSize = getLabelFontSize(options);
  // Per-axis edge reserves so labels at the root edge AND the leaf edge
  // both stay inside the canvas. Two failure modes the previous (leaf-only)
  // version hit:
  //   1. LR/RL: the root's own label grows TOWARD the root edge (`position:
  //      'left'` for LR) and slips past the left inset whenever it's wider
  //      than `padding`.
  //   2. TB/BT: even with rotated -90° labels (which read vertically),
  //      the unrotated text-width becomes the vertical extent past the
  //      node — the root's parent label grows full-width upward into
  //      the top reserve, and leaf labels grow full-width downward
  //      into the bottom reserve.
  // Measure both groups separately because they receive different label
  // positions (parents on the root side, leaves on the opposite side) and
  // a tree often has very different name lengths between them.
  const { leafLabels, parentLabels } = splitNodeNames(data, options);
  const widestLeafPx = showLabel
    ? measureWidestCompiledLabel(leafLabels)
    : 0;
  const widestParentPx = showLabel
    ? measureWidestCompiledLabel(parentLabels)
    : 0;

  // Slot per edge, in the active layout's terms:
  //   `rootSlot` = label-driven reserve on whichever edge the ROOT grows
  //                toward (LR→left, RL→right, TB→top, BT→bottom).
  //   `leafSlot` = same, on the opposite edge.
  //   `perpSlot` = reserve on the OTHER axis. Horizontal layouts get
  //                zero (labels are vertically centered, ~half line-height
  //                ≈ negligible next to chart padding). Vertical layouts
  //                with rotated -90° labels still get a small reserve
  //                because the rotated text strip is one font-height
  //                wide; half a line-height + gap keeps the leftmost /
  //                rightmost nodes' labels from kissing the canvas edge.
  let rootSlot: number;
  let leafSlot: number;
  let perpSlot: number;
  if (layout.axis === 'horizontal') {
    // Labels extend the full label-width past each node along the X
    // axis; vertical extent is just half line-height (negligible).
    rootSlot = clampLabelReserve(widestParentPx);
    leafSlot = clampLabelReserve(widestLeafPx);
    perpSlot = 0;
  } else {
    // Vertical layout with rotated (`-90°`) labels — the rotation
    // swaps the geometry: the unrotated text-width becomes vertical
    // extent past the node, and the unrotated text-height becomes
    // horizontal extent. So:
    //   - Active axis (top/bottom) needs the SAME widest-name reserve
    //     as horizontal layouts use on their active axis.
    //   - Perpendicular axis (left/right) only needs ~half line-height
    //     since the rotated text is a thin vertical strip anchored at
    //     the node's x-position.
    rootSlot = clampLabelReserve(widestParentPx);
    leafSlot = clampLabelReserve(widestLeafPx);
    perpSlot = showLabel
      ? Math.ceil((labelFontSize * TREE_LABEL_LINE_HEIGHT_RATIO) / 2) +
        TREE_LABEL_GAP_PX
      : 0;
  }

  // Map slots onto absolute canvas edges. `top` additionally folds in the
  // title widget reserve when present — same pattern as pie / gauge / radar.
  const reserveFor = (edge: 'top' | 'bottom' | 'left' | 'right'): number => {
    if (edge === layout.rootEdge) return rootSlot;
    if (edge === layout.leafEdge) return leafSlot;
    return perpSlot;
  };

  const top = p + Math.max(reserveFor('top'), titleR);
  const bottom = p + reserveFor('bottom');
  const left = p + reserveFor('left');
  const right = p + reserveFor('right');

  const expandAndCollapse = options.expandAndCollapse ?? true;
  const mergedRich = mergeCompiledRichStyles([
    ...parentLabels.map((entry) => entry.compiled),
    ...leafLabels.map((entry) => entry.compiled),
  ]);
  const rich =
    hasCustomLabel && Object.keys(mergedRich).length > 0 ? mergedRich : undefined;
  const parentLabelTextByName = new Map(parentLabels.map((entry) => [entry.name, entry.compiled.text]));
  const leafLabelTextByName = new Map(leafLabels.map((entry) => [entry.name, entry.compiled.text]));
  const parentFormatter = createTreeLabelFormatter(parentLabelTextByName);
  const leafFormatter = createTreeLabelFormatter(leafLabelTextByName);

  const series: Record<string, unknown> = {
    type: 'tree',
    // ECharts expects an array of root nodes; we only ever ship one.
    data: [annotateTree(data, nameToColor, options)],
    orient: layout.orient,
    top,
    bottom,
    left,
    right,
    symbolSize: options.nodeSize ?? DEFAULT_NODE_SIZE,
    roam: resolveRoamMode(options.enablePan, options.enableZoom),
    expandAndCollapse,
    edgeShape: options.lineStyle ?? 'polyline',
    initialTreeDepth: options.initialTreeDepth ?? -1, // -1 = fully expanded
    label: {
      show: showLabel,
      position: layout.parentPosition,
      align: parentAlign,
      verticalAlign: 'middle',
      // `rotate` is `-90` for TB/BT (labels read top-to-bottom) and `0`
      // for LR/RL (horizontal text). Mirrors ECharts' own tree-vertical
      // / tree-orient-bottom-top reference examples.
      rotate: labelRotate,
      // Single source of truth for the rendered font size — resolved once
      // via `getLabelFontSize(options)`, then used for both parent/leaf
      // label styles while reserve math is driven by compiled label widths.
      // Diverging these values would re-introduce label clipping.
      fontSize: labelFontSize,
      // No `color` here on purpose — theme owns canvas text color.
      // See AGENTS.md "Layout rule #6" + `tree.label.color` entry in
      // `src/themes/echarts-theme.ts`.
      ...(hasCustomLabel ? { formatter: parentFormatter } : {}),
      ...(rich ? { rich } : {}),
    },
    leaves: {
      label: {
        position: layout.leafPosition,
        align: leafAlign,
        verticalAlign: 'middle',
        rotate: labelRotate,
        // Mirror parent label fontSize to keep label metrics consistent.
        fontSize: labelFontSize,
        ...(hasCustomLabel ? { formatter: leafFormatter } : {}),
        ...(rich ? { rich } : {}),
      },
    },
    emphasis: { focus: 'descendant' },
    animationDuration: 550,
    animationDurationUpdate: 750,
  };

  // Tree tooltips fire on hover (not click) so users can scan the tree
  // without committing to a click target — matches ECharts' own
  // `tree-basic` example and the network adapter's UX.
  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    triggerOn: 'mousemove',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  // Tree tooltip semantics:
  //   - `customHtml` owns the full tooltip body (name, avatar, …) — the
  //     built-in name row is skipped. Same convention as every other
  //     chart type post the unified `customHtml = replace` semantics.
  //   - `appendHtml` keeps the default name row and adds extras below it.
  //   - Both can compose: customHtml's body + appendHtml's extras below.
  // The shared helper wires this exactly.
  const treeFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync: (params) => treeTooltipSyncHtml(params, options),
    toContext: (params) => sankeyChordParamsToTooltipContext(params, nameToColor),
  });
  tooltip.formatter =
    treeFormatter ?? ((params: unknown) => treeTooltipSyncHtml(params, options));

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip,
    series: [series],
  };

  const merged = deepMerge(
    eOption,
    (options.echarts ?? {}) as Record<string, unknown>,
  );

  // Final color assembly — palette resolution wins over any user
  // `echarts.color` override, matching the convention every other
  // adapter follows (see AGENTS.md architecture rule #3).
  merged.color = colors;

  return merged;
}

export function resolveTreeSetup(
  data: TreeData,
  options: TreeChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const option = resolveTreeOptions(data, options, ctx);
  const root = ((option.series as Record<string, unknown>[] | undefined)?.[0]?.data as
    | Record<string, unknown>[]
    | undefined)?.[0];
  if (!root || typeof root !== 'object') return { option };
  const onInit = createTreeIconOnInit(root);
  return { option, onInit };
}
