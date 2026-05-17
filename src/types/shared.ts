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

/**
 * Rich-text style object passed through to ECharts `*.rich.<key>`.
 *
 * Exposes common style keys as typed fields while keeping an index signature
 * so callers can use additional ECharts rich-text properties without waiting
 * for a library type update.
 */
export interface RichTextStyle {
  color?: string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontWeight?: string | number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  overflow?: 'none' | 'truncate' | 'break' | 'breakAll';
  lineOverflow?: 'truncate';
  ellipsis?: string;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  padding?: number | number[];
  /** Shorthand for ECharts rich-text background image (`backgroundColor: { image }`). */
  backgroundImage?: string | Record<string, unknown>;
  backgroundColor?: string | Record<string, unknown>;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number | number[];
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  [key: string]: unknown;
}

/**
 * One rich-text fragment. `text` is required; style is optional.
 *
 * - `style: string` references a key in `RichTextSpec.styles`.
 * - `style: RichTextStyle` inlines the style for this segment.
 * - `width` / `align` / `verticalAlign` are shorthand for the same rich style
 *   fields and merge on top of `style`.
 */
export interface RichTextSegment {
  text: string;
  style?: string | RichTextStyle;
  width?: number;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * Structured rich-text payload that the library compiles into ECharts'
 * `{key|text}` formatter string plus matching `rich` style map.
 */
export interface RichTextSpec {
  segments: RichTextSegment[];
  styles?: Record<string, RichTextStyle>;
}

/** Formatter input accepted by rich-text aware formatters. */
export type RichTextInput = string | RichTextSpec;

export interface LegendOptions {
  show?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Legend layout height in pixels.
   *
   * - `position: 'top' | 'bottom'`: used as the legend slot reserve height
   *   (fallback: `LEGEND_RESERVE`).
   * - `position: 'left' | 'right'`: forwarded to ECharts but reserve width is
   *   still controlled by `width` (or text measurement when `width` is unset).
   */
  height?: number;
  /**
   * Legend layout width in pixels.
   *
   * - `position: 'left' | 'right'`: used as the legend slot reserve width
   *   (fallback: measured widest label + non-text budget).
   * - `position: 'top' | 'bottom'`: forwarded to ECharts; reserve height is
   *   still controlled by `height` (or `LEGEND_RESERVE` when unset).
   */
  width?: number;
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
  /**
   * Customize the text rendered for each legend entry.
   *
   * Receives the **series / slice / node / category name** (the same string
   * the library passes as `legend.data[i]`) plus its zero-based index and
   * returns the display label. Accepts plain strings OR a structured
   * {@link RichTextSpec}; the latter is auto-compiled to ECharts rich text
   * (`{key|text}` + `legend.textStyle.rich`) by `buildLegend`.
   *
   * Common use cases:
   *  - append realtime values, units, or status to each entry, e.g.
   *    `(n) => `${n}  ${valueByName[n] ?? '—'}` `
   *  - localize / truncate long names
   *  - return {@link RichTextSpec} segments so callers can align columns /
   *    widths without hand-authoring rich-text keys
   *  - inject raw ECharts rich-text segments (`{key|text}`) manually when
   *    paired with `options.echarts.legend.textStyle.rich`
   *
   * Constraints:
   *  - Text-only (string or `RichTextSpec`) — no DOM / HTML. Legend text is
   *    rendered on canvas in ECharts; HTML belongs in `tooltip.customHtml`.
   *  - Newlines (`\n`) in the returned string DO render, but the layout
   *    reserve helpers (`getLegendReserve` / `buildGrid`) assume a single
   *    legend row (LEGEND_RESERVE = 36 px). Multi-line labels will overlap
   *    the chart body — increase `padding` or move the legend to a side
   *    edge in that case.
   *  - Side-edge legends (`position: 'left' | 'right'`) automatically
   *    re-measure with the **formatted** label width so long values don't
   *    bleed into the chart body.
   *  - When `formatLabel` throws, the entry falls back to the raw name
   *    (so a single bad lookup can't blank out the entire legend).
   */
  formatLabel?: (name: string, index: number) => RichTextInput;
}

export interface GridOptions {
  /** Whether to render the grid background/border. Default: true (race defaults to false). */
  show?: boolean;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface AxisOptions {
  /**
   * Whether to render this axis. Default: true.
   */
  show?: boolean;
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
  /**
   * Identity used to cache resolved tooltip HTML and dedupe concurrent
   * `customHtml` loads. ECharts re-invokes the formatter on every mouse
   * move — without caching, hovering inside a single slice / node / axis
   * column reruns `customHtml` continuously and the user sees a repeating
   * "loading" flicker.
   *
   * - Default extractor: keys axis-trigger payloads by `axisValue` and
   *   item / edge payloads by `(dataType, seriesIndex, dataIndex, name)`.
   *   This covers every built-in chart type that wires
   *   {@link TooltipOptions.customHtml}.
   * - Pass a function to customize (e.g. include extra fields the default
   *   key elides, or coarsen across series).
   * - Pass `false` to disable caching entirely — every formatter invocation
   *   will re-fire `customHtml`. Use only when the async result genuinely
   *   varies across mouse moves for the same data point.
   *
   * The cache lives for the lifetime of the formatter closure, which is
   * recreated on every `setOption` resolve in the adapter pipeline. Stale
   * data thus self-clears on chart updates.
   */
  cacheKey?: ((params: unknown) => string) | false;
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
