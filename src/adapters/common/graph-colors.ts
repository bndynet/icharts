export interface GraphInputNode {
  name: string;
  color?: string;
  value?: number;
}

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
