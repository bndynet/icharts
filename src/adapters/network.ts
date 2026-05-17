import type {
  NetworkData,
  NetworkChartOptions,
  NetworkLink,
  NetworkNode,
  NetworkVariant,
} from '../types.js';
import type { RenderContext } from './index.js';
import { createAsyncTooltipFormatter } from '../async-tooltip.js';
import { sankeyChordParamsToTooltipContext } from '../tooltip-context.js';
import { deepMerge, resolveColors, resolveColorsForNodes } from '../utils.js';
import {
  buildLegend,
  buildTitle,
  getLabelFontSize,
  getLegendReserve,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common/index.js';
import { paintGraphNodes } from './common/graph-colors.js';
import { DEFAULT_LABEL_FONT, measureMaxTextWidth } from './common/text-measure.js';

const DEFAULT_NODE_SIZE = 10;
const DEFAULT_NODE_SIZE_RANGE: readonly [number, number] = [10, 30];
const DEFAULT_REPULSION = 100;
const DEFAULT_EDGE_LENGTH = 60;
const DEFAULT_GRAVITY = 0.1;

/**
 * Resolved node sizes strictly below this value get their label hidden
 * by default. Tuned to the `[10, 30]` `nodeSizeRange`: nodes whose
 * `value` lands in the bottom ~20 % of the data range scale into the
 * `< 14 px` bucket, which is the band where a label visually dominates
 * the marker and circular layouts read as label-soup. Users opt out
 * with `labelMinNodeSize: 0`, raise the threshold for more aggressive
 * pruning, or bypass entirely with `showAllLabels: true`. Has no effect
 * when `showNodeLabel: false` — that switch wipes labels globally.
 */
const DEFAULT_LABEL_MIN_NODE_SIZE = 14;

/**
 * Distance (px) between a circular-layout label's outer end and the body
 * box edge. Small breathing room so labels don't kiss title / legend /
 * canvas edges even after we've reserved their full text width.
 */
const NETWORK_CIRCULAR_LABEL_GAP_PX = 8;

/**
 * Hard cap (px) on circular-layout label overflow per body edge. Without
 * this, a single 50-char node name would shrink the ring to a dot. 200 px
 * ≈ 28 chars at the default 12 px sans-serif, which covers every
 * reasonable identifier; truly enormous names get clipped at the edge,
 * which is far less destructive than swallowing the chart body.
 */
const NETWORK_CIRCULAR_LABEL_MAX_RESERVE_PX = 200;

/**
 * Resolve the per-edge body inset (px) needed for circular-layout label
 * overflow. `circular` arranges nodes on a ring with `rotateLabel: true`,
 * so ECharts renders each label tangent to the ring and the text extends
 * *outward* radially past the ring radius. The worst-case overflow on
 * any edge is the widest label's pixel width — a node at 12 o'clock
 * pushes its label up by that much, a node at 3 o'clock pushes right,
 * etc. Reserve `widestLabel + gap` on every side and the ring shrinks
 * just enough that no label bleeds into title / legend / canvas edges,
 * regardless of which angle each node ends up at.
 *
 * Same body-overflow pattern as `radar.axisName` (which uses a fixed
 * `RADAR_EDGE_GAP = 24` because indicator names are usually 1–2 words);
 * network node names vary wildly in length so we measure the actual
 * data instead of picking a fixed reserve. Falls back to a char-count
 * estimate via {@link measureMaxTextWidth} when canvas isn't available
 * (jsdom without layout, SSR), so tests get deterministic values.
 *
 * Returns 0 when `showNodeLabel: false` (no labels render → no
 * overflow needed) or when there are no nodes. Force layout doesn't
 * call this — gravity keeps nodes well inside the body, so labels at
 * `position: 'right'` rarely reach the edge.
 */
function resolveCircularLabelOverflow(
  data: NetworkData,
  options: NetworkChartOptions,
): number {
  if (options.showNodeLabel === false) return 0;
  if (data.nodes.length === 0) return 0;
  const widest = measureMaxTextWidth(
    data.nodes.map((n) => n.name),
    DEFAULT_LABEL_FONT,
  );
  return Math.min(
    widest + NETWORK_CIRCULAR_LABEL_GAP_PX,
    NETWORK_CIRCULAR_LABEL_MAX_RESERVE_PX,
  );
}

/**
 * Build the layout / variant-specific block of the graph series.
 *
 * Public variant names live on the user-facing API; this helper translates
 * them to ECharts' own `layout` field:
 *   - `default` → `'force'`  (physics-based simulation, library convention
 *                              calls the baseline "default" rather than
 *                              parroting ECharts' implementation name)
 *   - `circular` → `'circular'` (1:1 with ECharts)
 *
 * Users who need ECharts' `layout: 'none'` (manual x/y on every node) can
 * still reach it through the `options.echarts.series[0].layout` escape
 * hatch — that path bypasses this helper entirely.
 */
function buildLayoutBlock(
  variant: NetworkVariant,
  options: NetworkChartOptions,
  autoEdgeLength: number | undefined,
): Record<string, unknown> {
  if (variant === 'circular') {
    return {
      layout: 'circular',
      circular: { rotateLabel: true },
    };
  }
  // 'default' → force layout. Priority for `edgeLength`:
  //   1. Explicit `options.edgeLength`            (user pin)
  //   2. Container-aware `autoEdgeLength`         (when ctx available)
  //   3. Static `DEFAULT_EDGE_LENGTH`             (SSR / jsdom fallback)
  return {
    layout: 'force',
    force: {
      repulsion: options.repulsion ?? DEFAULT_REPULSION,
      edgeLength: options.edgeLength ?? autoEdgeLength ?? DEFAULT_EDGE_LENGTH,
      gravity: options.gravity ?? DEFAULT_GRAVITY,
      // Friction defaults are fine; expose later if needed.
    },
  };
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
 * Linearly map `value` from [vmin, vmax] into [smin, smax]. When all values
 * are equal we return the midpoint of the symbol-size range so every node
 * stays visible without flattening into a tiny dot.
 */
function scaleSymbolSize(
  value: number,
  vmin: number,
  vmax: number,
  range: readonly [number, number],
): number {
  if (vmax === vmin) return (range[0] + range[1]) / 2;
  const t = (value - vmin) / (vmax - vmin);
  return range[0] + t * (range[1] - range[0]);
}

/** Derive an ordered category list from `data.categories` or the unique node categories. */
function deriveCategories(data: NetworkData): string[] {
  if (data.categories && data.categories.length > 0) return [...data.categories];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const node of data.nodes) {
    if (node.category !== undefined && !seen.has(node.category)) {
      seen.add(node.category);
      out.push(node.category);
    }
  }
  return out;
}

/**
 * Clamp bounds for the auto-sized fallback marker. 8 px keeps a node
 * recognisable on small cards / dense graphs; 40 px stops a sparse graph
 * in a huge container from drawing a few floating beach balls.
 */
const AUTO_NODE_SIZE_MIN_PX = 8;
const AUTO_NODE_SIZE_MAX_PX = 40;

/**
 * Resolve the fallback marker size (px) for nodes that have no explicit
 * `value` and no per-node `size`. Mirrors the gauge `percentage`
 * variant's container-aware sizing pattern (see `gauge.ts` `autoSize…`):
 *
 *   1. Explicit `options.nodeSize` always wins.
 *   2. With a usable container (px reported via `RenderContext`), derive
 *      `ref / sqrt(n) * 0.10` clamped to `[MIN, MAX]`. The √n factor
 *      models "linear pixels available per node along one axis", so
 *      sparser graphs render bigger markers and dense ones shrink to
 *      keep labels readable. The 0.10 multiplier was tuned against the
 *      built-in demos:
 *        - 5 nodes in a ≈460 px card → ~21 px (deliberate, sparse)
 *        - 28 nodes in a ≈560 px card → ~11 px (matches the legacy
 *          static default so dense graphs look unchanged)
 *   3. SSR / jsdom / hidden-card paths have no usable dims → fall back
 *      to the static `DEFAULT_NODE_SIZE` so snapshots stay stable.
 *
 * Only consulted in the no-value branch — graphs whose nodes carry
 * `value` continue to map through `nodeSizeRange` exactly as before.
 * `core.ts` re-applies on `resize()`, so a window resize re-flows the
 * node markers in lockstep with the chart body.
 */
function resolveDefaultNodeSize(
  data: NetworkData,
  options: NetworkChartOptions,
  ctx: RenderContext | undefined,
): number {
  if (options.nodeSize !== undefined) return options.nodeSize;

  const w = ctx?.containerWidth;
  const h = ctx?.containerHeight;
  if (
    w === undefined ||
    h === undefined ||
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w <= 0 ||
    h <= 0
  ) {
    return DEFAULT_NODE_SIZE;
  }

  const ref = Math.min(w, h);
  const n = Math.max(1, data.nodes.length);
  const computed = (ref / Math.sqrt(n)) * 0.10;
  return Math.max(
    AUTO_NODE_SIZE_MIN_PX,
    Math.min(AUTO_NODE_SIZE_MAX_PX, Math.round(computed)),
  );
}

/**
 * Clamp bounds for the auto-sized force-layout `edgeLength` (px).
 *   - 30 px: ECharts' own native default for `force.edgeLength`. Anything
 *     smaller would let the spring constraint overwhelm node markers and
 *     make labels collide regardless of `labelLayout`.
 *   - 250 px: prevents 2-node demos in a giant container from settling
 *     so far apart they fall off-screen — gravity does pull nodes back,
 *     but at very long springs the equilibrium drifts beyond the body.
 */
const AUTO_EDGE_LENGTH_MIN_PX = 30;
const AUTO_EDGE_LENGTH_MAX_PX = 250;

/**
 * Body-aware default for the force layout's `edgeLength` so the cluster
 * fills the area *outside* the title + legend reserves without the user
 * having to set anything. The previous version used raw container dims,
 * which over-counted on cards with a tall title or a side legend — the
 * cluster would happily extend into the reserved area.
 *
 * The body box passed in here is the same `containerW/H − reserves` math
 * the resolver uses for `series.top/bottom/left/right`, so the spring
 * calibration tracks whatever space ECharts has actually reserved for
 * the graph series. Title taller? Smaller `bodyHeight` → tighter springs.
 * Side legend? Smaller `bodyWidth` → tighter springs along that axis.
 *
 * Formula: `ref / sqrt(nodeCount) * 0.6`, where `ref = min(bodyW, bodyH)`.
 * Same "linear pixels available per node along one axis" heuristic as
 * `resolveDefaultNodeSize` (so markers and edge lengths scale in lockstep
 * when the body changes). The 0.6 multiplier is calibrated so the
 * canonical 16-node × ~480-px-tall demo with title + legend (body height
 * ≈ 394 px after subtracting ~80 px of reserves) lands exactly on the
 * legacy 60-px default — existing demos look pixel-identical, while
 * sparse graphs and chrome-less cards expand to fill the available body.
 *
 * Returns `undefined` when body dims aren't usable (SSR, jsdom, hidden
 * card, or `body ≤ 0` after huge reserves) so the caller can fall back
 * to the static `DEFAULT_EDGE_LENGTH` and keep snapshots stable. Explicit
 * `options.edgeLength` always wins. `core.ts` re-applies on `resize()`,
 * so a window resize re-flows the force simulation in lockstep with the
 * marker auto-sizing.
 */
function resolveAutoEdgeLength(
  nodeCount: number,
  bodyWidth: number | undefined,
  bodyHeight: number | undefined,
): number | undefined {
  if (
    bodyWidth === undefined ||
    bodyHeight === undefined ||
    !Number.isFinite(bodyWidth) ||
    !Number.isFinite(bodyHeight) ||
    bodyWidth <= 0 ||
    bodyHeight <= 0
  ) {
    return undefined;
  }

  const ref = Math.min(bodyWidth, bodyHeight);
  const n = Math.max(1, nodeCount);
  const computed = (ref / Math.sqrt(n)) * 0.6;
  return Math.max(
    AUTO_EDGE_LENGTH_MIN_PX,
    Math.min(AUTO_EDGE_LENGTH_MAX_PX, Math.round(computed)),
  );
}

function buildNodeData(
  data: NetworkData,
  options: NetworkChartOptions,
  catToIdx: ReadonlyMap<string, number>,
  defaultSize: number,
): Record<string, unknown>[] {
  const range = options.nodeSizeRange ?? DEFAULT_NODE_SIZE_RANGE;

  // Compute value range once for proportional node sizing.
  let vmin = Infinity;
  let vmax = -Infinity;
  for (const node of data.nodes) {
    if (typeof node.value === 'number' && Number.isFinite(node.value)) {
      if (node.value < vmin) vmin = node.value;
      if (node.value > vmax) vmax = node.value;
    }
  }
  const hasValueRange = vmin !== Infinity && vmax !== -Infinity;

  // Per-node label gating by resolved size. Three flags participate:
  //   - `showNodeLabel: false` → no labels at all; nothing to gate here.
  //   - `showAllLabels: true`  → user explicitly opted into "show every
  //                              label, accept overlap"; size threshold
  //                              must also stand down or the flag is a
  //                              no-op for circular (the exact reason
  //                              this helper exists).
  //   - `labelMinNodeSize: 0`  → user opted out of size-based hiding.
  // Otherwise nodes whose resolved size is strictly below the threshold
  // get a per-node `label: { show: false }`, which ECharts deep-merges
  // over the series-level `label.show: true` we set in the adapter —
  // single-node opt-out, no overlap math involved. The size we compare
  // against is the value we write into ECharts' `symbolSize` data field
  // (renamed `size` on the user-facing `NetworkNode`, but ECharts'
  // protocol still expects `symbolSize` on the series data entry).
  const minNodeSize = options.labelMinNodeSize ?? DEFAULT_LABEL_MIN_NODE_SIZE;
  const gateLabelBySize =
    options.showNodeLabel !== false &&
    !options.showAllLabels &&
    minNodeSize > 0;

  return data.nodes.map((node) => {
    const entry: Record<string, unknown> = { name: node.name };

    if (node.value !== undefined) entry.value = node.value;

    if (node.category !== undefined) {
      const idx = catToIdx.get(node.category);
      if (idx !== undefined) entry.category = idx;
    }

    // `entry.symbolSize` is the ECharts series-data field name (graph
    // protocol); the user-facing equivalent on `NetworkNode` is `size`.
    if (node.size !== undefined) {
      entry.symbolSize = node.size;
    } else if (typeof node.value === 'number' && hasValueRange) {
      entry.symbolSize = scaleSymbolSize(node.value, vmin, vmax, range);
    } else {
      entry.symbolSize = defaultSize;
    }

    if (node.x !== undefined) entry.x = node.x;
    if (node.y !== undefined) entry.y = node.y;
    if (node.fixed) entry.fixed = true;

    if (node.color) {
      entry.itemStyle = { color: node.color };
    }

    if (gateLabelBySize && (entry.symbolSize as number) < minNodeSize) {
      entry.label = { show: false };
    }

    return entry;
  });
}

function buildLinkData(links: NetworkLink[]): Record<string, unknown>[] {
  return links.map((l) => {
    const entry: Record<string, unknown> = { source: l.source, target: l.target };
    if (l.value !== undefined) entry.value = l.value;
    // Per-link curveness writes through `lineStyle.curveness` so it deep-merges
    // over the series-level `lineStyle.curveness` we set below from
    // `options.edgeCurveness`. Negative values bend the line the other way,
    // which is the canonical bidirectional-edge trick (A→B positive, B→A
    // negative ⇒ two arcs that don't overlap).
    if (l.curveness !== undefined) {
      entry.lineStyle = { curveness: l.curveness };
    }
    return entry;
  });
}

function networkTooltipSyncHtml(params: unknown, options: NetworkChartOptions): string {
  const fmt = options.tooltip?.formatValue;
  const pr = params as Record<string, unknown>;
  if (pr.dataType === 'edge') {
    const d = pr.data as Record<string, unknown>;
    const label = `${d.source} → ${d.target}`;
    const v = d.value;
    if (v === undefined) return label;
    const display = fmt ? fmt(v as number, label) : v;
    return `${label}: ${display}`;
  }
  // Node hover. ECharts injects a colored marker bullet via `params.marker`.
  const marker = (pr.marker as string) ?? '';
  const name = String(pr.name ?? '');
  const value = pr.value;
  if (value === undefined) return `${marker}${name}`;
  const display = fmt ? fmt(value as number, name) : value;
  return `${marker}${name}: ${display}`;
}

export function resolveNetworkOptions(
  data: NetworkData,
  options: NetworkChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as NetworkVariant;
  const categories = deriveCategories(data);
  const catToIdx = new Map(categories.map((c, i) => [c, i]));
  const hasCategories = categories.length > 0;

  // Network has its own legend default: show iff we have categories the user
  // can actually toggle. Single-category graphs (or none) hide the legend
  // because there's nothing meaningful to click.
  const showLegend = options.legend?.show ?? hasCategories;

  // Layout reserves — body-centered chart, mirrors radar / pie / gauge.
  const p = options.padding ?? 12;
  const titleR = getTitleReserve(options).top;
  // Pass `categories` so a side legend (left/right) sizes its slot to the
  // widest category label, just like radar does for series names.
  const legendR = getLegendReserve(options, showLegend, 0, categories);

  // Force layout (`default`) is dragged to refine node placement; the
  // circular layout is fixed by construction so dragging it is meaningless
  // by default. Users can still opt in via `options.draggable: true`.
  const draggable = options.draggable ?? variant === 'default';
  const roam = resolveRoamMode(options.enablePan, options.enableZoom);

  // `circular` arranges every node around the same ring, so straight edges
  // would all converge through the center and pile up into an unreadable
  // mess. ECharts' own circular-layout example uses curveness 0.3, which
  // separates the bands and reads cleanly. Force layout doesn't have that
  // problem (edges follow physics) so it stays at 0. Explicit
  // `edgeCurveness` always wins.
  const defaultCurveness = variant === 'circular' ? 0.3 : 0;
  const curveness = options.edgeCurveness ?? defaultCurveness;

  // Body-overflow allowance for circular-layout labels — see
  // `resolveCircularLabelOverflow` for the radial-extent rationale.
  // Composed *on top of* the title + legend reserves so the ring shrinks
  // regardless of whether title/legend are present.
  const labelOverflow =
    variant === 'circular' ? resolveCircularLabelOverflow(data, options) : 0;

  // Container-aware fallback for nodes without a `value` — see the helper.
  // Computed once at the resolver level so every node sees the same number.
  const defaultNodeSize = resolveDefaultNodeSize(data, options, ctx);

  // Body-box insets — single source of truth for both `series.top/…` (sets
  // the visible chart area) and `resolveAutoEdgeLength` (sizes the springs
  // to that same area). Keeping them in sync is what makes the "fill the
  // area outside title + legend" guarantee actually hold.
  const topInset = p + titleR + legendR.top + labelOverflow;
  const bottomInset = p + legendR.bottom + labelOverflow;
  const leftInset = p + legendR.left + labelOverflow;
  const rightInset = p + legendR.right + labelOverflow;

  // Body dims = container − insets. Undefined when ECharts hasn't given
  // us usable dims yet (SSR / hidden card) so the helper can fall back.
  const bodyWidth =
    ctx?.containerWidth !== undefined && Number.isFinite(ctx.containerWidth)
      ? ctx.containerWidth - leftInset - rightInset
      : undefined;
  const bodyHeight =
    ctx?.containerHeight !== undefined && Number.isFinite(ctx.containerHeight)
      ? ctx.containerHeight - topInset - bottomInset
      : undefined;

  // Body-aware fallback for the force layout's `edgeLength` so sparse
  // graphs fan out to fill the body, and dense graphs / chrome-heavy
  // cards (tall title, side legend) shrink the springs to fit. Returns
  // `undefined` for SSR / jsdom / `body ≤ 0` paths so the static default
  // kicks in. Only consulted by the force branch; circular ignores it.
  const autoEdgeLength = resolveAutoEdgeLength(data.nodes.length, bodyWidth, bodyHeight);

  // Global label fontSize — node labels and edge labels share the same
  // size (the previous 12/11 split was a token visual hint that didn't
  // survive `ChartOptions.labelFontSize` overrides cleanly; keeping them
  // identical makes user intent — "make all labels bigger" — predictable).
  const labelFontSize = getLabelFontSize(options);

  const series: Record<string, unknown> = {
    type: 'graph',
    ...buildLayoutBlock(variant, options, autoEdgeLength),
    top: topInset,
    bottom: bottomInset,
    left: leftInset,
    right: rightInset,
    roam,
    draggable,
    data: buildNodeData(data, options, catToIdx, defaultNodeSize),
    links: buildLinkData(data.links),
    categories: hasCategories ? categories.map((name) => ({ name })) : undefined,
    label: {
      show: options.showNodeLabel ?? true,
      position: 'right',
      fontSize: labelFontSize,
    },
    edgeLabel: options.showLinkLabel
      ? {
          show: true,
          fontSize: labelFontSize,
          formatter: (p2: { value?: unknown }) =>
            p2.value === undefined ? '' : String(p2.value),
        }
      : { show: false },
    lineStyle: {
      color: 'source',
      curveness,
      opacity: 0.6,
      width: 1,
    },
    emphasis: {
      focus: 'adjacency',
      lineStyle: { width: 2, opacity: 0.9 },
    },
  };

  // Default mode: let ECharts auto-hide overlapping node + edge labels so
  // dense graphs stay readable. ECharts walks every label's bounding box
  // and drops the ones that collide, keeping the most-spread-out subset
  // visible. Users opt into "show every label" by setting
  // `showAllLabels: true` — useful for small graphs or presentations
  // where every name matters and overlap is acceptable.
  if (!options.showAllLabels) {
    series.labelLayout = { hideOverlap: true };
  }

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  if (options.tooltip?.customHtml) {
    const customHtml = options.tooltip.customHtml;
    tooltip.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => networkTooltipSyncHtml(params, options),
      customHtml: (params) =>
        Promise.resolve(customHtml(sankeyChordParamsToTooltipContext(params))),
      placeholder: options.tooltip.placeholder,
    });
  } else {
    tooltip.formatter = (params: unknown) => networkTooltipSyncHtml(params, options);
  }

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: buildLegend(categories, {
      ...options,
      legend: { ...options.legend, show: showLegend },
    }),
    tooltip,
    series: [series],
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);

  // Color assembly: categories own the palette (so the legend swatch and
  // every member node share the same color). Per-node `color` overrides
  // are already on `itemStyle.color` from `buildNodeData`. Networks
  // without categories fall back to one color per node so the graph
  // doesn't render as a single-color blob.
  if (hasCategories) {
    merged.color = resolveColors(categories, options);
  } else {
    const nodeColors = resolveColorsForNodes(data.nodes, options);
    merged.color = nodeColors;
    paintGraphNodes(
      merged,
      'graph',
      new Map(data.nodes.map((n: NetworkNode, i) => [n.name, nodeColors[i]])),
    );
  }

  return merged;
}
