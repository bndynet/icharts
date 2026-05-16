import type { SankeyData, SankeyChartOptions, SankeyVariant } from '../types.js';
import type { RenderContext } from './index.js';
import { createAsyncTooltipFormatter } from '../async-tooltip.js';
import { sankeyChordParamsToTooltipContext } from '../tooltip-context.js';
import { deepMerge, resolveColorsForNodes } from '../utils.js';
import {
  buildTitle,
  getLabelFontSize,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common.js';
import { mapGraphNodesForECharts, paintGraphNodes } from './graph-colors.js';

function sankeyTooltipSyncHtml(params: unknown, options: SankeyChartOptions): string {
  const fmt = options.tooltip?.formatValue;
  const pr = params as Record<string, unknown>;
  if (pr.dataType === 'edge') {
    const data = pr.data as Record<string, unknown>;
    const label = `${data.source} → ${data.target}`;
    const v = fmt ? fmt(data.value as number, label) : data.value;
    return `${label}: ${v}`;
  }
  return `${params && typeof params === 'object' && 'name' in params ? (params as { name: string }).name : ''}`;
}

/** Nodes with no outgoing links (terminal / sink): labels go left so they stay inside the grid. */
function namesWithoutOutgoingLinks(links: SankeyData['links']): Set<string> {
  const withOutgoing = new Set<string>();
  for (const link of links) {
    withOutgoing.add(link.source);
  }
  return withOutgoing;
}

export function resolveSankeyOptions(
  data: SankeyData,
  options: SankeyChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as SankeyVariant;
  const orient = variant === 'vertical' ? 'vertical' : 'horizontal';
  const withOutgoing =
    orient === 'horizontal' ? namesWithoutOutgoingLinks(data.links) : null;

  const nodes = mapGraphNodesForECharts(data.nodes, (node) =>
    withOutgoing && !withOutgoing.has(node.name) ? { label: { position: 'left' } } : {},
  );

  const p = options.padding ?? 12;
  const titleOffset = getTitleReserve(options).top;
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
      fontSize: getLabelFontSize(options),
    },
    lineStyle: {
      color: 'gradient',
      curveness: 0.5,
    },
    nodeAlign: 'justify',
    nodeGap: 12,
    nodeWidth: 20,
  };

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  if (options.tooltip?.customHtml) {
    const customHtml = options.tooltip.customHtml;
    tooltip.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => sankeyTooltipSyncHtml(params, options),
      customHtml: (params) =>
        Promise.resolve(customHtml(sankeyChordParamsToTooltipContext(params))),
      placeholder: options.tooltip.placeholder,
    });
  } else {
    tooltip.formatter = (params: unknown) => sankeyTooltipSyncHtml(params, options);
  }

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip,
    series: [series],
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);

  const colors = resolveColorsForNodes(data.nodes, options);
  merged.color = colors;
  paintGraphNodes(
    merged,
    'sankey',
    new Map(data.nodes.map((n, i) => [n.name, colors[i]])),
  );

  return merged;
}
