import type { BarData, BarChartOptions } from '../types.js';
import type { ChartSetupResult, RenderContext } from './index.js';
import { deepMerge, resolveColors } from '../utils.js';
import { resolveRaceFrameDuration, resolveRaceLabelHeadroom } from './race-utils.js';
import {
  buildTitle,
  buildLegend,
  buildGrid,
  buildXAxis,
  buildTooltip,
  buildSparkTooltip,
  getLabelFontSize,
  isTimeCategories,
} from './common.js';
import { getSeriesOpts, applyMarkLines, applyMarkPoints } from './series-utils.js';

export function resolveBarOptions(
  data: BarData,
  options: BarChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const variant = options.variant ?? 'default';

  if (variant === 'race') {
    return resolveBarRaceOptions(data, options, ctx);
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
    options.colorByCategory === true &&
    !options.stacked &&
    data.series.length === 1;

  const baseLegend = isSpark ? { show: false } : buildLegend(seriesNames, options);
  const legendVisible =
    !isSpark && !enableColorByCategory && (options.legend?.show ?? true);

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: enableColorByCategory ? { show: false } : baseLegend,
    grid: isSpark
      ? { top: 0, right: 0, bottom: 0, left: 0, containLabel: false }
      : buildGrid(options, { legendShow: legendVisible }),
    tooltip: isSpark
      ? buildSparkTooltip(options, ctx)
      : buildTooltip(options, 'axis', 'shadow', isTime, ctx),
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
  // Horizontal bars reverse category data — palette order must match.
  const categoryNames = data.categories.map(String);
  const namesForPalette =
    enableColorByCategory && isHorizontal
      ? [...categoryNames].reverse()
      : categoryNames;
  merged.color = enableColorByCategory
    ? resolveColors(namesForPalette, options)
    : resolveColors(seriesNames, options);
  return { option: merged };
}

// ---------------------------------------------------------------------------
// Race variant
// ---------------------------------------------------------------------------

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
  data: BarData,
  options: BarChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const race = options.race ?? {};
  // Auto-measured by default: matches the consumer's `chart.update()`
  // cadence. Explicit `race.frameDuration` still wins.
  const frameDuration = resolveRaceFrameDuration(race.frameDuration, ctx);
  const showValueLabel = race.showValueLabel ?? true;
  const firstSeries = data.series[0] ?? { name: '', data: [] };
  const seriesName = firstSeries.name;

  // Race is always single-series, so no extra guards needed beyond reading
  // the flag — the stacked / multi-series checks from the non-race path
  // don't apply here.
  const enableColorByCategory = options.colorByCategory === true;
  const legendVisible = !enableColorByCategory && (options.legend?.show ?? true);

  // Race labels sit *outside* the right end of each bar (position: 'right' +
  // valueAnimation). The default grid only reserves `padding` (≈12px) on the
  // right which clips the digits. Reserve label headroom adaptively from
  // the current frame's widest value string (canvas-measured when the DOM is
  // available, char-count estimate otherwise), and let the engine's
  // high-water mark (`ctx.maxRaceGridRight`) keep the reserve monotonic
  // across frames so digit flips don't jitter the plot area.
  // Skip entirely when labels are hidden — there's nothing to make room for.
  const grid = buildGrid(options, { legendShow: legendVisible });
  if (options.grid?.right === undefined && showValueLabel) {
    grid.right = resolveRaceLabelHeadroom(
      firstSeries.data.map(formatRaceBarLabel),
      ctx,
    );
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
      // `ChartOptions.labelFontSize` — race value label is canvas-
      // rendered text, so it must follow the same global knob as the
      // non-race `showLabel` path below.
      fontSize: getLabelFontSize(options),
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
    tooltip: buildTooltip(options, 'axis', 'shadow', false, ctx),
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

/**
 * Mirrors the default text ECharts paints for a bar-race value label
 * (`label.valueAnimation: true` without a custom formatter). We use it
 * to drive the adaptive headroom calculation without having to wait for
 * ECharts to render and measure.
 *
 * Null/undefined values produce an empty string so they contribute zero
 * width — matching ECharts' own behavior of skipping the label.
 */
function formatRaceBarLabel(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function buildBarSeries(
  data: BarData,
  options: BarChartOptions,
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
        fontSize: getLabelFontSize(options),
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
 * Propagates the bar-sizing fields from {@link BarChartOptions} into a single
 * ECharts series object. Shared by every bar variant (default, horizontal,
 * spark, race) so authors get a consistent API.
 */
function applyBarOptionsSizing(
  series: Record<string, unknown>,
  options: BarChartOptions,
): void {
  if (options.barWidth !== undefined) series.barWidth = options.barWidth;
  if (options.barMaxWidth !== undefined) series.barMaxWidth = options.barMaxWidth;
  if (options.barMinWidth !== undefined) series.barMinWidth = options.barMinWidth;
  if (options.barGap !== undefined) series.barGap = options.barGap;
  if (options.barCategoryGap !== undefined) series.barCategoryGap = options.barCategoryGap;
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
