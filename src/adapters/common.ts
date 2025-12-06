import type {
  ChartOptions,
  TitleOptions,
  LegendOptions,
  GridOptions,
  AxisOptions,
  XYData,
} from '../types.js';
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

const TITLE_DEFAULT_FONT_SIZE = 16;
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
  options: ChartOptions,
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

export function buildGrid(options: ChartOptions): Record<string, unknown> {
  const grid: GridOptions = options.grid ?? {};
  const legendArea = getLegendGridAdjustment(options);
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

// Space reserved in the grid for the legend component (legend height + gap to plot area).
const LEGEND_RESERVE = 36;

function getLegendGridAdjustment(options: ChartOptions): Record<string, unknown> {
  const legend = options.legend ?? {};
  if (legend.show === false) return {};

  const pos = legend.position ?? 'bottom';
  const p = getChartPadding(options);
  // Grid must pull back far enough for: outer padding + legend items + gap.
  const total = p + LEGEND_RESERVE;
  switch (pos) {
    case 'top':
      return { top: total };
    case 'bottom':
      return { bottom: total };
    case 'left':
      return { left: total };
    case 'right':
      return { right: total };
    default:
      return {};
  }
}

export function buildXAxis(
  data: XYData,
  options: ChartOptions,
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

export function buildYAxis(options: ChartOptions, count = 1): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.yAxis ?? {};
  const axes: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const axis: Record<string, unknown> = {
      type: 'value',
      splitArea: { show: false },
      nameLocation: 'center',
      nameGap: 60,
    };

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

  if (tooltip.formatValue) {
    const fn = tooltip.formatValue;
    result.valueFormatter = (value: number | string) =>
      fn(value as number, '');
  }

  // For time axes, apply a date format to the tooltip header.
  // When dateFormat is provided it is used directly; otherwise ECharts
  // auto-selects a format based on data granularity.
  if (isTimeAxis && tooltip.dateFormat) {
    const fmt = tooltip.dateFormat;
    result.formatter = (params: unknown) => {
      const items = Array.isArray(params) ? params : [params];
      if (!items.length) return '';
      const firstItem = items[0] as { axisValue?: number | string; value?: unknown; seriesName?: string; marker?: string };
      const rawTs = firstItem.axisValue ?? (Array.isArray(firstItem.value) ? (firstItem.value as [unknown, unknown])[0] : undefined);
      let header = String(rawTs ?? '');
      if (rawTs !== undefined) {
        const ts = typeof rawTs === 'number' ? rawTs : Date.parse(String(rawTs));
        if (!isNaN(ts)) {
          header = formatDateByPattern(new Date(ts), fmt);
        }
      }
      const rows = items
        .map((p: unknown) => {
          const item = p as { marker?: string; seriesName?: string; value?: unknown };
          const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
          const displayVal = tooltip.formatValue ? tooltip.formatValue(val as number, item.seriesName ?? '') : val;
          return `${item.marker ?? ''}${item.seriesName ?? ''}: <strong>${displayVal}</strong>`;
        })
        .join('<br/>');
      return `${header}<br/>${rows}`;
    };
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
export function isTimeCategories(categories: (string | number)[]): boolean {
  if (categories.length === 0) return false;
  return categories.every((v) => {
    if (typeof v === 'number') {
      const len = v.toString().length;
      return len === 10 || len === 13;
    }
    if (typeof v === 'string') {
      return DATE_STRING_RE.test(v.trim());
    }
    return false;
  });
}
