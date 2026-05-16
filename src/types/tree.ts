import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';

/**
 * Growth direction of the tree.
 *
 * - `'left-to-right'`  (default, ECharts `orient: 'LR'`) — root on the left,
 *   leaves expand to the right.
 * - `'right-to-left'`  (ECharts `'RL'`) — root on the right, leaves expand left.
 * - `'top-to-bottom'`  (ECharts `'TB'`) — root on top, leaves expand downward.
 * - `'bottom-to-top'`  (ECharts `'BT'`) — root on bottom, leaves expand upward.
 *
 * Internally the adapter translates these descriptive names into ECharts'
 * two-letter `orient` codes and flips the node-label position so labels
 * always point away from the tree body (parents toward the root edge,
 * leaves toward the opposite edge).
 */
export type TreeDirection =
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top';

/**
 * A single node in the tree. Minimal by design — the only required field
 * is `name`. Internal nodes carry `children`; leaves omit it. `value` is
 * optional metadata surfaced in tooltips (the tree adapter does not size
 * nodes by value).
 */
export interface TreeNode {
  /** Display name; also serves as the color-lookup key. */
  name: string;
  /** Optional numeric metadata. Shown in tooltips, not used for sizing. */
  value?: number;
  /** Child nodes. Omit (or pass an empty array) for a leaf. */
  children?: TreeNode[];
  /**
   * Per-node fixed color override. Wins over `colorMap` / `colors` /
   * theme palette resolution. Applied via `itemStyle.color` during the
   * tree walk so the override survives any `options.echarts` deep-merge.
   */
  color?: string;
  /**
   * When `true`, the sub-tree below this node renders collapsed; the user
   * can click to expand. Default: `false` (expanded). Combine with
   * `options.initialTreeDepth` for depth-based collapsing across the
   * whole tree.
   */
  collapsed?: boolean;
}

/**
 * The tree's root node. Tree data is just a single {@link TreeNode}.
 *
 * Example:
 * ```ts
 * const data: TreeData = {
 *   name: 'root',
 *   children: [
 *     { name: 'A', children: [{ name: 'A1' }, { name: 'A2' }] },
 *     { name: 'B', value: 42 },
 *   ],
 * };
 * ```
 */
export type TreeData = TreeNode;

/**
 * Structural type guard for tree data.
 *
 * The check is intentionally conservative: a single object with a string
 * `name` field is enough, but we also exclude shapes that belong to
 * other built-in chart types (gauge's `value`-only payload, sankey /
 * chord / network's `{nodes, links}`, XY's `{categories, series}`,
 * radar's `{indicators, series}`) so that mistakenly handing the wrong
 * data to `createChart(el, 'tree', ...)` fails fast instead of silently
 * rendering nothing.
 */
export function isTreeData(data: ChartData): data is TreeData {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  // Cast through `unknown` because `ChartData` is a discriminated union of
  // narrow shapes (none of which is an index-signature record) so the
  // direct `Record<string, unknown>` cast trips the TS structural check.
  const obj = data as unknown as Record<string, unknown>;
  if (typeof obj.name !== 'string') return false;
  // Reject other graph-shaped payloads that happen to carry a `name`.
  if ('nodes' in obj || 'links' in obj) return false;
  if ('categories' in obj || 'series' in obj) return false;
  if ('indicators' in obj) return false;
  return true;
}

/**
 * Tree-chart-specific options.
 *
 * Per the AGENTS.md convention, every chart-specific knob lives flat on
 * the subtype — no wrapping sub-object. Only `direction` is unique to
 * tree; the other fields are mild ECharts pass-throughs (`roam`,
 * `nodeSize`, …) named consistently with sibling adapters.
 */
export interface TreeChartOptions extends ChartOptions {
  /**
   * Tree growth direction. See {@link TreeDirection}. Default: `'left-to-right'`.
   */
  direction?: TreeDirection;
  /**
   * Initial expansion depth — the adapter starts with this many levels
   * visible and collapses everything below. `-1` (the default) expands
   * the whole tree. Use `2` for a typical "show root + one level"
   * starting state on large trees.
   */
  initialTreeDepth?: number;
  /** Allow mouse-wheel zoom and drag-to-pan on the chart. Default: `true`. */
  roam?: boolean;
  /** Show node-name labels. Default: `true`. */
  showNodeLabel?: boolean;
  /**
   * Diameter (px) of every node marker. Default: `7` — matches the
   * ECharts `tree-basic` example, which is calibrated so labels and
   * markers don't collide at the default 12 px font.
   */
  nodeSize?: number;
  /**
   * Click an internal node to collapse / expand its sub-tree. Default:
   * `true`. Set `false` to render a fully static tree (useful for
   * snapshot exports).
   */
  expandAndCollapse?: boolean;
}
