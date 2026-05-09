import type {
  ChartOptions,
  XYChartOptions,
  TitleOptions,
  LegendOptions,
  GridOptions,
  AxisOptions,
  XYData,
  TooltipOptions,
  TooltipContextAxis,
} from '../types.js';

/**
 * Structural shape consumed by {@link buildLegend} and its grid offset helper.
 *
 * `legend` no longer lives on the base `ChartOptions` — it sits on the
 * subtypes that actually render a legend (`XYChartOptions` for line/bar/area
 * and `PieChartOptions` for pie). Giving the helper an intersection rather
 * than the union of subtypes keeps the call sites concise without re-adding
 * `legend` to charts that ignore it (gauge / sankey / chord).
 */
type WithLegend = ChartOptions & { legend?: LegendOptions };
import { createAsyncTooltipFormatter } from '../async-tooltip.js';
import { deepMerge } from '../utils.js';

// ---------------------------------------------------------------------------
// Default font stack
// ---------------------------------------------------------------------------

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", ' +
  '"Microsoft YaHei", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif';

// ---------------------------------------------------------------------------
// Shared ECharts defaults that apply to every chart type
// ---------------------------------------------------------------------------

const CHART_DEFAULT_PADDING = 12;

/**
 * Treat NaN/undefined as "not set" for axis min/max. ECharts accepts numbers,
 * date-parseable strings, or the magic strings `'dataMin'` / `'dataMax'`; a
 * stray NaN (e.g. from a `Date.UTC(undefined, ...)` in user code) would
 * collapse the axis to a single tick, so we skip writing it.
 */
function isAxisBound(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.length > 0;
}

function getChartPadding(options: ChartOptions): number {
  return options.padding ?? CHART_DEFAULT_PADDING;
}

export function getCommonDefaults(): Record<string, unknown> {
  return {
    textStyle: {
      fontSize: 13,
      fontFamily: FONT_FAMILY,
    },
    tooltip: {
      padding: [6, 12],
      textStyle: { fontWeight: 'normal' },
      confine: true,
    },
    toolbox: { show: false },
  };
}

// ---------------------------------------------------------------------------
// Title helpers
// ---------------------------------------------------------------------------

const TITLE_DEFAULT_FONT_SIZE = 14;
const TITLE_DEFAULT_PADDING = 8;
/** Extra gap between the bottom of the title and the top of the plot area. */
const TITLE_CHART_GAP = 8;

function normalizeTitleOptions(title: string | TitleOptions): TitleOptions {
  return typeof title === 'string' ? { text: title } : title;
}

/** Returns the vertical space (px) consumed by the title, or 0 if no title. */
export function getTitleHeight(options: ChartOptions): number {
  if (!options.title) return 0;
  const t = normalizeTitleOptions(options.title);
  return (t.fontSize ?? TITLE_DEFAULT_FONT_SIZE) + (t.padding ?? TITLE_DEFAULT_PADDING) * 2 + TITLE_CHART_GAP;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildTitle(options: ChartOptions): Record<string, unknown> | undefined {
  if (!options.title) return undefined;
  const t = normalizeTitleOptions(options.title);
  const fontSize = t.fontSize ?? TITLE_DEFAULT_FONT_SIZE;
  const titlePadding = t.padding ?? TITLE_DEFAULT_PADDING;
  const chartPadding = getChartPadding(options);

  return {
    text: t.text,
    left: t.align ?? 'center',
    top: chartPadding,
    padding: [titlePadding, 0],
    textStyle: { fontSize, fontWeight: 'normal' },
  };
}

export function buildLegend(
  names: string[],
  options: WithLegend,
): Record<string, unknown> {
  const legend: LegendOptions = options.legend ?? {};
  const show = legend.show ?? true;
  const position = legend.position ?? 'bottom';
  const p = getChartPadding(options);

  const positionMap: Record<string, Record<string, unknown>> = {
    top: { top: p, left: 'center', orient: 'horizontal' },
    bottom: { bottom: p, left: 'center', orient: 'horizontal' },
    left: { top: 'center', left: p, orient: 'vertical' },
    right: { top: 'center', right: p, orient: 'vertical' },
  };

  return {
    show,
    data: names,
    icon: 'roundRect',
    itemGap: 10,
    ...positionMap[position],
  };
}

export interface BuildGridOverrides {
  /** When the adapter hides the legend (e.g. bar `colorByCategory`), pass `false` so grid padding matches. */
  legendShow?: boolean;
}

export function buildGrid(
  options: XYChartOptions,
  overrides?: BuildGridOverrides,
): Record<string, unknown> {
  const grid: GridOptions = options.grid ?? {};
  const legendArea = getLegendGridAdjustment(options, overrides?.legendShow);
  const titleHeight = getTitleHeight(options);
  const p = getChartPadding(options);
  return deepMerge(
    {
      top: p + titleHeight,
      left: p,
      right: p,
      bottom: p,
      borderWidth: 0,
      containLabel: true,
    },
    legendArea,
    grid as Record<string, unknown>,
  );
}

/**
 * Pixel slot reserved for the legend component (legend height + gap to
 * the plot area). Adapters compose this with their own layout — see
 * {@link getLegendReserve} for the helper that turns it into per-edge
 * reserves, and {@link buildGrid} for the XY-chart consumer.
 */
export const LEGEND_RESERVE = 36;

/**
 * Pixel reserves at each canvas edge. Empty edges are `0`.
 *
 * Returned by {@link getLegendReserve}; consumed by chart-body
 * positioning math (radar.center + radius, pie.center, gauge.center)
 * and by {@link buildGrid} for grid-based charts.
 */
export interface EdgeReserves {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const EMPTY_EDGES: EdgeReserves = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 });

/**
 * Pixel reserve the legend occupies on each canvas edge.
 *
 * Returns zeros on every edge when the legend is hidden. Non-zero on
 * exactly one edge — whichever {@link LegendOptions.position} selects —
 * when shown. Charts subtract these reserves from the available canvas
 * when positioning a body that doesn't live on the XY grid (radar
 * polygon, pie/gauge ring) so the body and the legend row don't
 * collide.
 *
 * Reserves do NOT include the chart's outer `padding`; that's a
 * separate uniform offset that callers add when their coordinate
 * system needs it (e.g. {@link buildGrid} adds `padding + reserve`
 * because grid edges are absolute pixels, while radar's percent-based
 * center math doesn't need it because padding cancels symmetrically).
 *
 * @param showLegend pass `legend.show` after applying any adapter-side
 *   default (some charts default the legend off — see pie / radar).
 * @param extraGap optional pixel padding stacked onto the legend's own
 *   edge, for charts whose body extends past its nominal radius (e.g.
 *   radar.axisName labels overflow the polygon by ~15 px).
 */
export function getLegendReserve(
  options: WithLegend,
  showLegend: boolean,
  extraGap = 0,
): EdgeReserves {
  if (!showLegend) return { ...EMPTY_EDGES };
  const slot = LEGEND_RESERVE + extraGap;
  const position = options.legend?.position ?? 'bottom';
  switch (position) {
    case 'top':
      return { ...EMPTY_EDGES, top: slot };
    case 'bottom':
      return { ...EMPTY_EDGES, bottom: slot };
    case 'left':
      return { ...EMPTY_EDGES, left: slot };
    case 'right':
      return { ...EMPTY_EDGES, right: slot };
    default:
      return { ...EMPTY_EDGES };
  }
}

function getLegendGridAdjustment(
  options: XYChartOptions,
  legendShow?: boolean,
): Record<string, unknown> {
  const show = legendShow ?? options.legend?.show ?? true;
  const reserves = getLegendReserve(options, show);
  // Grid bottom/top etc. are absolute pixel coordinates from the
  // canvas edge, so the grid must pull back by `padding + reserve`
  // (the radar/pie path doesn't add `padding` because their percent
  // center math against the full canvas already absorbs it).
  const p = getChartPadding(options);
  const out: Record<string, unknown> = {};
  if (reserves.top > 0) out.top = p + reserves.top;
  if (reserves.bottom > 0) out.bottom = p + reserves.bottom;
  if (reserves.left > 0) out.left = p + reserves.left;
  if (reserves.right > 0) out.right = p + reserves.right;
  return out;
}

export function buildXAxis(
  data: XYData,
  options: XYChartOptions,
  isTimeAxis: boolean,
): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.xAxis ?? {};

  const axis: Record<string, unknown> = {
    type: isTimeAxis ? 'time' : 'category',
    boundaryGap: !isTimeAxis,
    splitLine: { show: false },
    splitArea: { show: false },
  };

  if (!isTimeAxis) {
    axis.data = data.categories;
  }

  // min/max apply to value & time axes. Category axes derive their domain
  // from `data`, so ECharts ignores these — passing them through is harmless.
  // Treat NaN the same as unset; ECharts would otherwise collapse the axis
  // to a single tick and stack all data on one pixel position.
  if (isAxisBound(userAxis.min)) axis.min = userAxis.min;
  if (isAxisBound(userAxis.max)) axis.max = userAxis.max;

  if (userAxis.name) {
    axis.name = userAxis.name;
    axis.nameLocation = 'center';
    axis.nameGap = 30;
  }

  if (userAxis.formatLabel) {
    const fn = userAxis.formatLabel;
    axis.axisLabel = {
      formatter: (value: string | number, index: number) => fn(value, index),
    };
  } else if (isTimeAxis && userAxis.dateFormat) {
    const fmt = userAxis.dateFormat;
    axis.axisLabel = {
      formatter: (value: number) => formatDateByPattern(new Date(value), fmt),
    };
  }

  // Axis-pointer cursor label on the x-axis while hovering.
  // Uses cursorFormat if provided, falls back to dateFormat.
  if (isTimeAxis) {
    const cursorFmt = userAxis.cursorFormat ?? userAxis.dateFormat;
    if (cursorFmt) {
      const fmt = cursorFmt;
      axis.axisPointer = {
        label: {
          formatter: (params: { value: number }) =>
            formatDateByPattern(new Date(params.value), fmt),
        },
      };
    }
  }

  return [axis];
}

export function buildYAxis(options: XYChartOptions, count = 1): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.yAxis ?? {};
  const axes: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const axis: Record<string, unknown> = {
      type: 'value',
      splitArea: { show: false },
      nameLocation: 'center',
      nameGap: 60,
    };

    // min/max apply to every value-axis stack. Only the first axis honors
    // user-supplied name / formatter, so we mirror that pattern here.
    // NaN is treated as unset (see buildXAxis for the same reasoning).
    if (i === 0 && isAxisBound(userAxis.min)) axis.min = userAxis.min;
    if (i === 0 && isAxisBound(userAxis.max)) axis.max = userAxis.max;

    if (i === 0 && userAxis.name) {
      axis.name = userAxis.name;
    }

    if (i === 0 && userAxis.formatLabel) {
      const fn = userAxis.formatLabel;
      axis.axisLabel = {
        formatter: (value: string | number, index: number) => fn(value, index),
      };
    }

    if (i > 0) {
      axis.alignTicks = true;
    }

    axes.push(axis);
  }

  return axes;
}

/**
 * Builds the same HTML as icharts’ default axis tooltip for line/bar/area,
 * including `formatValue` and time `dateFormat` when applicable.
 */
export function formatAxisTooltipSyncHtml(
  params: unknown,
  tooltip: TooltipOptions,
  isTimeAxis: boolean,
): string {
  const items = Array.isArray(params) ? params : [params];
  if (!items.length) return '';
  const firstItem = items[0] as {
    axisValue?: number | string;
    value?: unknown;
    seriesName?: string;
    marker?: string;
  };
  const rawTs =
    firstItem.axisValue ??
    (Array.isArray(firstItem.value) ? (firstItem.value as [unknown, unknown])[0] : undefined);

  let header: string;
  if (isTimeAxis && tooltip.dateFormat && rawTs !== undefined) {
    const ts = typeof rawTs === 'number' ? rawTs : Date.parse(String(rawTs));
    header = !isNaN(ts) ? formatDateByPattern(new Date(ts), tooltip.dateFormat) : String(rawTs ?? '');
  } else {
    header = String(firstItem.axisValue ?? '');
  }

  const rows = items
    .map((p: unknown) => {
      const item = p as { marker?: string; seriesName?: string; value?: unknown };
      const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
      const displayVal = tooltip.formatValue
        ? tooltip.formatValue(val as number, item.seriesName ?? '')
        : val;
      return `${item.marker ?? ''}${item.seriesName ?? ''}: ${displayVal}`;
    })
    .join('<br/>');
  return `${header}<br/>${rows}`;
}

export function buildAxisTooltipContext(
  params: unknown,
  tooltip: TooltipOptions,
  isTimeAxis: boolean,
): TooltipContextAxis {
  const items = Array.isArray(params) ? params : [params];
  const first = items[0] as {
    axisValue?: number | string;
    value?: unknown;
    dataIndex?: number;
  };
  const rawTs =
    first.axisValue ??
    (Array.isArray(first.value) ? (first.value as [unknown, unknown])[0] : undefined);

  let axisValueLabel: string;
  if (isTimeAxis && tooltip.dateFormat && rawTs !== undefined) {
    const ts = typeof rawTs === 'number' ? rawTs : Date.parse(String(rawTs));
    axisValueLabel = !isNaN(ts)
      ? formatDateByPattern(new Date(ts), tooltip.dateFormat)
      : String(rawTs ?? '');
  } else {
    axisValueLabel = String(first.axisValue ?? '');
  }

  const series = items.map((p: unknown) => {
    const item = p as { marker?: string; seriesName?: string; value?: unknown };
    const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
    return {
      name: item.seriesName ?? '',
      value: val as number | string,
      marker: item.marker,
    };
  });

  return {
    kind: 'axis',
    axisValueLabel,
    dataIndex: first.dataIndex ?? 0,
    rawAxisValue: first.axisValue,
    series,
  };
}

export function buildTooltip(
  options: ChartOptions,
  trigger: 'axis' | 'item' = 'axis',
  pointerType?: 'cross' | 'shadow' | 'line' | 'none',
  isTimeAxis = false,
): Record<string, unknown> {
  const tooltip = options.tooltip ?? {};
  const result: Record<string, unknown> = {
    trigger,
    padding: [6, 12],
    textStyle: { fontWeight: 'normal' },
    confine: true,
  };

  if (pointerType) {
    result.axisPointer = { type: pointerType };
  }

  if (tooltip.enabled === false) {
    result.show = false;
  }

  // Async extra — delegates to chart-agnostic createAsyncTooltipFormatter.
  if (tooltip.customHtml && trigger === 'axis') {
    const customHtml = tooltip.customHtml;
    result.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => formatAxisTooltipSyncHtml(params, tooltip, isTimeAxis),
      customHtml: (params) =>
        Promise.resolve(customHtml(buildAxisTooltipContext(params, tooltip, isTimeAxis))),
      placeholder: tooltip.placeholder,
    });
    return result;
  }

  if (tooltip.formatValue) {
    const fn = tooltip.formatValue;
    result.valueFormatter = (value: number | string) =>
      fn(value as number, '');
  }

  // For time axes, apply a date format to the tooltip header.
  // When dateFormat is provided it is used directly; otherwise ECharts
  // auto-selects a format based on data granularity.
  if (isTimeAxis && tooltip.dateFormat) {
    result.formatter = (params: unknown) => formatAxisTooltipSyncHtml(params, tooltip, true);
  }

  return result;
}

/**
 * Format a Date using dayjs/Moment.js-compatible tokens:
 * YYYY, MM, DD, HH, mm, ss
 */
function formatDateByPattern(date: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return pattern
    .replace('YYYY', String(date.getFullYear()))
    .replace('YY', String(date.getFullYear()).slice(-2))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()));
}


/**
 * Loosely matches common date/datetime string patterns:
 *   YYYY-MM-DD, YYYY/MM/DD, YYYY-MM, YYYY/MM
 *   optionally followed by T HH:mm or HH:mm:ss etc.
 */
const DATE_STRING_RE =
  /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([T ]\d{1,2}(:\d{2}(:\d{2})?)?)?Z?$/;

/**
 * Detect whether XY categories represent time values.
 * Accepts:
 *  - Unix timestamps: 10-digit (seconds) or 13-digit (milliseconds) numbers
 *  - Date strings: ISO 8601 and common variants (e.g. "2024-01-15", "2024/06/01 08:30")
 */
/**
 * Detect whether `categories` should be plotted on an ECharts time axis
 * (`type: 'time'`) rather than a category axis.
 *
 * Heuristic — every entry must look time-like AND at least one entry must
 * unambiguously anchor the array as a timestamp series:
 *
 *   - **strings**: matches {@link DATE_STRING_RE} (ISO-ish date format).
 *   - **numbers**: either `0` (the unix epoch, freely accepted) or
 *     `|v| >= 1e8` (≈ April 1973 in ms; ≈ year 5138 in seconds — safely
 *     outside the range of categorical IDs / small enums).
 *   - **anchor**: at least one entry must be a date string OR have
 *     `|v| >= 1e9` so a lone `[0]` doesn't masquerade as time.
 *
 * Tradeoff vs. the previous "string length === 10 || 13" rule: that check
 * silently fell over for sub-second-magnitude timestamps (e.g. `Date.UTC(1968,…)`
 * is 11 digits, `Date.UTC(1970,0,1)` is exactly `0`). Streaming series that
 * crossed the epoch flipped the axis from `time` to `category` mid-stream
 * and collapsed every point onto one pixel column. The magnitude-based
 * check above accepts the full plausible timestamp range.
 *
 * When in doubt, users should set `xAxis.dateFormat` — line/area adapters
 * treat that as an explicit opt-in even when the heuristic would miss.
 */
export function isTimeCategories(categories: (string | number)[]): boolean {
  if (categories.length === 0) return false;
  let hasRealTimestamp = false;
  const everyValid = categories.every((v) => {
    if (typeof v === 'number') {
      if (v === 0) return true; // free pass; needs another entry to anchor
      const abs = Math.abs(v);
      if (abs < 1e8) return false;
      if (abs >= 1e9) hasRealTimestamp = true;
      return true;
    }
    if (typeof v === 'string') {
      const ok = DATE_STRING_RE.test(v.trim());
      if (ok) hasRealTimestamp = true;
      return ok;
    }
    return false;
  });
  return everyValid && hasRealTimestamp;
}
