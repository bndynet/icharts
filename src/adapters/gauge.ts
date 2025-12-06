import type { GaugeData, ChartOptions, GaugeVariant } from '../types.js';
import { deepMerge } from '../utils.js';
import { buildTitle } from './common.js';

export function resolveGaugeOptions(
  data: GaugeData,
  options: ChartOptions,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as GaugeVariant;

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip: { show: false },
    series: variant === 'percentage'
      ? buildPercentageSeries(data, options)
      : buildDefaultSeries(data, options),
  };

  return deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Default gauge
// ---------------------------------------------------------------------------

function buildDefaultSeries(
  data: GaugeData,
  options: ChartOptions,
): Record<string, unknown>[] {
  const max = data.max ?? 100;
  const width = options.gaugeWidth ?? 18;

  return [
    {
      type: 'gauge',
      min: 0,
      max,
      progress: { show: true, width },
      axisLine: { lineStyle: { width } },
      axisTick: { show: false },
      splitLine: { length: 12, lineStyle: { width: 2 } },
      // Labels sit comfortably beyond the 12 px tick marks
      axisLabel: {
        distance: 22,
        fontSize: 11,
      },
      pointer: { show: true },
      anchor: { show: true, size: 20, itemStyle: { borderWidth: 2 } },
      title: {
        show: !!data.label,
        // Raised from 70% → 60% to avoid crowding the 0/100 endpoint labels
        offsetCenter: [0, '60%'],
        fontSize: 16,
      },
      detail: {
        valueAnimation: true,
        fontSize: 28,
        // Raised from 40% → 32% to match the tighter title position
        offsetCenter: [0, '32%'],
        formatter: '{value}',
      },
      data: [{ value: data.value, name: data.label ?? '' }],
    },
  ];
}

// ---------------------------------------------------------------------------
// Percentage variant (simpler ring)
// ---------------------------------------------------------------------------

function buildPercentageSeries(
  data: GaugeData,
  options: ChartOptions,
): Record<string, unknown>[] {
  const max = data.max ?? 100;
  const percent = Math.round((data.value / max) * 100);

  return [
    {
      type: 'gauge',
      startAngle: 90,
      endAngle: -270,
      min: 0,
      max,
      pointer: { show: false },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        width: options.gaugeWidth ?? 20,
      },
      axisLine: {
        lineStyle: { width: options.gaugeWidth ?? 20 },
      },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      title: {
        show: !!data.label,
        offsetCenter: [0, '30%'],
        fontSize: 14,
      },
      detail: {
        fontSize: 36,
        fontWeight: 'bold',
        offsetCenter: [0, 0],
        valueAnimation: true,
        formatter: `${percent}%`,
      },
      data: [{ value: data.value, name: data.label ?? '' }],
    },
  ];
}
