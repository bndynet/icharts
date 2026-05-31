import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';

export interface MapDataItem {
  /** Region name, matched against the registered map feature name. */
  name: string;
  /** Scalar value used by visualMap and tooltip display. */
  value: number;
  /**
   * Per-region fixed color override.
   * When provided, wins over palette / colorMap resolution.
   */
  color?: string;
}

/**
 * Map data set — one value per named region.
 */
export type MapData = MapDataItem[];

/**
 * Structural type guard for map data.
 */
export function isMapData(data: ChartData): data is MapData {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'name' in data[0] &&
    'value' in data[0]
  );
}

export interface MapVisualMapOptions {
  /** Show visualMap component. */
  show?: boolean;
  /** Explicit minimum for the visual domain. Default: data minimum. */
  min?: number;
  /** Explicit maximum for the visual domain. Default: data maximum. */
  max?: number;
  /** visualMap orientation. Default: `'vertical'`. */
  orient?: 'horizontal' | 'vertical';
  /** visualMap x-position. Default: `left: 'right'`. */
  left?: string | number;
  /** visualMap y-position. Default: `bottom: 12`. */
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
   * Explicit color ramp for continuous visualMap.
   *
   * Default (when omitted):
   * - two-stop ramp based on the library's normal map color resolution
   *   (`resolveColors`):
   *   - low stop: base color blended over theme `surface` at 20%
   *   - high stop: base color (100%)
   */
  inRangeColors?: string[];
}

export interface MapChartOptions extends ChartOptions {
  /**
   * Registered map resource name (must be pre-registered via `registerMap`).
   */
  mapName: string;
  /**
   * Name field in GeoJSON feature properties. Default: `'name'`.
   */
  nameProperty?: string;
  /** Show region labels. Default: `false`. */
  showLabel?: boolean;
  /**
   * Automatically hide region labels that cannot fit inside their region box.
   *
   * When enabled, the adapter wires a `labelLayout` callback that compares
   * ECharts' computed region rect and label rect, then hides labels whose
   * width/height exceed the region bounds. It also hides labels for regions
   * without a usable numeric value (`NaN` / missing).
   *
   * Default: `false`.
   */
  autoHideOverflowLabel?: boolean;
  /**
   * Map interaction mode.
   * - `false` (default): static map
   * - `true`: pan + zoom
   * - `'move'`: pan only
   * - `'scale'`: zoom only
   */
  roam?: boolean | 'move' | 'scale';
  /**
   * Center point `[lng, lat]`.
   * Requires map data with a geographic coordinate system.
   */
  center?: [number, number];
  /**
   * Initial zoom level. Default follows ECharts map series default.
   */
  zoom?: number;
  /**
   * visualMap config for choropleth coloring.
   * When omitted, the adapter auto-enables visualMap if map data has numeric values.
   * Set `visualMap: { show: false }` for a plain single-color map.
   */
  visualMap?: MapVisualMapOptions;
}
