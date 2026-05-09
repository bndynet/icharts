import type { XYChartOptions, XYData } from './xy.js';

export type LineVariant = 'default' | 'spark' | 'race';

/**
 * Line, bar, and area share the same runtime shape ({@link XYData}). Each
 * chart still gets its own named alias so adapters and call sites can declare
 * intent explicitly, matching the per-chart `*ChartOptions` convention.
 */
export type LineData = XYData;

/**
 * Options for the line `race` variant.
 *
 * Kept as a separate named type — not flattened — because these fields only
 * apply when `variant === 'race'`.
 *
 * The library renders a single frame per call; the consumer drives the
 * animation by calling `chart.update(nextFrame)` on their own interval.
 * Each frame is a regular {@link LineData} whose `series` names must stay
 * stable across frames (ECharts diffs series by name to animate the
 * transition). Each frame typically extends `categories` and each series
 * `data` by one more point, but any monotonically-growing shape works.
 */
export interface LineRaceOptions {
  /**
   * Transition duration (ms) between consecutive frames.
   *
   * Leave unset — the library auto-measures the interval between your
   * `chart.update(frame)` calls and uses that as the animation duration
   * (clamped to [80, 3000] ms). Pass an explicit value only to override
   * the measured cadence (e.g. to deliberately slow down a fast stream
   * for readability).
   *
   * Default for the very first transition (no prior tick to measure): 500ms.
   */
  frameDuration?: number;
  /**
   * Show an animated end-of-line label that tracks each series's latest
   * value (uses ECharts `series.endLabel` + `valueAnimation`).
   * Default: true.
   */
  showValueLabel?: boolean;
}

export interface LineChartOptions extends XYChartOptions {
  variant?: LineVariant;

  /**
   * Line `race` variant options. Only consulted when `variant === 'race'`.
   * Kept as a sub-object because the fields are variant-specific.
   * See {@link LineRaceOptions}.
   */
  race?: LineRaceOptions;
}
