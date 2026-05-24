import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';

/**
 * A single treemap node. Internal nodes carry `children`; leaves omit it.
 *
 * - `value` is required on leaves (drives rectangle area). Internal nodes
 *   may omit it — ECharts sums the children's values automatically.
 * - `color` is an optional per-node fix; wins over `colorMap` / `colors`
 *   palette resolution.
 */
export interface TreemapDataItem {
  /** Display name; also serves as the color-lookup key. */
  name: string;
  /**
   * Rectangle area. Required on leaves. Omit on internal nodes to let
   * ECharts sum the descendant values automatically.
   */
  value?: number;
  /** Child nodes. Omit (or pass an empty array) for a leaf. */
  children?: TreemapDataItem[];
  /**
   * Per-node fixed color override. Wins over `colorMap` / `colors` /
   * theme palette resolution. Applied via `itemStyle.color` so the
   * override survives any `options.echarts` deep-merge.
   */
  color?: string;
}

/**
 * Treemap data — an array of one or more hierarchical roots.
 *
 * Matches ECharts' native `series.data` shape so the library remains a
 * thin wrapper over the underlying treemap series.
 *
 * Example:
 * ```ts
 * const data: TreemapData = [
 *   {
 *     name: 'flare',
 *     children: [
 *       { name: 'analytics', value: 120, children: [...] },
 *       { name: 'data',      value: 80 },
 *     ],
 *   },
 * ];
 * ```
 */
export type TreemapData = TreemapDataItem[];

/**
 * Structural type guard for treemap data.
 *
 * Treemap data shares the `[{ name, value }]` skeleton with `PieData` and
 * `WordCloudData`; the chart `type` string selects the right adapter at
 * runtime, so the guard's job is just to verify the array-of-named-items
 * shape (matching the pie/word-cloud guards).
 */
export function isTreemapData(data: ChartData): data is TreemapData {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'name' in data[0]
  );
}

/**
 * Treemap-chart-specific options.
 *
 * Deliberately minimal — the field set is the smallest one that maps a
 * pleasant default treemap onto the user's intent while leaving every
 * advanced ECharts knob reachable through `options.echarts` for
 * power users.
 */
export interface TreemapChartOptions extends ChartOptions {
  /**
   * Show the drill-down breadcrumb (the "you are here" trail rendered
   * at the bottom of the chart when the user zooms into a sub-tree).
   * Default: `true`.
   */
  showBreadcrumb?: boolean;
  /**
   * Show node labels (the text drawn inside each rectangle). Default:
   * `true`. When `false`, the chart renders as a pure heat-grid of
   * unlabelled rectangles.
   */
  showNodeLabel?: boolean;
  /**
   * Maximum visible depth at first paint. Deeper nodes start collapsed
   * and reveal when the user zooms / drills in. `undefined` (the default)
   * renders every level at once. Useful for very deep hierarchies — pass
   * `2` to start with "root + one level".
   */
  leafDepth?: number;
  /**
   * Enable click-to-drill-down (and zoom-to-node) navigation. Default:
   * `true`. Set `false` for a fully static treemap (useful for snapshot
   * exports or read-only dashboards).
   */
  drilldown?: boolean;
  /**
   * Enable wheel zoom + drag pan inside the active node. Default: `false`.
   * Note: drill-down (clicking a node) is governed by `drilldown`, not
   * this flag.
   */
  enableRoam?: boolean;
}
