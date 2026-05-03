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
  xAxis?: AxisOptions;
  yAxis?: AxisOptions;
  /** Per-series overrides keyed by series name (or `'*'` for all). */
  series?: Record<string, SeriesOptions>;

  legend?: LegendOptions;
  grid?: GridOptions;
}
