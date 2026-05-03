import type { LineData, AreaData, LineChartOptions, AreaChartOptions } from '../types.js';
import { buildSparkAreaGradient, deepMerge, resolveColors } from '../utils.js';
import {
  buildTitle,
  buildLegend,
  buildGrid,
  buildXAxis,
  buildYAxis,
  buildTooltip,
  isTimeCategories,
} from './common.js';
import { getSeriesOpts, getYAxisCount, applyMarkLines, applyMarkPoints } from './series-utils.js';

export function resolveLineOptions(
  data: LineData,
  options: LineChartOptions,
): Record<string, unknown> {
  const isTime = isTimeCategories(data.categories);
  const seriesNames = data.series.map((s) => s.name);
  const variant = options.variant ?? 'default';
  const isSpark = variant === 'spark';

  const yAxisCount = getYAxisCount(data, options);

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: isSpark
      ? { show: false }
      : buildLegend(seriesNames, options),
    grid: isSpark ? { top: 0, right: 0, bottom: 0, left: 0, containLabel: false } : buildGrid(options),
    xAxis: isSpark
      ? [{ show: false, type: isTime ? 'time' : 'category', data: isTime ? undefined : data.categories, boundaryGap: false }]
      : buildXAxis(data, options, isTime),
    yAxis: isSpark
      ? [{ show: false, type: 'value' }]
      : buildYAxis(options, yAxisCount),
    tooltip: isSpark
      ? { show: true, trigger: 'axis', axisPointer: { type: 'none' } }
      : buildTooltip(options, 'axis', 'cross', isTime),
    series: buildLineSeries(data, options, isTime, false),
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  merged.color = resolveColors(seriesNames, options);
  return merged;
}

export function resolveAreaOptions(
  data: AreaData,
  options: AreaChartOptions,
): Record<string, unknown> {
  const isTime = isTimeCategories(data.categories);
  const seriesNames = data.series.map((s) => s.name);
  const variant = options.variant ?? 'default';
  const isSpark = variant === 'spark';

  const yAxisCount = getYAxisCount(data, options);

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: isSpark
      ? { show: false }
      : buildLegend(seriesNames, options),
    grid: isSpark ? { top: 0, right: 0, bottom: 0, left: 0, containLabel: false } : buildGrid(options),
    xAxis: isSpark
      ? [{ show: false, type: isTime ? 'time' : 'category', data: isTime ? undefined : data.categories, boundaryGap: false }]
      : buildXAxis(data, options, isTime),
    yAxis: isSpark
      ? [{ show: false, type: 'value' }]
      : buildYAxis(options, yAxisCount),
    tooltip: isSpark
      ? { show: true, trigger: 'axis', axisPointer: { type: 'none' } }
      : buildTooltip(options, 'axis', 'cross', isTime),
    series: buildLineSeries(data, options, isTime, true),
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  const colors = resolveColors(seriesNames, options);
  merged.color = colors;

  // Spark area fill is a per-series gradient derived from each series color;
  // the gradient lives on the series, so we apply it after merge to ensure
  // user-provided `echarts.series` (if any) still receives the fill.
  if (isSpark) {
    applySparkAreaGradient(merged, colors);
  }

  return merged;
}

function applySparkAreaGradient(
  option: Record<string, unknown>,
  colors: ReadonlyArray<string>,
): void {
  const series = option.series as Record<string, unknown>[] | undefined;
  if (!Array.isArray(series)) return;
  series.forEach((s, i) => {
    const hex = colors[i] ?? colors[0];
    if (hex) s.areaStyle = { color: buildSparkAreaGradient(hex) };
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function buildLineSeries(
  data: LineData,
  options: LineChartOptions | AreaChartOptions,
  isTime: boolean,
  isArea: boolean,
): Record<string, unknown>[] {
  const isSpark = options.variant === 'spark';

  return data.series.map((s) => {
    const so = getSeriesOpts(s.name, options);

    const seriesType = so.type ?? 'line';

    const series: Record<string, unknown> = {
      name: s.name,
      type: seriesType,
      data: isTime
        ? s.data.map((v, i) => [data.categories[i], v])
        : s.data,
    };

    if (seriesType === 'line') {
      if (isTime) {
        series.symbol = 'none';
      }
      if (isSpark) {
        series.symbolSize = 0;
      }

      if (isArea) {
        series.areaStyle = isSpark ? {} : { opacity: 0.8 };
      }
    }

    if (options.stacked) {
      series.stack = 'Total';
    }

    if (so.yAxisIndex !== undefined) series.yAxisIndex = so.yAxisIndex;

    if (seriesType === 'line') {
      if (so.smooth !== undefined) series.smooth = so.smooth;
      if (so.showPoints !== undefined) series.showSymbol = so.showPoints;

      if (so.lineWidth !== undefined) {
        series.lineStyle = { width: so.lineWidth };
      }
      if (so.lineStyle) {
        series.lineStyle = {
          ...(series.lineStyle as Record<string, unknown> ?? {}),
          type: so.lineStyle,
        };
      }
    }

    if (so.showLabel) {
      series.label = {
        show: true,
        position: so.labelPosition ?? 'top',
      };
    }

    applyMarkLines(series, so);
    applyMarkPoints(series, so);

    return series;
  });
}
