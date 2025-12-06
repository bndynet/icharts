import type { XYData, ChartOptions, SeriesOptions } from '../types.js';
import { deepMerge } from '../utils.js';
import {
  buildTitle,
  buildLegend,
  buildGrid,
  buildXAxis,
  buildYAxis,
  buildTooltip,
  isTimeCategories,
} from './common.js';

export function resolveLineOptions(
  data: XYData,
  options: ChartOptions,
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

  return deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
}

export function resolveAreaOptions(
  data: XYData,
  options: ChartOptions,
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

  return deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function getYAxisCount(data: XYData, options: ChartOptions): number {
  let count = 1;
  if (options.series) {
    for (const s of data.series) {
      const so = getSeriesOpts(s.name, options);
      if (so.yAxisIndex !== undefined && so.yAxisIndex + 1 > count) {
        count = so.yAxisIndex + 1;
      }
    }
  }
  return count;
}

function getSeriesOpts(name: string, options: ChartOptions): SeriesOptions {
  const wildcard = options.series?.['*'] ?? {};
  const named = options.series?.[name] ?? {};
  return { ...wildcard, ...named };
}

function buildLineSeries(
  data: XYData,
  options: ChartOptions,
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
        // Spark area: gradient fill is injected by applyColors (which knows the resolved color).
        // Non-spark area: flat semi-transparent fill as default.
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

function applyMarkLines(series: Record<string, unknown>, so: SeriesOptions): void {
  if (!so.markLines || so.markLines.length === 0) return;
  const markLineData = so.markLines.map((type) => ({
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
  }));
  series.markLine = { data: markLineData };
}

function applyMarkPoints(series: Record<string, unknown>, so: SeriesOptions): void {
  if (!so.markPoints || so.markPoints.length === 0) return;
  const markPointData = so.markPoints.map((type) => ({
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
  }));
  series.markPoint = { data: markPointData };
}
