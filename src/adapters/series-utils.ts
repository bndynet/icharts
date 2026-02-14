import type { XYData, ChartOptions, SeriesOptions } from '../types.js';

/**
 * Merge wildcard ('*') and per-series options into a single SeriesOptions.
 * Wildcard options apply to all series; named options override wildcards.
 */
export function getSeriesOpts(name: string, options: ChartOptions): SeriesOptions {
  const wildcard = options.series?.['*'] ?? {};
  const named = options.series?.[name] ?? {};
  return { ...wildcard, ...named };
}

/**
 * Count the number of distinct y-axes required by the series configuration.
 */
export function getYAxisCount(data: XYData, options: ChartOptions): number {
  let count = 1;
  if (options.series) {
    for (const s of data.series) {
      const so = getSeriesOpts(s.name, options);
      if (so.yAxisIndex !== undefined && so.yAxisIndex + 1 > count) {
        count = so.yAxisIndex + 1;
      }
    }
  }
  return count;
}

export function applyMarkLines(series: Record<string, unknown>, so: SeriesOptions): void {
  if (!so.markLines || so.markLines.length === 0) return;
  series.markLine = {
    data: so.markLines.map((type) => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
    })),
  };
}

export function applyMarkPoints(series: Record<string, unknown>, so: SeriesOptions): void {
  if (!so.markPoints || so.markPoints.length === 0) return;
  series.markPoint = {
    data: so.markPoints.map((type) => ({
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
    })),
  };
}
