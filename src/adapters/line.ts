import type { LineData, AreaData, LineChartOptions, AreaChartOptions } from '../types.js';
import type { ChartSetupResult, RenderContext } from './index.js';
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
import { resolveRaceFrameDuration, resolveRaceLabelHeadroom } from './race-utils.js';
import { getSeriesOpts, getYAxisCount, applyMarkLines, applyMarkPoints } from './series-utils.js';

export function resolveLineOptions(
  data: LineData,
  options: LineChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const variant = options.variant ?? 'default';

  if (variant === 'race') {
    return resolveLineRaceOptions(data, options, ctx);
  }

  // `dateFormat` is a strong opt-in: if the user is asking for date
  // formatting, they want a time axis even when the heuristic would miss
  // (e.g. category arrays that include the epoch `0`).
  const isTime =
    options.xAxis?.dateFormat !== undefined ||
    isTimeCategories(data.categories);
  const seriesNames = data.series.map((s) => s.name);
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
  return { option: merged };
}

// ---------------------------------------------------------------------------
// Race variant
// ---------------------------------------------------------------------------

/**
 * The text painted by a line-race endLabel. Centralized so the adaptive
 * headroom calculation (which runs before ECharts paints anything) uses
 * the exact same string ECharts will eventually render — no risk of the
 * estimate diverging from the actual label width.
 *
 * Null/undefined values produce a trailing-space-free string so they
 * contribute their minimum width — matches what ECharts shows when a
 * series has no current value.
 */
function formatRaceLineLabel(
  seriesName: string,
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined) return seriesName;
  return `${seriesName} ${value}`;
}

/**
 * Builds an ECharts line-race option from a single frame of {@link LineData}.
 *
 * Per frame the caller provides:
 *   - `data.categories` — the x-axis points visible at the current frame
 *     (typically a growing list of time / step labels)
 *   - `data.series[i].name` — racer identity (must stay stable across frames;
 *     ECharts diffs series by name to animate the transition)
 *   - `data.series[i].data` — the trail of each racer up to the current frame
 *
 * Unlike bar race, lines aren't sorted — the visual race is the leading edge
 * of each line growing rightward. An animated end-label tracks each line's
 * latest value via `series.endLabel` + `valueAnimation`.
 *
 * The animation between frames is driven by the consumer calling
 * `chart.update(nextFrame)` on their own interval; we emit `notMerge: false`
 * so ECharts merges the new option into the previous one and animates the
 * value/position transitions.
 */
function resolveLineRaceOptions(
  data: LineData,
  options: LineChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const race = options.race ?? {};
  // Auto-measured by default: matches the consumer's `chart.update()`
  // cadence. Explicit `race.frameDuration` still wins.
  const frameDuration = resolveRaceFrameDuration(race.frameDuration, ctx);
  const showValueLabel = race.showValueLabel ?? true;

  // Match the heuristic from the default path, with the same `dateFormat`
  // opt-in. Race streams are the primary place users want to force a time
  // axis (so existing points stay pinned across frames); honoring the
  // explicit signal prevents the axis from flipping mid-stream when the
  // category array briefly fails the digit-length heuristic (e.g. crosses
  // the epoch `0`).
  const isTime =
    options.xAxis?.dateFormat !== undefined ||
    isTimeCategories(data.categories);
  const seriesNames = data.series.map((s) => s.name);
  const yAxisCount = getYAxisCount(data, options);

  // End labels are drawn just outside the right edge of each line and need
  // grid headroom; otherwise they get clipped (same constraint as bar race
  // value labels). Reserve space adaptively from the widest "<name> <value>"
  // string in the current frame (canvas-measured when the DOM is available,
  // char-count estimate otherwise). The engine's high-water mark
  // (`ctx.maxRaceGridRight`) keeps the reserve monotonic across frames so
  // value-digit flips don't jitter the plot area.
  // Skip entirely when end labels are hidden — there's nothing to make
  // room for.
  const grid = buildGrid(options);
  if (options.grid?.right === undefined && showValueLabel) {
    const labels = data.series.map((s) =>
      formatRaceLineLabel(s.name, s.data[s.data.length - 1] as number | null | undefined),
    );
    grid.right = resolveRaceLabelHeadroom(labels, ctx);
  }

  const xAxis = buildXAxis(data, options, isTime);
  // Streaming smoothness fix: on a time axis, pin the left edge of the
  // domain to the first category. Without this, ECharts auto-fits min/max
  // every frame, so existing points slide left as new ones arrive — the
  // line looks like it's being compressed rather than extended. Pinning
  // min keeps existing pixels stable. We only touch the leading edge;
  // users wanting full-domain pinning (no right-edge drift either) should
  // set `xAxis.max` explicitly — see README "Line Race".
  //
  // We check the BUILT axis (not raw user options) so this also kicks in
  // when the user passed a bogus value (e.g. NaN) that buildXAxis stripped.
  if (isTime && data.categories.length > 0) {
    const first = xAxis[0] as Record<string, unknown>;
    if (first.min === undefined) {
      first.min = data.categories[0];
    }
  }

  const series = buildLineSeries(data, options, isTime, false);
  for (const s of series) {
    s.showSymbol = false;
    if (showValueLabel) {
      s.endLabel = {
        show: true,
        valueAnimation: true,
        formatter: (params: { seriesName?: string; value?: unknown }) => {
          const raw = params.value;
          const v = Array.isArray(raw) ? raw[raw.length - 1] : raw;
          return formatRaceLineLabel(
            params.seriesName ?? '',
            v as number | string | null | undefined,
          );
        },
      };
    }
  }

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: buildLegend(seriesNames, options),
    grid,
    xAxis,
    yAxis: buildYAxis(options, yAxisCount),
    tooltip: buildTooltip(options, 'axis', 'cross', isTime),
    series,
    animationDuration: 0,
    animationDurationUpdate: frameDuration,
    animationEasing: 'linear',
    animationEasingUpdate: 'linear',
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  merged.color = resolveColors(seriesNames, options);
  return { option: merged, notMerge: false };
}

export function resolveAreaOptions(
  data: AreaData,
  options: AreaChartOptions,
): Record<string, unknown> {
  const isTime =
    options.xAxis?.dateFormat !== undefined ||
    isTimeCategories(data.categories);
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
