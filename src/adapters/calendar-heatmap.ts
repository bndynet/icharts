import type {
  CalendarHeatmapData,
  CalendarHeatmapChartOptions,
  TooltipContextItem,
} from '../types.js';
import type { RenderContext } from './index.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  buildTitle,
  buildAsyncTooltipFormatter,
  getTitleReserve,
  getChartPadding,
  resolveAppendToBody,
  resolveTooltipPosition,
  buildVisualMap,
} from './common/index.js';

/** Left gutter (px) for the calendar's weekday + year labels. */
const CALENDAR_DAY_LABEL_MARGIN = 60;
/** Right gutter (px) so the grid doesn't touch the card edge. */
const CALENDAR_RIGHT_MARGIN = 20;
/** Top space (px) for the month-label row rendered above the cell area. */
const CALENDAR_MONTH_LABEL_RESERVE = 20;
/** Top space (px) for the visible visualMap bar (12px bar + gap). */
const CALENDAR_VISUALMAP_SPACE = 24;

/**
 * Resolve the calendar range. `options.range` wins; otherwise the year of
 * the earliest date is used (or the explicit `[min, max]` span when the
 * data crosses a year boundary), so partial weeks/months always render on a
 * full calendar grid.
 */
function resolveRange(
  data: CalendarHeatmapData,
  options: CalendarHeatmapChartOptions,
): number | string | [string, string] {
  if (options.range !== undefined) return options.range;
  const dates = data
    .map((c) => c.date)
    .filter((d): d is string => typeof d === 'string' && d.length >= 4)
    .sort();
  if (dates.length === 0) return new Date().getFullYear();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first.slice(0, 4) === last.slice(0, 4)) return Number(first.slice(0, 4));
  return [first, last];
}

/** Unpack ECharts calendar-heatmap `params.value` (`[date, value]`). */
function calendarCellCoords(params: unknown): {
  date: string;
  value: number | string;
} {
  const pr = params as Record<string, unknown>;
  const raw = Array.isArray(pr.value) ? (pr.value as unknown[]) : undefined;
  return {
    date: raw?.[0] !== undefined ? String(raw[0]) : String(pr.name ?? ''),
    value: (raw?.[1] ?? pr.value) as number | string,
  };
}

/** Map ECharts calendar-heatmap tooltip params → unified {@link TooltipContextItem}. */
function calendarParamsToTooltipContext(params: unknown): TooltipContextItem {
  const pr = params as Record<string, unknown>;
  const coords = calendarCellCoords(params);
  return {
    kind: 'item',
    dataIndex: typeof pr.dataIndex === 'number' ? pr.dataIndex : 0,
    name: coords.date,
    value: coords.value,
    marker: typeof pr.marker === 'string' ? pr.marker : undefined,
    color: typeof pr.color === 'string' ? pr.color : undefined,
  };
}

/** Default synchronous tooltip body: marker + date + formatted value. */
function calendarTooltipSyncHtml(
  params: unknown,
  options: CalendarHeatmapChartOptions,
): string {
  const pr = params as Record<string, unknown>;
  const coords = calendarCellCoords(params);
  const marker = (pr.marker as string) ?? '';
  const fmt = options.tooltip?.formatValue;
  const display = fmt ? fmt(Number(coords.value), coords.date) : String(coords.value);
  return `${marker}${coords.date}: ${display}`;
}

/**
 * Resolve a {@link CalendarHeatmapData} + {@link CalendarHeatmapChartOptions}
 * pair into an ECharts option object. Renders a GitHub-contribution-style
 * calendar grid (`coordinateSystem: 'calendar'`) colored by a continuous
 * visualMap — the same color pipeline the cartesian heatmap uses.
 */
export function resolveCalendarHeatmapOptions(
  data: CalendarHeatmapData,
  options: CalendarHeatmapChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const baseColor = resolveColors(['__calendar_heatmap__'], options)[0];
  const range = resolveRange(data, options);

  const p = getChartPadding(options);
  const topReserve = p + getTitleReserve(options).top;

  // Hidden by default — the value→color encoding still applies to the cells,
  // only the legend bar is not rendered. Users opt in with `visualMap.show`.
  const visualMap = buildVisualMap(
    data.map((c) => c.value),
    options.visualMap,
    baseColor,
    'horizontal',
    false,
  );
  const visualMapShown = visualMap !== undefined && visualMap.show === true;
  if (visualMap !== undefined && visualMapShown) {
    // Place the visible bar right below the title so it hugs the calendar.
    delete visualMap.bottom;
    visualMap.top = topReserve;
  }

  const calendar: Record<string, unknown> = {
    range,
    cellSize: options.cellSize ?? ['auto', 18],
    orient: options.orient ?? 'horizontal',
    // Month labels render above the cell area, so reserve extra top space
    // (plus room for the visible visualMap bar).
    top:
      topReserve +
      CALENDAR_MONTH_LABEL_RESERVE +
      (visualMapShown ? CALENDAR_VISUALMAP_SPACE : 0),
    // Fixed gutters keep the weekday + year labels on-canvas (they render
    // in the left margin) and the grid off the card's right edge.
    left: CALENDAR_DAY_LABEL_MARGIN,
    right: CALENDAR_RIGHT_MARGIN,
    // Structural only — label / border colors live in the theme so a
    // `setTheme()` repaints the calendar along with every other chart.
    dayLabel: {
      show: options.dayLabel?.show ?? true,
      firstDay: options.dayLabel?.firstDay ?? 1,
    },
    monthLabel: {
      show: options.monthLabel?.show ?? true,
      ...(options.monthLabel?.nameMap
        ? { nameMap: options.monthLabel.nameMap }
        : {}),
    },
    yearLabel: { show: options.showYearLabel ?? true },
    itemStyle: { borderWidth: 1 },
    splitLine: { show: true },
  };

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  const asyncFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync: (params) => calendarTooltipSyncHtml(params, options),
    toContext: calendarParamsToTooltipContext,
  });
  tooltip.formatter =
    asyncFormatter ??
    ((params: unknown) => calendarTooltipSyncHtml(params, options));

  const series: Record<string, unknown> = {
    type: 'heatmap',
    coordinateSystem: 'calendar',
    data: data.map((c) => [c.date, c.value] as [string, number]),
    // Border color is themed (`heatmap.itemStyle.borderColor`); emit width only.
    itemStyle: { borderWidth: 1 },
  };

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    calendar,
    tooltip,
    visualMap,
    series: [series],
  };

  const merged = deepMerge(
    eOption,
    (options.echarts ?? {}) as Record<string, unknown>,
  );
  // Base palette color published as the no-visualMap fallback and for any
  // palette-driven feature the user opts into via options.echarts.
  merged.color = [baseColor];
  return merged;
}
