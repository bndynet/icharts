import type { XYChartOptions, XYData } from './xy.js';

export type BarVariant = 'default' | 'horizontal' | 'spark' | 'race';

export type BarData = XYData;

/**
 * Options for the bar `race` variant.
 *
 * Kept as a separate named type — not flattened — because these fields only
 * apply when `variant === 'race'`. Bar chart's own general options (sizing,
 * `colorByCategory`) live flat on {@link BarChartOptions}.
 *
 * The library renders a single frame per call; the consumer drives the
 * animation by calling `chart.update(nextFrame)` on their own interval.
 * Each frame is a regular {@link BarData} whose `categories` (racer names)
 * must stay stable across frames — only `series[0].data` (values) changes.
 */
export interface BarRaceOptions {
  /**
   * Show only the top N racers. Maps to `yAxis.max = topN - 1`.
   * Omit to show every racer in the dataset.
   */
  topN?: number;
  /**
   * Transition duration (ms) between consecutive frames. Should match the
   * interval at which the consumer calls `chart.update(frame)`.
   * Default: 3000.
   */
  frameDuration?: number;
  /**
   * Show an animated value label at the end of each bar. Default: true.
   */
  showValueLabel?: boolean;
}

export interface BarChartOptions extends XYChartOptions {
  variant?: BarVariant;

  // ---------------------------------------------------------------------------
  // Bar chart's own general options — flat on the subtype because the field
  // names already carry the `bar` prefix and the values apply to every variant.
  // ---------------------------------------------------------------------------

  /** Bar thickness, e.g. `24` or `'60%'`. Maps to ECharts `series.barWidth`. */
  barWidth?: number | string;
  /** Cap on bar thickness. Maps to ECharts `series.barMaxWidth`. */
  barMaxWidth?: number | string;
  /** Floor on bar thickness. Maps to ECharts `series.barMinWidth`. */
  barMinWidth?: number | string;
  /**
   * Gap between bars of different series at the same category, e.g. `'30%'`
   * or a px number. Negative values overlap. Maps to ECharts `series.barGap`.
   */
  barGap?: number | string;
  /**
   * Gap between bar groups at adjacent categories, e.g. `'20%'`.
   * Maps to ECharts `series.barCategoryGap`.
   */
  barCategoryGap?: number | string;
  /**
   * Color each bar by its category name (or per racer in the `race` variant)
   * using the same name → color pipeline as series colors (`colorMap` → theme
   * palette → `consistentColors`). Default: `false`.
   *
   * When `true`, the legend is forced hidden because the legend marker would
   * keep showing the series's default color and conflict with the per-bar
   * coloring shown in the plot.
   *
   * Best suited for single-series bar charts and the `race` variant. Silently
   * ignored when `stacked: true` or when the chart has more than one series.
   */
  colorByCategory?: boolean;

  /**
   * Bar `race` variant options. Only consulted when `variant === 'race'`.
   * Kept as a sub-object because the fields are variant-specific.
   * See {@link BarRaceOptions}.
   */
  race?: BarRaceOptions;
}
