import type { SankeyData, ChartOptions, SankeyVariant } from '../types.js';
import { deepMerge } from '../utils.js';
import { buildTitle, getTitleHeight } from './common.js';

export function resolveSankeyOptions(
  data: SankeyData,
  options: ChartOptions,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as SankeyVariant;
  const orient = variant === 'vertical' ? 'vertical' : 'horizontal';

  const nodes = data.nodes.map((node) => {
    const n: Record<string, unknown> = { name: node.name };
    const color = node.color ?? options.colorMap?.[node.name];
    if (color) {
      n.itemStyle = { color };
    }
    return n;
  });

  const p = options.padding ?? 12;
  const titleOffset = getTitleHeight(options);
  const top = p + titleOffset;

  const series: Record<string, unknown> = {
    type: 'sankey',
    orient,
    layout: 'none',
    emphasis: { focus: 'adjacency' },
    data: nodes,
    links: data.links,
    top,
    bottom: p,
    left: p,
    right: p,
    label: {
      position: orient === 'vertical' ? 'inside' : 'right',
      fontSize: 12,
    },
    lineStyle: {
      color: 'gradient',
      curveness: 0.5,
    },
    nodeAlign: 'justify',
    nodeGap: 12,
    nodeWidth: 20,
  };

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: Record<string, unknown>) => {
        if (params['dataType'] === 'edge') {
          const data = params['data'] as Record<string, unknown>;
          return `${data['source']} → ${data['target']}: <strong>${data['value']}</strong>`;
        }
        return `${params['name']}`;
      },
    },
    series: [series],
  };

  return deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
}
