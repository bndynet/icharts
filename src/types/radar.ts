import type { ChartOptions } from './base.js';
import type { LegendOptions } from './shared.js';
import type { ChartData } from './instance.js';

export type RadarVariant = 'default' | 'circle';

/**
 * One axis of the radar chart. ECharts calls this an "indicator".
 *
 * `max` / `min` are optional — when omitted ECharts auto-scales each axis to
 * the data range. Provide them when you want consistent scales across
 * indicators (e.g. when comparing different metrics on the same chart).
 */
export interface RadarIndicator {
  name: string;
  max?: number;
  min?: number;
}

/**
 * One polygon drawn on the radar. `values[i]` is plotted on
 * `indicators[i]` — so the two arrays must line up by index and length.
 */
export interface RadarDataSeries {
  name: string;
  values: number[];
}

export interface RadarData {
  indicators: RadarIndicator[];
  series: RadarDataSeries[];
}

export function isRadarData(data: ChartData): data is RadarData {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  const d = data as Partial<RadarData>;
  return (
    Array.isArray(d.indicators) &&
    d.indicators.length > 0 &&
    typeof d.indicators[0]?.name === 'string' &&
    Array.isArray(d.series) &&
    d.series.length > 0 &&
    typeof d.series[0]?.name === 'string' &&
    Array.isArray(d.series[0]?.values)
  );
}

export interface RadarChartOptions extends ChartOptions {
  variant?: RadarVariant;
  /** Fill the polygon area for every series. Default: true. */
  filled?: boolean;
  /** Radar radius — same syntax as ECharts `radar.radius`. Default: '65%'. */
  radius?: string | number;
  /**
   * Radar is a non-XY chart that benefits from a legend (one entry per
   * polygon), so the field lives on this subtype rather than the base
   * {@link ChartOptions}.
   */
  legend?: LegendOptions;
}
