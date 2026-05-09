// ---------------------------------------------------------------------------
// Shared option types
//
// Small, focused interfaces that compose into `ChartOptions` and the per-chart
// `*ChartOptions` subtypes (e.g. `TitleOptions` is the type of
// `ChartOptions.title`, `AxisOptions` is the type of `XYChartOptions.xAxis`).
// They are not bound to any specific chart and have no other dependencies, so
// they sit at the bottom of the type dependency graph and can be imported
// from anywhere without creating cycles.
// ---------------------------------------------------------------------------

export interface TitleOptions {
  text: string;
  /** Horizontal alignment. Default: 'center' */
  align?: 'left' | 'center' | 'right';
  /** Font size in px. Default: 16 */
  fontSize?: number;
  /** Vertical whitespace above and below the title text in px. Default: 8 */
  padding?: number;
}

export interface LegendOptions {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GridOptions {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface AxisOptions {
  name?: string;
  formatLabel?: (value: string | number, index: number) => string;
  /**
   * Date/time format for time-axis tick labels.
   * Uses dayjs / Moment.js compatible tokens:
   *   YYYY year (4-digit), YY year (2-digit),
   *   MM month, DD day, HH hour (24 h), mm minute, ss second
   * Example: 'YYYY-MM-DD', 'MM/DD', 'HH:mm', 'MM-DD HH:mm'
   */
  dateFormat?: string;
  /**
   * Date/time format for the axis-pointer cursor label (the callout shown on
   * the x-axis while hovering). Uses the same dayjs tokens as `dateFormat`.
   * Falls back to `dateFormat` when omitted.
   * Example: 'YYYY-MM-DD HH:mm' (more detail than the tick labels)
   */
  cursorFormat?: string;
  /**
   * Pin the axis lower bound. Accepts a number, a date-parseable string, or
   * one of ECharts' magic strings (`'dataMin'`, `'dataMax'`).
   *
   * Mainly useful for the `race` variant to lock the visible domain so the
   * line doesn't "compress" each frame as new categories arrive. Ignored by
   * category axes — those derive their domain from `data`.
   */
  min?: number | string;
  /** Pin the axis upper bound. See {@link AxisOptions.min}. */
  max?: number | string;
}

export interface SeriesOptions {
  type?: 'line' | 'bar';
  smooth?: boolean | number;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside' | 'center';
  showPoints?: boolean;
  yAxisIndex?: number;
  markLines?: ('average' | 'max' | 'min')[];
  markPoints?: ('max' | 'min')[];
}

// ---------------------------------------------------------------------------
// Tooltip context types — normalized payload passed to `TooltipOptions.customHtml`
// ---------------------------------------------------------------------------

/**
 * Normalized context for {@link TooltipOptions.customHtml} across chart types.
 * Narrow with `ctx.kind` (`'axis'` | `'item'` | `'edge'`).
 */
export interface TooltipContextAxis {
  kind: 'axis';
  /**
   * Same label shown in the tooltip header — formatted with `dateFormat` when
   * the x-axis is time-based and `dateFormat` is set; otherwise the raw category.
   */
  axisValueLabel: string;
  /** Index along the x-axis for this hover. */
  dataIndex: number;
  /** Raw axis value (timestamp number, ISO string, etc.). */
  rawAxisValue: string | number | undefined;
  /** One entry per series at this axis position. */
  series: Array<{
    name: string;
    value: number | string;
    marker?: string;
  }>;
}

/** Pie slice, Sankey/Chord node, and other single-item hovers. */
export interface TooltipContextItem {
  kind: 'item';
  dataIndex: number;
  name: string;
  value: number | string;
  /** Pie: ECharts percent of total. */
  percent?: number;
  marker?: string;
}

/** Sankey or Chord link / edge hover. */
export interface TooltipContextEdge {
  kind: 'edge';
  dataIndex: number;
  source: string;
  target: string;
  value: number | string;
}

export type TooltipContext =
  | TooltipContextAxis
  | TooltipContextItem
  | TooltipContextEdge;

/**
 * Options for `createAsyncTooltipFormatter` — chart-agnostic async tooltip
 * built on ECharts’ `(params, ticket, callback)` protocol.
 */
export interface CreateAsyncTooltipFormatterOptions {
  /** Synchronous tooltip body from raw ECharts `params` (axis array or single item). */
  formatSync: (params: unknown) => string;
  /**
   * Returns extra HTML appended below `formatSync` output (after a separator).
   * Receives the same `params` as ECharts passed to the formatter.
   */
  customHtml: (params: unknown) => Promise<string>;
  /**
   * Shown while `customHtml` is pending. Plain text; HTML special characters are escaped.
   * @default 'Loading…'
   */
  placeholder?: string;
}

export interface TooltipOptions {
  enabled?: boolean;
  formatValue?: (value: number | string, name: string) => string;
  /**
   * Date/time format for the tooltip header when using a time x-axis.
   * Uses dayjs / Moment.js compatible tokens:
   *   YYYY year (4-digit), YY year (2-digit),
   *   MM month, DD day, HH hour (24 h), mm minute, ss second
   * Example: 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm'
   * If omitted, ECharts auto-selects a format based on data granularity.
   */
  dateFormat?: string;
  /**
   * Append asynchronously loaded HTML after the chart’s default tooltip body.
   * Receives a normalized {@link TooltipContext} — use `ctx.kind` to
   * distinguish axis (`line` / `bar` / `area`), item (`pie`, node in `sankey` /
   * `chord`), or edge (link in `sankey` / `chord`).
   *
   * Not applied to spark charts or when `tooltip.enabled` is false. If
   * `echarts.tooltip.formatter` is merged later and replaces `formatter`, this
   * hook has no effect.
   */
  customHtml?: (ctx: TooltipContext) => Promise<string>;
  /**
   * Shown while `customHtml` is pending.
   * @default 'Loading…'
   */
  placeholder?: string;
}
