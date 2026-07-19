import type { ChartOptions } from './base.js';
import type { HeatmapVisualMapOptions } from './heatmap.js';
// Type-only import — runtime is erased, no circular dependency at load time.
import type { ChartData } from './instance.js';

// ---------------------------------------------------------------------------
// Calendar heatmap data shape
// ---------------------------------------------------------------------------

/**
 * A single calendar heatmap cell — one value for a given date.
 *
 * `date` is any dayjs/date-parseable string (use `YYYY-MM-DD` for clarity);
 * `value` drives the visualMap color and the tooltip magnitude.
 */
export interface CalendarHeatmapCell {
  date: string;
  value: number;
}

/**
 * Calendar heatmap data — a flat list of `(date → value)` entries rendered
 * as a GitHub-contribution-style calendar grid.
 */
export type CalendarHeatmapData = CalendarHeatmapCell[];

/** Structural type guard for {@link CalendarHeatmapData}. */
export function isCalendarHeatmapData(
  data: ChartData,
): data is CalendarHeatmapData {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'date' in data[0] &&
    'value' in data[0]
  );
}

// ---------------------------------------------------------------------------
// CalendarHeatmapChartOptions
// ---------------------------------------------------------------------------

/**
 * Calendar-heatmap-specific options.
 *
 * Unlike the cartesian `heatmap` chart, the calendar heatmap has a single
 * date dimension rendered on ECharts' `calendar` coordinate system, so it is
 * its own chart type (`calendarheatmap`) with its own data shape.
 */
export interface CalendarHeatmapChartOptions extends ChartOptions {
  /**
   * Calendar range. A year (number or `'YYYY'`), or an explicit
   * `[startDate, endDate]` pair. Default: the year of the earliest date in
   * the data (or the `[min, max]` span when the data crosses years).
   */
  range?: number | string | [string, string];
  /**
   * Cell size in px — a number (square cells) or `[width, height]`, where
   * the width may be `'auto'` to fill the available width. Default:
   * `['auto', 18]`.
   */
  cellSize?: number | [number | 'auto', number];
  /** Calendar orientation. Default: `'horizontal'` (weeks as columns). */
  orient?: 'horizontal' | 'vertical';
  /** Weekday label config. */
  dayLabel?: {
    /** First day of week: 0 = Sunday … 6 = Saturday. Default: `1` (Monday). */
    firstDay?: number;
    /** Show weekday labels. Default: `true`. */
    show?: boolean;
  };
  /** Month label config. */
  monthLabel?: {
    /** Show month labels. Default: `true`. */
    show?: boolean;
    /** Month name map (`'en'`, `'cn'`, or a 12-entry custom array). */
    nameMap?: string | string[];
  };
  /** Show the year label. Default: `true`. */
  showYearLabel?: boolean;
  /** visualMap config — same shape as the cartesian heatmap (defaults to horizontal). */
  visualMap?: HeatmapVisualMapOptions;
}
