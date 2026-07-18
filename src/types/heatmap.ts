import type { ChartOptions } from './base.js';
import type { AxisOptions, GridOptions } from './shared.js';
// Type-only import — runtime is erased, no circular dependency at load time.
import type { ChartData } from './instance.js';

// ---------------------------------------------------------------------------
// Heatmap data shape
// ---------------------------------------------------------------------------

/**
 * A single heatmap cell.
 *
 * `x` / `y` reference the cell's position along each category axis. They
 * accept either a zero-based index into {@link HeatmapData.xCategories} /
 * {@link HeatmapData.yCategories}, or the category label itself. `value`
 * drives the visualMap color (and the tooltip magnitude).
 */
export interface HeatmapCell {
  x: number | string;
  y: number | string;
  value: number;
}

/**
 * Heatmap data — a grid of cells defined by two category axes.
 *
 * `xCategories` labels the x-axis, `yCategories` labels the y-axis, and
 * `data` holds one entry per (x, y) cell. Cells may be sparse — a missing
 * (x, y) pair simply renders as an empty slot.
 */
export interface HeatmapData {
  xCategories: (string | number)[];
  yCategories: (string | number)[];
  data: HeatmapCell[];
}

/** Structural type guard for {@link HeatmapData}. */
export function isHeatmapData(data: ChartData): data is HeatmapData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'xCategories' in data &&
    'yCategories' in data &&
    'data' in data &&
    Array.isArray((data as HeatmapData).xCategories) &&
    Array.isArray((data as HeatmapData).yCategories) &&
    Array.isArray((data as HeatmapData).data)
  );
}

// ---------------------------------------------------------------------------
// HeatmapChartOptions
// ---------------------------------------------------------------------------

/**
 * visualMap config for heatmap cell coloring.
 *
 * When omitted, the adapter auto-enables a continuous visualMap using the
 * data's value range. Set `visualMap: { show: false }` to color every cell
 * with a single palette color instead.
 */
export interface HeatmapVisualMapOptions {
  /** Show the visualMap component. Default: auto (true when cells have numeric values). */
  show?: boolean;
  /** Explicit minimum for the visual domain. Default: data minimum. */
  min?: number;
  /** Explicit maximum for the visual domain. Default: data maximum. */
  max?: number;
  /** visualMap orientation. Default: `'vertical'`. */
  orient?: 'horizontal' | 'vertical';
  /**
   * The color bar's width in px.
   * - `orient: 'horizontal'`: the bar's length. Default: `120`.
   * - `orient: 'vertical'`: the bar's thickness. Default: `10`.
   */
  width?: number;
  /** visualMap x-position. Default: `left: 'right'` (vertical) / `left: 'center'` (horizontal). */
  left?: string | number;
  /** visualMap x-position (alternative to `left`). */
  right?: string | number;
  /** visualMap y-position. Default: `bottom: 12` (vertical) / `bottom: 8` (horizontal). */
  top?: string | number;
  /** visualMap y-position (alternative to `top`). */
  bottom?: string | number;
  /** Number formatter for visualMap labels. */
  formatter?: string | ((value: number) => string);
  /** Piecewise visualMap bins. Default is continuous mode. */
  pieces?: Array<{
    min?: number;
    max?: number;
    label?: string;
    color?: string;
  }>;
  /** Precision used by continuous visualMap labels. */
  precision?: number;
  /**
   * Text labels shown at the two ends of the color bar. Default:
   * auto-formatted min/max values (ordered to match orientation).
   */
  text?: [string | null, string | null];
  /**
   * Explicit color ramp for continuous visualMap. Default: a two-stop ramp
   * derived from the library's color resolution (low stop blends the base
   * color over the theme `surface` at 20%; high stop is the base color).
   */
  inRangeColors?: string[];
}

/**
 * Heatmap-chart-specific options.
 *
 * Heatmap is a cartesian (grid) chart, but its data shape is a cell grid
 * rather than `XYData`, so it extends the base {@link ChartOptions} directly
 * and carries its own axis / grid / visualMap knobs (same precedent as
 * `MapChartOptions`).
 */
export interface HeatmapChartOptions extends ChartOptions {
  xAxis?: AxisOptions;
  yAxis?: AxisOptions;
  grid?: GridOptions;
  /** Show the cell value label. Default: `false`. */
  showCellLabel?: boolean;
  /** Width of the cell border stroke in px. Default: `1`. Border color follows the theme. */
  cellBorderWidth?: number;
  visualMap?: HeatmapVisualMapOptions;
}
