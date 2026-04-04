import type * as echarts from 'echarts';

// ---------------------------------------------------------------------------
// Chart type enum
// ---------------------------------------------------------------------------

export enum ChartType {
  Line = 'line',
  Bar = 'bar',
  Area = 'area',
  Pie = 'pie',
  Gauge = 'gauge',
  Sankey = 'sankey',
  Chord = 'chord',
}

// ---------------------------------------------------------------------------
// Chart variants (sub-styles for each type)
// ---------------------------------------------------------------------------

export type LineVariant = 'default' | 'spark';
export type BarVariant = 'default' | 'horizontal' | 'spark';
export type AreaVariant = 'default' | 'spark';
export type PieVariant = 'default' | 'doughnut' | 'half-doughnut' | 'nightingale';
export type GaugeVariant = 'default' | 'percentage';
export type SankeyVariant = 'default' | 'vertical';

export type ChartVariant =
  | LineVariant
  | BarVariant
  | AreaVariant
  | PieVariant
  | GaugeVariant
  | SankeyVariant;

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

export interface XYDataSeries {
  name: string;
  data: number[];
}

export interface XYData {
  categories: (string | number)[];
  series: XYDataSeries[];
}

export interface PieDataItem {
  name: string;
  value: number;
}

export type PieData = PieDataItem[];

export interface GaugeData {
  value: number;
  max?: number;
  label?: string;
}

export interface SankeyNode {
  name: string;
  /** Optional fixed color for this specific node */
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface ChordNode {
  name: string;
  /** Optional fixed color for this node's arc and outgoing ribbons */
  color?: string;
  /**
   * Relative weight of the node arc.
   * When omitted the arc size is derived from the sum of connected link values.
   */
  value?: number;
}

export interface ChordLink {
  source: string;
  target: string;
  value: number;
}

export interface ChordData {
  nodes: ChordNode[];
  links: ChordLink[];
}

export type ChartData = XYData | PieData | GaugeData | SankeyData | ChordData;

// ---------------------------------------------------------------------------
// Options types
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
}

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

export interface PieSliceOptions {
  borderRadius?: number;
  borderColor?: string;
  gap?: number;
}

export interface ChartOptions {
  theme?: string;
  /** Chart title. Pass a plain string as shorthand or a TitleOptions object for full control. */
  title?: string | TitleOptions;
  /**
   * Outer whitespace (px) between chart content and all canvas edges.
   * Applies to title, legend, and the plot area. Default: 12.
   */
  padding?: number;
  colors?: string[];
  colorMap?: Record<string, string>;

  legend?: LegendOptions;
  grid?: GridOptions;

  variant?: ChartVariant;
  stacked?: boolean;

  xAxis?: AxisOptions;
  yAxis?: AxisOptions;

  innerRadius?: string | number;
  outerRadius?: string | number;
  slice?: PieSliceOptions;
  autoSort?: boolean;

  gaugeWidth?: number;

  series?: Record<string, SeriesOptions>;

  tooltip?: TooltipOptions;

  /** Raw ECharts options merged last — escape hatch for advanced users */
  echarts?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Chart instance interface (returned by createChart)
// ---------------------------------------------------------------------------

export interface IChartInstance {
  update(data?: ChartData, options?: ChartOptions): void;
  /** Switch ECharts theme without disposing the instance (ECharts 6+). Updates series colors from the active palette. */
  setTheme(theme: string): void;
  resize(): void;
  dispose(): void;
  getEChartsInstance(): echarts.ECharts;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export function isXYData(data: ChartData): data is XYData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'categories' in data &&
    'series' in data &&
    Array.isArray((data as XYData).series)
  );
}

export function isPieData(data: ChartData): data is PieData {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'name' in data[0] &&
    'value' in data[0]
  );
}

export function isGaugeData(data: ChartData): data is GaugeData {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'value' in data &&
    !('categories' in data) &&
    !('nodes' in data)
  );
}

export function isSankeyData(data: ChartData): data is SankeyData {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'nodes' in data &&
    'links' in data &&
    Array.isArray((data as SankeyData).nodes) &&
    Array.isArray((data as SankeyData).links)
  );
}

/**
 * ChordData and SankeyData share the same runtime shape ({ nodes, links }).
 * The chart type — not the data shape — determines which adapter is used.
 * This guard validates the structural contract for ChordData.
 */
export function isChordData(data: ChartData): data is ChordData {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'nodes' in data &&
    'links' in data &&
    Array.isArray((data as ChordData).nodes) &&
    Array.isArray((data as ChordData).links)
  );
}
