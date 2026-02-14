import type { ChordData, ChartOptions } from '../types.js';
import type { ChartSetupResult } from './index.js';
import { deepMerge } from '../utils.js';
import { buildTitle } from './common.js';

/**
 * Build an ECharts option using the native chord series introduced in v6.
 * Replaces the previous custom renderItem implementation (~400 lines) with
 * a thin mapping layer that delegates all layout and interactivity to ECharts.
 */
export function resolveChordOptions(
  data: ChordData,
  options: ChartOptions,
): ChartSetupResult {
  const p = options.padding ?? 12;

  const nodes = data.nodes.map((n) => {
    const node: Record<string, unknown> = { name: n.name };
    if (n.value !== undefined) node.value = n.value;

    const color = n.color ?? options.colorMap?.[n.name];
    if (color) {
      node.itemStyle = { color };
    }
    return node;
  });

  const fmt = options.tooltip?.formatValue;

  const series: Record<string, unknown> = {
    type: 'chord',
    // Use left/right/bottom padding only; omitting `top` keeps the chord
    // centred in the full container (center_y ≈ 50% of height).  The title
    // naturally sits above without pushing the diagram down, giving a ~35 px
    // gap regardless of container height — no magic formula required.
    left: p,
    right: p,
    bottom: p,
    radius: ['62%', '72%'],
    startAngle: 90,
    padAngle: 2,
    data: nodes,
    edges: data.links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    })),
    lineStyle: {
      color: 'gradient', // or 'source' (default), 'target',
      opacity: 0.45,
    },
    label: {
      show: true,
      position: 'outside',
      distance: 8,
      fontSize: 12,
    },
    emphasis: {
      focus: 'adjacency',
      lineStyle: { opacity: 0.7 },
    },
  };

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip: {
      trigger: 'item',
      confine: true,
      show: options.tooltip?.enabled !== false,
      formatter: (params: Record<string, unknown>) => {
        if (params['dataType'] === 'edge') {
          const d = params['data'] as Record<string, unknown>;
          const label = `${d['source']} → ${d['target']}`;
          const v = fmt ? fmt(d['value'] as number, label) : d['value'];
          return `${label}: <strong>${v}</strong>`;
        }
        return `${params['name']}`;
      },
    },
    series: [series],
  };

  return {
    option: deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>),
  };
}
