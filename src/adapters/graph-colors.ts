/**
 * Helpers for graph-shaped charts (sankey, chord, or any custom adapter that
 * builds a `series.data` array of named nodes).
 *
 * Coloring policy: this module never resolves colors on its own. Adapters
 * resolve colors via `resolveColorsForNodes()` from `../utils.js` and pass
 * the result here (or to `paintGraphNodes` after merging user `echarts`
 * overrides).
 */

/** Input node shared by sankey, chord, and any custom graph adapter. */
export interface GraphInputNode {
  name: string;
  color?: string;
  value?: number;
}

/**
 * Shape mapper: turn input nodes into ECharts `series.data` entries.
 * Pure: does not touch colors. Adapters call this for the skeleton, then
 * paint colors via {@link paintGraphNodes} after merging user `echarts`
 * overrides so the user can't accidentally clobber the resolved palette.
 */
export function mapGraphNodesForECharts<T extends GraphInputNode>(
  nodes: ReadonlyArray<T>,
  extra?: (node: T, index: number) => Record<string, unknown>,
): Record<string, unknown>[] {
  return nodes.map((node, index) => {
    const entry: Record<string, unknown> = { name: node.name };
    if (node.value !== undefined) entry.value = node.value;
    if (extra) Object.assign(entry, extra(node, index));
    return entry;
  });
}

/**
 * Write `itemStyle.color` onto each node of the given series type inside an
 * already-assembled ECharts option object. Mutates `option` in place.
 *
 * Skips entries that already have an explicit `itemStyle.color` so user
 * overrides supplied via `options.echarts.series[*].data[*].itemStyle.color`
 * always win.
 */
export function paintGraphNodes(
  option: Record<string, unknown>,
  seriesType: string,
  nameToColor: ReadonlyMap<string, string>,
): void {
  const series = option.series as Record<string, unknown>[] | undefined;
  if (!Array.isArray(series)) return;

  for (const s of series) {
    if (s.type !== seriesType) continue;
    const nodes = s.data as Record<string, unknown>[] | undefined;
    if (!Array.isArray(nodes)) continue;

    for (const node of nodes) {
      const name = node.name;
      if (typeof name !== 'string') continue;

      const existing = (node.itemStyle as Record<string, unknown> | undefined)
        ?.color;
      if (existing) continue;

      const color = nameToColor.get(name);
      if (color) {
        node.itemStyle = {
          ...(node.itemStyle as Record<string, unknown> | undefined),
          color,
        };
      }
    }
  }
}
