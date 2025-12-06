import type { XYData, ChartOptions, SeriesOptions } from '../types.js';
import { deepMerge } from '../utils.js';
import {
  buildTitle,
  buildLegend,
  buildGrid,
  buildXAxis,
  buildTooltip,
  isTimeCategories,
} from './common.js';

export function resolveBarOptions(
  data: XYData,
  options: ChartOptions,
): Record<string, unknown> {
  const isTime = isTimeCategories(data.categories);
  const seriesNames = data.series.map((s) => s.name);
  const variant = options.variant ?? 'default';
  const isSpark = variant === 'spark';
  const isHorizontal = variant === 'horizontal';

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: isSpark ? { show: false } : buildLegend(seriesNames, options),
    grid: isSpark
      ? { top: 0, right: 0, bottom: 0, left: 0, containLabel: false }
      : buildGrid(options),
    tooltip: isSpark
      ? { show: true, trigger: 'axis', axisPointer: { type: 'none' } }
      : buildTooltip(options, 'axis', 'shadow', isTime),
  };

  const categoryAxis: Record<string, unknown> = {
    type: 'category',
    data: isHorizontal
      ? [...data.categories].reverse()
      : data.categories,
    boundaryGap: true,
    splitLine: { show: false },
    splitArea: { show: false },
  };

  const valueAxis: Record<string, unknown> = {
    type: 'value',
    splitArea: { show: false },
  };

  if (isSpark) {
    eOption.xAxis = [{ show: false, ...categoryAxis }];
    eOption.yAxis = [{ show: false, ...valueAxis }];
  } else if (isHorizontal) {
    eOption.yAxis = [categoryAxis];
    eOption.xAxis = [valueAxis];
  } else {
    eOption.xAxis = isTime
      ? buildXAxis(data, options, true)
      : [categoryAxis];
    eOption.yAxis = [valueAxis];
  }

  const series = buildBarSeries(data, options, isTime, isHorizontal);
  eOption.series = series;

  return deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function getSeriesOpts(name: string, options: ChartOptions): SeriesOptions {
  const wildcard = options.series?.['*'] ?? {};
  const named = options.series?.[name] ?? {};
  return { ...wildcard, ...named };
}

function buildBarSeries(
  data: XYData,
  options: ChartOptions,
  isTime: boolean,
  isHorizontal: boolean,
): Record<string, unknown>[] {
  const variant = options.variant ?? 'default';
  const isSpark = variant === 'spark';

  const rawSeries = data.series.map((s) => {
    const so = getSeriesOpts(s.name, options);

    const seriesData = isHorizontal ? [...s.data].reverse() : s.data;

    const series: Record<string, unknown> = {
      name: s.name,
      type: 'bar',
      data: isTime
        ? s.data.map((v, i) => [data.categories[i], v])
        : seriesData,
    };

    if (isSpark) {
      series.symbolSize = 0;
    }

    if (options.stacked) {
      series.stack = 'Total';
    }

    if (so.yAxisIndex !== undefined) series.yAxisIndex = so.yAxisIndex;

    if (so.showLabel) {
      series.label = {
        show: true,
        position: so.labelPosition ?? 'outside',
      };
    }

    applyMarkLines(series, so);
    applyMarkPoints(series, so);

    return series;
  });

  if (options.stacked) {
    applyStackedRadius(rawSeries, isHorizontal);
  } else {
    applyNonStackedRadius(rawSeries, isHorizontal);
  }

  return rawSeries;
}

function applyNonStackedRadius(
  series: Record<string, unknown>[],
  isHorizontal: boolean,
): void {
  const radius = isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
  for (const s of series) {
    const data = s.data as unknown[];
    s.data = data.map((v) => ({
      value: v,
      itemStyle: { borderRadius: radius },
    }));
  }
}

function applyStackedRadius(
  series: Record<string, unknown>[],
  isHorizontal: boolean,
): void {
  if (series.length === 0) return;
  const dataLength = (series[0].data as unknown[]).length;

  const stackEnd: number[] = new Array(dataLength).fill(-1);

  for (let dataIdx = 0; dataIdx < dataLength; dataIdx++) {
    for (let seriesIdx = series.length - 1; seriesIdx >= 0; seriesIdx--) {
      const val = (series[seriesIdx].data as unknown[])[dataIdx];
      if (val !== undefined && val !== null && val !== '-') {
        stackEnd[dataIdx] = seriesIdx;
        break;
      }
    }
  }

  for (let seriesIdx = 0; seriesIdx < series.length; seriesIdx++) {
    const data = series[seriesIdx].data as unknown[];
    series[seriesIdx].data = data.map((v, dataIdx) => {
      const isTop = stackEnd[dataIdx] === seriesIdx;
      const topR = isTop ? 4 : 0;
      return {
        value: v,
        itemStyle: {
          borderRadius: isHorizontal
            ? [0, topR, topR, 0]
            : [topR, topR, 0, 0],
        },
      };
    });
  }
}

function applyMarkLines(series: Record<string, unknown>, so: SeriesOptions): void {
  if (!so.markLines || so.markLines.length === 0) return;
  series.markLine = {
    data: so.markLines.map((type) => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
    })),
  };
}

function applyMarkPoints(series: Record<string, unknown>, so: SeriesOptions): void {
  if (!so.markPoints || so.markPoints.length === 0) return;
  series.markPoint = {
    data: so.markPoints.map((type) => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
    })),
  };
}
