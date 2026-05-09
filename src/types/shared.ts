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
  /**
   * How the legend behaves when the entries don't fit on a single row/column.
   *
   * - `'scroll'` (default): one row/column with paging arrows. Keeps the
   *   layout reserve helpers (`getLegendReserve` / `buildGrid`) accurate
   *   because they assume a single-line slot — extra series add a "›" button,
   *   not extra rows that would overlap the chart body.
   * - `'plain'`: ECharts' native behavior — wraps onto extra rows/columns
   *   when overflowing. Callers must ensure the legend won't wrap (or bump
   *   `padding` / move the legend to a side edge), otherwise wrapped rows
   *   land on top of the plot area.
   */
  type?: 'scroll' | 'plain';
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
  /**
   * Pixel gap between the cursor (or anchored data point) and the
   * nearest edge of the tooltip box.
   *
   * **Defaults (when omitted):**
   *   - `variant: 'spark'` (line / area / bar) → 6 px — small enough
   *     for a 96×48 KPI card to feel "next to the cursor" rather
   *     than "in another zip code".
   *   - All other charts → ECharts' built-in 20 px (hardcoded in
   *     `refixTooltipPosition` inside ECharts' `TooltipView`). We do
   *     not override it so charts you've already styled keep the
   *     exact spacing they had.
   *
   * **When to set:** override either default when the chart's pixel
   * dimensions are unusual (e.g. very wide hero charts where 6 px
   * looks crowded, or non-spark charts on a small card where 20 px
   * is still too much). `0` is meaningful — tooltip sits right at
   * the cursor.
   *
   * **Implementation note:** the library translates this into a
   * `tooltip.position` callback that mirrors ECharts' built-in
   * edge-flip logic (tooltip flips to the opposite side of the cursor
   * when it would overflow the chart viewport), only with your `gap`
   * substituted for the hardcoded 20. Setting
   * `options.echarts.tooltip.position` (passthrough) still wins via
   * the final `deepMerge` if you need full custom positioning.
   */
  cursorGap?: number;
  /**
   * Attach the tooltip DOM to `<body>` instead of the chart container,
   * so it can escape ancestors with `overflow: hidden` (common with
   * card / KPI / dialog containers).
   *
   * **Defaults:**
   * - Light DOM containers (e.g. `createChart(divEl, ...)`): `true` —
   *   the tooltip can render anywhere on screen without being clipped
   *   by a parent card.
   * - Shadow DOM containers (e.g. the `<i-chart>` web component):
   *   `false` — keeping the tooltip inside the shadow root preserves
   *   the component's style encapsulation and keeps the tooltip in the
   *   same stacking context as the host element.
   *
   * Pass an explicit `true` / `false` to override the auto-detected
   * default. Most consumers should leave this unset.
   *
   * Edge cases where you may want to override:
   * - `<i-chart>` rendered inside a Vue `<Teleport>` / portal where
   *   you need the tooltip in `<body>` regardless of shadow — set
   *   `appendToBody: true`.
   * - Light-DOM chart inside a stacking-context that you want the
   *   tooltip to stay glued to (e.g. some custom popper logic) — set
   *   `appendToBody: false`.
   */
  appendToBody?: boolean;
}
