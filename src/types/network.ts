import type { ChartOptions } from './base.js';
import type { LegendOptions } from './shared.js';
import type { ChartData } from './instance.js';

/**
 * Layout strategies for the network chart.
 *
 * - `default`: physics-based force-directed layout. Nodes repel each other
 *   while edges pull them together; the simulator runs until it stabilises.
 *   Good for "show me the structure" of an unknown graph. Internally this
 *   maps to ECharts' `graph.layout: 'force'`. When nodes carry `x` / `y`
 *   they are used as initial positions; combine with `fixed: true` to lock
 *   specific nodes in place.
 * - `circular`: nodes are placed evenly around a circle in input order.
 *   Predictable layout for chord-style adjacency without needing per-node
 *   coordinates. Maps to ECharts' `graph.layout: 'circular'`.
 *
 * Need fully manual node positions (no algorithm at all)? Drop down to
 * the `echarts` escape hatch: `options.echarts = { series: [{ layout: 'none' }] }`
 * and provide `x` / `y` on every node.
 */
export type NetworkVariant = 'default' | 'circular';

export interface NetworkNode {
  name: string;
  /**
   * Optional category name. Categories drive the legend and the default
   * per-node color (every node in the same category gets the same palette
   * slot). Unknown category names — names not present in `data.categories`
   * (or, when omitted, not seen elsewhere in `nodes`) — are dropped.
   */
  category?: string;
  /**
   * Numeric value associated with the node. When `size` is omitted the
   * adapter scales the rendered marker size from the value range.
   */
  value?: number;
  /**
   * Per-node fixed color override. Wins over the category palette and any
   * `colorMap` / `colors` resolution.
   */
  color?: string;
  /**
   * Per-node marker size override (px). When omitted the adapter derives a
   * size from `value` (scaled into {@link NetworkChartOptions.nodeSizeRange})
   * and falls back to {@link NetworkChartOptions.nodeSize} for nodes
   * without a value.
   */
  size?: number;
  /**
   * Optional initial layout coordinate (px on the chart canvas). Used as the
   * starting position by the `default` (force) layout; ignored by `circular`
   * which derives positions from input order.
   */
  x?: number;
  y?: number;
  /**
   * When true, keep the node at `x` / `y` during the force simulation
   * (i.e. it acts as an anchor while other nodes settle around it).
   * Ignored by `circular`.
   */
  fixed?: boolean;
}

export interface NetworkLink {
  source: string;
  target: string;
  /** Optional weight. Surfaced in tooltips; force layout ignores it today. */
  value?: number;
  /**
   * Per-link curveness override. Same scale as chart-wide
   * {@link NetworkChartOptions.edgeCurveness} (`0` = straight, `0.3` ≈
   * gently curved). Negative values bend the line the *other* way, which
   * is the canonical fix for **bidirectional edges**: give `A → B` a
   * positive curveness and `B → A` an equal negative one so the two
   * arcs don't overlap.
   *
   * Wins over the chart-level default (and over any explicit
   * `options.edgeCurveness`). Omit to inherit the chart-wide value.
   */
  curveness?: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
  /**
   * Explicit category list — drives legend ordering. When omitted, derived
   * from unique `node.category` values in input order.
   */
  categories?: string[];
}

/**
 * NetworkData shares the `{ nodes, links }` runtime shape with SankeyData and
 * ChordData. The chart `type` string — not the data shape — selects the
 * adapter; this guard validates the structural contract for NetworkData.
 */
export function isNetworkData(data: ChartData): data is NetworkData {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'nodes' in data &&
    'links' in data &&
    Array.isArray((data as NetworkData).nodes) &&
    Array.isArray((data as NetworkData).links)
  );
}

export interface NetworkChartOptions extends ChartOptions {
  variant?: NetworkVariant;
  /** Enable wheel zoom. Default: `false`. */
  enableZoom?: boolean;
  /** Enable drag-to-pan. Default: `true`. */
  enablePan?: boolean;
  /** Allow dragging individual nodes. Default: true for `default` (force), false for `circular`. */
  draggable?: boolean;
  /** Show node name labels. Default: true. */
  showNodeLabel?: boolean;
  /** Show edge labels (rendered from `link.value`). Default: false. */
  showLinkLabel?: boolean;
  /**
   * Force every node + edge label to render, bypassing **all** of the
   * adapter's label-pruning strategies in one shot:
   *   1. `labelLayout: { hideOverlap: true }` (the default overlap
   *      culling that keeps dense force layouts readable).
   *   2. The {@link labelMinNodeSize} size threshold that hides labels
   *      on small markers.
   *
   * Default `false` keeps both strategies active — labels at the edges
   * of a cluster show, the ones inside / on tiny nodes collapse first.
   * This trades completeness for legibility and is usually the right
   * answer.
   *
   * Set `true` when every node name matters (small graphs, screenshots,
   * presentations) and you'd rather accept overlap than hide a name.
   *
   * Has no effect when {@link showNodeLabel} is `false` (no labels to show).
   */
  showAllLabels?: boolean;
  /**
   * Resolved marker size (px) strictly below this value hides that
   * single node's label. Lets you scale nodes by `value` without the
   * smallest dots drowning under their own captions — a common
   * complaint on circular layouts where `labelLayout: { hideOverlap }`
   * does nothing (radial labels rarely physically overlap).
   *
   * Default: `14`. Tuned for the default {@link nodeSizeRange} of
   * `[10, 30]`: nodes whose `value` lands in the bottom ~20 % of the
   * range scale into the `< 14 px` bucket and lose their label, while
   * mid- and large-value nodes keep theirs. Set `0` to disable the
   * threshold entirely (pre-v6.2 behavior). Raise (e.g. `18`) for more
   * aggressive pruning.
   *
   * Compared against the **resolved** per-node size — whichever path
   * produced it: explicit `node.size`, value-scaled into
   * {@link nodeSizeRange}, or the container-aware no-value fallback.
   *
   * Interaction with the other label flags:
   *   - {@link showNodeLabel} `false` wins → no labels render; threshold
   *     becomes meaningless.
   *   - {@link showAllLabels} `true` wins → threshold is skipped along
   *     with overlap culling; every label renders.
   */
  labelMinNodeSize?: number;
  /**
   * Fallback marker size (px) for nodes that have no `value` and no
   * per-node `size`. When omitted the adapter auto-sizes from the
   * rendered container — `min(width, height) / sqrt(nodeCount) * 0.10`,
   * clamped to `[8, 40]` — so sparse graphs in big cards get noticeable
   * markers and dense graphs shrink markers automatically. SSR / hidden
   * containers (no usable dims) fall back to 10 px. Pass an explicit
   * number to disable auto-sizing.
   */
  nodeSize?: number;
  /**
   * Min / max marker size (px) used when scaling nodes by `value`.
   * Default: `[10, 30]`.
   */
  nodeSizeRange?: [number, number];
  /** Force-layout repulsion strength. Default: 100. */
  repulsion?: number;
  /**
   * Force-layout edge length (px) — the spring's "rest length" between
   * connected nodes. When omitted the adapter auto-sizes from the
   * **body** (the area outside the title, legend, and padding reserves):
   * `min(bodyWidth, bodyHeight) / sqrt(nodeCount) * 0.6`, clamped to
   * `[30, 250]`. This means the cluster fills the available body
   * automatically: a tall title or a side legend that shrinks the body
   * also shrinks the springs, so the layout stays inside the reserved
   * area instead of bleeding into the title bar. The 0.6 multiplier is
   * calibrated so a 16-node graph with a body of ~400 px (the canonical
   * forceData demo body, after subtracting title + 5-cat top legend +
   * padding) lands exactly on 60 px — the pre-auto-sizing static
   * default — so existing demos render unchanged. SSR / hidden
   * containers (no usable dims) fall back to 60 px. Pass an explicit
   * number to disable auto-sizing. Only consulted when
   * `variant === 'default'`.
   */
  edgeLength?: number;
  /** Force-layout gravity (pull toward center). Default: 0.1. */
  gravity?: number;
  /**
   * Edge curveness (0 = straight, 0.3 = gently curved).
   *
   * Default depends on the variant:
   *   - `default` (force) → `0` — physics already separates edges nicely.
   *   - `circular` → `0.3` — straight edges through a circular layout
   *     converge at the center and become unreadable; matches ECharts'
   *     own circular-layout example.
   *
   * Pass an explicit value to override either default.
   */
  edgeCurveness?: number;
  /**
   * Network renders a category legend (one entry per category). Lives on
   * this subtype — base {@link ChartOptions} stays legend-free.
   */
  legend?: LegendOptions;
}
