import type { PieData, ChartOptions, PieVariant } from '../types.js';
import { deepMerge } from '../utils.js';
import { buildTitle, buildLegend } from './common.js';

const DEFAULT_OUTER_RADIUS = '75%';

export function resolvePieOptions(
  data: PieData,
  options: ChartOptions,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as PieVariant;
  const names = data.map((d) => d.name);
  const showLegend = options.legend?.show ?? false;

  const sorted = options.autoSort !== false
    ? [...data].sort((a, b) => b.value - a.value)
    : data;

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: buildLegend(names, { ...options, legend: { ...options.legend, show: showLegend } }),
    tooltip: {
      trigger: 'item',
      confine: true,
    },
    series: buildPieSeries(sorted, options, variant),
  };

  return deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function buildPieSeries(
  data: PieData,
  options: ChartOptions,
  variant: PieVariant,
): Record<string, unknown>[] {
  const innerRadius = options.innerRadius ?? 0;
  const outerRadius = options.outerRadius ?? DEFAULT_OUTER_RADIUS;

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
  };

  applySliceStyle(series, options);
  applyVariant(series, variant, options);

  return [series];
}

function applySliceStyle(series: Record<string, unknown>, options: ChartOptions): void {
  const slice = options.slice;
  if (!slice) return;

  if (slice.gap !== undefined) {
    series.padAngle = slice.gap;
  }

  const itemStyle: Record<string, unknown> = {};
  if (slice.borderRadius !== undefined) itemStyle.borderRadius = slice.borderRadius;
  if (slice.borderColor !== undefined) itemStyle.borderColor = slice.borderColor;
  if (Object.keys(itemStyle).length > 0) {
    series.itemStyle = itemStyle;
  }
}

function applyVariant(
  series: Record<string, unknown>,
  variant: PieVariant,
  options: ChartOptions,
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
