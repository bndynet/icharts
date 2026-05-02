import type { XYData, ChartOptions } from '../types.js';
import type { ChartSetupResult } from './index.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  buildTitle,
  buildLegend,
  buildGrid,
  buildXAxis,
  buildTooltip,
  isTimeCategories,
} from './common.js';
import { getSeriesOpts, applyMarkLines, applyMarkPoints } from './series-utils.js';

export function resolveBarOptions(
  data: XYData,
  options: ChartOptions,
): ChartSetupResult {
  const variant = options.variant ?? 'default';

  if (variant === 'race') {
    return resolveBarRaceOptions(data, options);
  }

  const isTime = isTimeCategories(data.categories);
  const seriesNames = data.series.map((s) => s.name);
  const isSpark = variant === 'spark';
  const isHorizontal = variant === 'horizontal';

  // colorByCategory paints every bar with its own palette color (resolved
  // from the category name via the same colorMap → theme pipeline used
  // elsewhere). It only makes visual sense for a single-series, non-stacked
  // chart — silently ignore otherwise.
  const enableColorByCategory =
    options.bar?.colorByCategory === true &&
    !options.stacked &&
    data.series.length === 1;

  const baseLegend = isSpark ? { show: false } : buildLegend(seriesNames, options);

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: enableColorByCategory ? { show: false } : baseLegend,
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

  const series = buildBarSeries(data, options, isTime, isHorizontal, enableColorByCategory);
  eOption.series = series;

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  // Palette source switches based on colorByCategory: when enabled, derive
  // colors from category names (so ECharts colorBy:'data' picks per-bar
  // colors); otherwise use series names (one color per series).
  merged.color = enableColorByCategory
    ? resolveColors(data.categories.map(String), options)
    : resolveColors(seriesNames, options);
  return { option: merged };
}

// ---------------------------------------------------------------------------
// Race variant
// ---------------------------------------------------------------------------

/** Right-side grid padding (px) reserved for value labels in race variant. */
const RACE_LABEL_HEADROOM = 80;

/**
 * Builds an ECharts bar-race option from a single frame of {@link XYData}.
 *
 * Per frame the caller provides:
 *   - `data.categories` — racer names (stable across frames; defines bar identity)
 *   - `data.series[0].data` — values for those racers at the current frame
 *
 * Additional series are ignored — bar race shows a single ranked metric.
 * The animation between frames is driven by the consumer calling
 * `chart.update(nextFrame)` on their own interval; we emit `notMerge: false`
 * so ECharts merges the new option into the previous one and animates the
 * value/position transitions.
 */
function resolveBarRaceOptions(
  data: XYData,
  options: ChartOptions,
): ChartSetupResult {
  const race = options.race ?? {};
  const frameDuration = race.frameDuration ?? 3000;
  const showValueLabel = race.showValueLabel ?? true;
  const firstSeries = data.series[0] ?? { name: '', data: [] };
  const seriesName = firstSeries.name;

  // Race is always single-series, so no extra guards needed beyond reading
  // the flag — the stacked / multi-series checks from the non-race path
  // don't apply here.
  const enableColorByCategory = options.bar?.colorByCategory === true;

  // Race labels sit *outside* the right end of each bar (position: 'right' +
  // valueAnimation). The default grid only reserves `padding` (≈12px) on the
  // right which clips the digits. Reserve label headroom unless the user has
  // explicitly set `grid.right` themselves.
  const grid = buildGrid(options);
  if (options.grid?.right === undefined) {
    grid.right = RACE_LABEL_HEADROOM;
  }

  const raceSeries: Record<string, unknown> = {
    name: seriesName,
    type: 'bar',
    // Raw numbers only — per-bar `{ value, itemStyle }` objects break the
    // smooth value transition between consecutive `setOption` calls.
    data: firstSeries.data,
    realtimeSort: true,
    label: {
      show: showValueLabel,
      position: 'right',
      valueAnimation: true,
    },
    itemStyle: { borderRadius: [0, 4, 4, 0] },
  };

  applyBarOptionsSizing(raceSeries, options);

  if (enableColorByCategory) {
    raceSeries.colorBy = 'data';
  }

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: enableColorByCategory ? { show: false } : buildLegend([seriesName], options),
    grid,
    tooltip: buildTooltip(options, 'axis', 'shadow', false),
    xAxis: {
      type: 'value',
      max: 'dataMax',
      splitLine: { show: false },
      splitArea: { show: false },
    },
    yAxis: {
      type: 'category',
      data: data.categories,
      inverse: true,
      animationDuration: 300,
      animationDurationUpdate: 300,
      // `max` controls how many bars fit in the viewport. ECharts wants the
      // last *visible* index, so topN=10 → max=9. Omit when unset to show all.
      ...(race.topN !== undefined ? { max: race.topN - 1 } : {}),
    },
    series: [raceSeries],
    animationDuration: 0,
    animationDurationUpdate: frameDuration,
    animationEasing: 'linear',
    animationEasingUpdate: 'linear',
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  merged.color = enableColorByCategory
    ? resolveColors(data.categories.map(String), options)
    : resolveColors([seriesName], options);
  return { option: merged, notMerge: false };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function buildBarSeries(
  data: XYData,
  options: ChartOptions,
  isTime: boolean,
  isHorizontal: boolean,
  enableColorByCategory: boolean,
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

    applyBarOptionsSizing(series, options);

    if (enableColorByCategory) {
      series.colorBy = 'data';
    }

    return series;
  });

  if (options.stacked) {
    applyStackedRadius(rawSeries, isHorizontal);
  } else {
    applyNonStackedRadius(rawSeries, isHorizontal);
  }

  return rawSeries;
}

/**
 * Propagates the sizing fields from {@link ChartOptions.bar} into a single
 * ECharts series object. Shared by every bar variant (default, horizontal,
 * spark, race) so authors get a consistent API.
 */
function applyBarOptionsSizing(
  series: Record<string, unknown>,
  options: ChartOptions,
): void {
  const bar = options.bar;
  if (!bar) return;
  if (bar.barWidth !== undefined) series.barWidth = bar.barWidth;
  if (bar.barMaxWidth !== undefined) series.barMaxWidth = bar.barMaxWidth;
  if (bar.barMinWidth !== undefined) series.barMinWidth = bar.barMinWidth;
  if (bar.barGap !== undefined) series.barGap = bar.barGap;
  if (bar.barCategoryGap !== undefined) series.barCategoryGap = bar.barCategoryGap;
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
