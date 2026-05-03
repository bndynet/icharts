import type { PieData, PieChartOptions, PieVariant } from '../types.js';
import { createAsyncTooltipFormatter } from '../async-tooltip.js';
import {
  formatPieTooltipSyncHtml,
  pieParamsToTooltipContext,
} from '../tooltip-context.js';
import { deepMerge, resolveColors } from '../utils.js';
import { buildTitle, buildLegend, getTitleHeight } from './common.js';

const DEFAULT_OUTER_RADIUS = '75%';

export function resolvePieOptions(
  data: PieData,
  options: PieChartOptions,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as PieVariant;
  const names = data.map((d) => d.name);
  const showLegend = options.legend?.show ?? false;

  const sorted = options.autoSort !== false
    ? [...data].sort((a, b) => b.value - a.value)
    : data;

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
  };
  if (options.tooltip?.customHtml) {
    const customHtml = options.tooltip.customHtml;
    tooltip.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => formatPieTooltipSyncHtml(params, options),
      customHtml: (params) =>
        Promise.resolve(customHtml(pieParamsToTooltipContext(params))),
      placeholder: options.tooltip.placeholder,
    });
  }

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: buildLegend(names, { ...options, legend: { ...options.legend, show: showLegend } }),
    tooltip,
    series: buildPieSeries(sorted, options, variant),
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  merged.color = resolveColors(names, options);
  return merged;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function buildPieSeries(
  data: PieData,
  options: PieChartOptions,
  variant: PieVariant,
): Record<string, unknown>[] {
  const innerRadius = options.innerRadius ?? 0;
  const outerRadius = options.outerRadius ?? DEFAULT_OUTER_RADIUS;
  const p = options.padding ?? 12;
  const titleOffset = getTitleHeight(options);

  const series: Record<string, unknown> = {
    type: 'pie',
    radius: [innerRadius, outerRadius],
    avoidLabelOverlap: true,
    data: data.map((d) => ({ name: d.name, value: d.value })),
    label: {
      show: true,
      position: 'outside',
      formatter: '{b}: {d}%',
    },
    ...(titleOffset > 0 ? { top: p + titleOffset } : {}),
  };

  applySliceStyle(series, options);
  applyVariant(series, variant, options);

  return [series];
}

function applySliceStyle(series: Record<string, unknown>, options: PieChartOptions): void {
  if (options.sliceGap !== undefined) {
    series.padAngle = options.sliceGap;
  }

  const itemStyle: Record<string, unknown> = {};
  if (options.sliceBorderRadius !== undefined) itemStyle.borderRadius = options.sliceBorderRadius;
  if (options.sliceBorderColor !== undefined) itemStyle.borderColor = options.sliceBorderColor;
  if (Object.keys(itemStyle).length > 0) {
    series.itemStyle = itemStyle;
  }
}

function applyVariant(
  series: Record<string, unknown>,
  variant: PieVariant,
  options: PieChartOptions,
): void {
  const radius = series.radius as [string | number, string | number];

  switch (variant) {
    case 'doughnut':
      radius[0] = options.innerRadius ?? '50%';
      break;

    case 'half-doughnut':
      series.startAngle = 180;
      series.endAngle = 360;
      series.center = ['50%', '80%'];
      radius[0] = options.innerRadius ?? '100%';
      if (!options.outerRadius) {
        radius[1] = '130%';
      }
      break;

    case 'nightingale':
      (series as Record<string, unknown>).roseType = 'radius';
      radius[0] = options.innerRadius ?? 20;
      break;
  }
}
