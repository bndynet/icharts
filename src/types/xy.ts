import type { ChartOptions } from './base.js';
import type {
  AxisOptions,
  GridOptions,
  LegendOptions,
  SeriesOptions,
} from './shared.js';
// Type-only import — runtime is erased, no circular dependency at load time.
import type { ChartData } from './instance.js';

// ---------------------------------------------------------------------------
// XY data shape
// ---------------------------------------------------------------------------

export interface XYDataSeries {
  name: string;
  data: number[];
}

export interface XYData {
  categories: (string | number)[];
  series: XYDataSeries[];
}

/** Typed subset of ECharts dataZoom options used by XY charts. */
export interface DataZoomOptions {
  type?: 'inside' | 'slider';
  xAxisIndex?: number | number[];
  yAxisIndex?: number | number[];
  filterMode?: 'filter' | 'weakFilter' | 'empty' | 'none';
  start?: number;
  end?: number;
  startValue?: number | string | Date;
  endValue?: number | string | Date;
  minSpan?: number;
  maxSpan?: number;
  minValueSpan?: number;
  maxValueSpan?: number;
  throttle?: number | null;
  realtime?: boolean;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  width?: number | string;
  height?: number | string;
  [key: string]: unknown;
}

/**
 * XY zoom configuration. `true` enables the standard inside + X slider + Y
 * slider controls; use an object/array for fine-grained control.
 */
export type DataZoomConfig = boolean | DataZoomOptions | DataZoomOptions[];

export interface ToolboxDataZoomOptions {
  show?: boolean;
  type?: ('zoom' | 'back')[];
  /** Localized tooltip labels for the zoom and zoom-back buttons. */
  title?: ToolboxDataZoomTitle;
  filterMode?: 'filter' | 'weakFilter' | 'empty' | 'none';
  xAxisIndex?: number | number[];
  yAxisIndex?: number | number[];
  [key: string]: unknown;
}

/** ECharts toolbox dataZoom button labels. */
export interface ToolboxDataZoomTitle {
  zoom?: string;
  back?: string;
}

export interface ToolboxRestoreOptions {
  show?: boolean;
  title?: string;
  icon?: string;
  [key: string]: unknown;
}

export interface ToolboxFeatureOptions {
  dataZoom?: ToolboxDataZoomOptions;
  restore?: ToolboxRestoreOptions;
  [key: string]: unknown;
}

/** Typed subset of ECharts toolbox options useful for XY interactions. */
export interface ToolboxOptions {
  show?: boolean;
  orient?: 'horizontal' | 'vertical';
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  feature?: ToolboxFeatureOptions;
  [key: string]: unknown;
}

/** Structural type guard for {@link XYData}. */
export function isXYData(data: ChartData): data is XYData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'categories' in data &&
    'series' in data &&
    Array.isArray((data as XYData).series)
  );
}

// ---------------------------------------------------------------------------
// XYChartOptions — shared base for line / bar / area
// ---------------------------------------------------------------------------

/**
 * Shared options for XY-family charts (line, bar, area).
 *
 * Holds the fields every XY chart actually uses (axes, stacking, per-series
 * overrides, grid, legend) so the concrete per-chart subtypes only add their
 * own variant union and any chart-specific knobs.
 *
 * `grid` and `legend` live here — not on the base — because only XY charts
 * (and pie, separately) consult them. Gauge / sankey / chord ignore both.
 */
export interface XYChartOptions extends ChartOptions {
  stacked?: boolean;
  /**
   * Global ECharts animation switch for XY charts. When omitted, dense
   * explicit value-axis payloads automatically default to `false`.
   */
  animation?: boolean;
  xAxis?: AxisOptions;
  yAxis?: AxisOptions;
  /** Per-series overrides keyed by series name (or `'*'` for all). */
  series?: Record<string, SeriesOptions>;

  legend?: LegendOptions;
  grid?: GridOptions;
  /** Opt-in zoom controls, or `true` for the standard XY zoom setup. */
  dataZoom?: DataZoomConfig;
  /** Opt-in ECharts toolbox features for XY charts. */
  toolbox?: ToolboxOptions;
}
