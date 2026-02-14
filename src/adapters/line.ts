import type { XYData, ChartOptions } from '../types.js';
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
import { getSeriesOpts, getYAxisCount, applyMarkLines, applyMarkPoints } from './series-utils.js';

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
