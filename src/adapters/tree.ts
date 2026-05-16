import type {
  TreeData,
  TreeNode,
  TreeChartOptions,
  TreeDirection,
} from '../types.js';
import type { RenderContext } from './index.js';
import { createAsyncTooltipFormatter } from '../async-tooltip.js';
import { sankeyChordParamsToTooltipContext } from '../tooltip-context.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  buildTitle,
  getLabelFontSize,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common.js';
import { buildLabelFont, measureMaxTextWidth } from './text-measure.js';

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
 * `'horizontal'` layouts (LR, RL) — labels render horizontally,
 * extending OUTSIDE each node along the X axis. Parent labels grow
 * toward the root edge, leaf labels grow toward the opposite edge.
 * Both side edges therefore need a label-width reserve; vertical
 * clipping is just half line-height (negligible next to padding).
 *
 * `'vertical'` layouts (TB, BT) — labels are rotated 90° so they read
 * in the same direction the tree grows: TB rotates labels **clockwise**
 * (`-90`) so text reads top-to-bottom alongside a downward-growing
 * tree; BT rotates labels **counter-clockwise** (`+90`) so text reads
 * bottom-to-top alongside an upward-growing tree. Matches ECharts'
 * [`tree-vertical`](https://echarts.apache.org/examples/en/editor.html?c=tree-vertical)
 * example for TB; BT uses the opposite rotation sign so the text
 * direction follows the tree direction (rather than slavishly copying
 * the official example, which uses the same rotation for both).
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
  'left-to-right': {
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
  'right-to-left': {
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
  // TB: clockwise rotation (`-90`). Text reads top-to-bottom alongside
  // the tree. With `rotate: -90`, the unrotated text's RIGHT end lands
  // at the BOTTOM of the rendered glyph — so to anchor parent labels
  // above the node (and grow them UPWARD into the top reserve) we use
  // `align: 'right'`. Leaf labels mirror with `align: 'left'`.
  'top-to-bottom': {
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
  // BT: counter-clockwise rotation (`+90`) so text reads bottom-to-top,
  // matching the tree's upward growth direction. With `rotate: +90`
  // the unrotated text's RIGHT end lands at the TOP of the rendered
  // glyph — flipped vs. TB. To anchor parent labels BELOW the node
  // (and grow them DOWNWARD into the bottom reserve), we still need
  // the rotated bottom to sit on the anchor: that's `align: 'right'`
  // (whose unrotated right-end is now the rotated top), so the
  // unrotated left-end (rotated bottom) sits at the anchor and text
  // grows away from the node. Leaf labels mirror with `align: 'left'`.
  'bottom-to-top': {
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
  leafNames: string[];
  parentNames: string[];
}

function splitNodeNames(root: TreeNode): SplitNodeNames {
  const leafNames: string[] = [];
  const parentNames: string[] = [];
  const visit = (node: TreeNode): void => {
    if (node.children && node.children.length > 0) {
      parentNames.push(node.name);
      for (const child of node.children) visit(child);
    } else {
      leafNames.push(node.name);
    }
  };
  visit(root);
  return { leafNames, parentNames };
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
): Record<string, unknown> {
  const visit = (node: TreeNode): Record<string, unknown> => {
    const out: Record<string, unknown> = { name: node.name };
    if (node.value !== undefined) out.value = node.value;
    if (node.collapsed) out.collapsed = true;
    // Per-node `color` wins over the palette lookup so per-row overrides
    // can pin a single node without affecting the rest of the tree.
    const color = node.color ?? nameToColor.get(node.name);
    if (color) out.itemStyle = { color };
    if (node.children && node.children.length > 0) {
      out.children = node.children.map(visit);
    }
    return out;
  };
  return visit(root);
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

/**
 * Resolve a `TreeData` + `TreeChartOptions` pair into an ECharts option
 * object. Single-series chart — emits one `{ type: 'tree' }` series.
 *
 * Layout: body-centered chart (no XY grid). Reserves the title height
 * on `top` via {@link getTitleReserve} (same pattern as pie / gauge /
 * radar). Both the root-side and leaf-side edges receive a measured
 * label reserve (parents grow toward the root, leaves grow toward the
 * opposite edge — so both directions can clip). Vertical layouts
 * (`top-to-bottom` / `bottom-to-top`) rotate labels -90° so they read
 * top-to-bottom; the rotation swaps the geometry, putting full
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
  const direction: TreeDirection = options.direction ?? 'left-to-right';
  const layout = DIRECTION_LAYOUT[direction];

  const names = collectNodeNames(data);
  const colors = resolveColors(names, options);
  const nameToColor = new Map<string, string>(names.map((n, i) => [n, colors[i]]));

  // Layout reserves — body-centered, mirrors radar / pie / gauge.
  const p = options.padding ?? 12;
  const titleR = getTitleReserve(options).top;

  const showLabel = options.showNodeLabel ?? true;

  // Effective label fontSize for this chart instance — drives both the
  // canvas measureText calls below AND the `series.label.fontSize` /
  // `series.leaves.label.fontSize` emitted further down. Keeping them
  // in lockstep is the measure-vs-render contract: if `measure` uses
  // 12 px but ECharts renders at 18 px, the reserved label slot under-
  // estimates and the rightmost / leafmost names clip.
  const labelFontSize = getLabelFontSize(options);
  const labelFont = buildLabelFont(labelFontSize);

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
  const { leafNames, parentNames } = splitNodeNames(data);
  const widestLeafPx = showLabel
    ? measureMaxTextWidth(leafNames, labelFont)
    : 0;
  const widestParentPx = showLabel
    ? measureMaxTextWidth(parentNames, labelFont)
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

  const series: Record<string, unknown> = {
    type: 'tree',
    // ECharts expects an array of root nodes; we only ever ship one.
    data: [annotateTree(data, nameToColor)],
    orient: layout.orient,
    top,
    bottom,
    left,
    right,
    symbolSize: options.nodeSize ?? DEFAULT_NODE_SIZE,
    roam: options.roam ?? true,
    expandAndCollapse,
    initialTreeDepth: options.initialTreeDepth ?? -1, // -1 = fully expanded
    label: {
      show: showLabel,
      position: layout.parentPosition,
      align: layout.parentAlign,
      verticalAlign: 'middle',
      // `rotate` is `-90` for TB/BT (labels read top-to-bottom) and `0`
      // for LR/RL (horizontal text). Mirrors ECharts' own tree-vertical
      // / tree-orient-bottom-top reference examples.
      rotate: layout.labelRotate,
      // Single source of truth for the rendered font size — resolved
      // once at the top of this function via `getLabelFontSize(options)`
      // and threaded through both the canvas measureText calls (which
      // size the per-edge label reserves) AND `leaves.label.fontSize`
      // below. Diverging the two would silently re-introduce the
      // original label-clipping bug.
      fontSize: labelFontSize,
      // No `color` here on purpose — theme owns canvas text color.
      // See AGENTS.md "Layout rule #6" + `tree.label.color` entry in
      // `src/themes/echarts-theme.ts`.
    },
    leaves: {
      label: {
        position: layout.leafPosition,
        align: layout.leafAlign,
        verticalAlign: 'middle',
        rotate: layout.labelRotate,
        // Mirror parent label fontSize — both the parent and leaf
        // measurements above used `labelFont` (the same `buildLabelFont
        // (labelFontSize)` string), so the rendered size MUST match.
        fontSize: labelFontSize,
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
  if (options.tooltip?.customHtml) {
    const customHtml = options.tooltip.customHtml;
    tooltip.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => treeTooltipSyncHtml(params, options),
      customHtml: (params) =>
        Promise.resolve(customHtml(sankeyChordParamsToTooltipContext(params))),
      placeholder: options.tooltip.placeholder,
    });
  } else {
    tooltip.formatter = (params: unknown) => treeTooltipSyncHtml(params, options);
  }

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
