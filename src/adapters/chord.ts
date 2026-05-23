import type { ChordData, ChordChartOptions } from '../types.js';
import type { ChartSetupResult, RenderContext } from './index.js';
import { sankeyChordParamsToTooltipContext } from '../tooltip-context.js';
import { deepMerge, resolveColorsForNodes } from '../utils.js';
import {
  buildTitle,
  buildAsyncTooltipFormatter,
  getLabelFontSize,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common/index.js';
import { mapGraphNodesForECharts, paintGraphNodes } from './common/graph-colors.js';

function chordTooltipSyncHtml(params: unknown, options: ChordChartOptions): string {
  const fmt = options.tooltip?.formatValue;
  const pr = params as Record<string, unknown>;
  if (pr.dataType === 'edge') {
    const d = pr.data as Record<string, unknown>;
    const label = `${d.source} → ${d.target}`;
    const v = fmt ? fmt(d.value as number, label) : d.value;
    return `${label}: ${v}`;
  }
  return `${pr.name}`;
}

/**
 * Build an ECharts option using the native chord series introduced in v6.
 * Replaces the previous custom renderItem implementation (~400 lines) with
 * a thin mapping layer that delegates all layout and interactivity to ECharts.
 */
export function resolveChordOptions(
  data: ChordData,
  options: ChordChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const p = options.padding ?? 12;

  const nodes = mapGraphNodesForECharts(data.nodes);

  // Resolve the palette up front — `nameToColor` is consumed by both the
  // tooltip context (so `customHtml`/`appendHtml` can surface node and
  // edge endpoint colors) and `paintGraphNodes` at the end of the
  // function. Computing it once here keeps the two consumers in lockstep.
  const colors = resolveColorsForNodes(data.nodes, options);
  const nameToColor = new Map(data.nodes.map((n, i) => [n.name, colors[i]]));

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
      fontSize: getLabelFontSize(options),
    },
    emphasis: {
      focus: 'adjacency',
      lineStyle: { opacity: 0.7 },
    },
  };

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  const chordFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync: (params) => chordTooltipSyncHtml(params, options),
    toContext: (params) => sankeyChordParamsToTooltipContext(params, nameToColor),
  });
  tooltip.formatter =
    chordFormatter ?? ((params: unknown) => chordTooltipSyncHtml(params, options));

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip,
    series: [series],
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);

  merged.color = colors;
  paintGraphNodes(merged, 'chord', nameToColor);

  return { option: merged };
}
