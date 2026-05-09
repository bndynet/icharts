import type { ChartOptions } from './base.js';
import type { LegendOptions } from './shared.js';
import type { ChartData } from './instance.js';

export type PieVariant = 'default' | 'doughnut' | 'half-doughnut' | 'nightingale';

export interface PieDataItem {
  name: string;
  value: number;
}

export type PieData = PieDataItem[];

export function isPieData(data: ChartData): data is PieData {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'name' in data[0] &&
    'value' in data[0]
  );
}

export interface PieChartOptions extends ChartOptions {
  variant?: PieVariant;
  innerRadius?: string | number;
  outerRadius?: string | number;
  /** When false, slices keep their data order; otherwise sorted by value desc. Default: true. */
  autoSort?: boolean;

  /**
   * Whether to render the outside slice labels (`{name}: {percent}%`
   * leader-line text). Defaults to `!showLegend` — when the legend is
   * shown it already names every slice and the outside labels would
   * duplicate it (and steal radius headroom). Set to `true` to force
   * them alongside a legend, or to `false` to hide them even when the
   * legend is hidden.
   */
  showSliceLabel?: boolean;

  // ---------------------------------------------------------------------------
  // Slice styling — pie chart's own options, flat on the subtype. Field names
  // are prefixed with `slice` so generic names like `borderRadius` / `gap` are
  // unambiguous at the top level.
  // ---------------------------------------------------------------------------

  /** Border radius of every slice in px. Maps to ECharts `series.itemStyle.borderRadius`. */
  sliceBorderRadius?: number;
  /** Border color of every slice. Maps to ECharts `series.itemStyle.borderColor`. */
  sliceBorderColor?: string;
  /** Gap between adjacent slices in degrees. Maps to ECharts `series.padAngle`. */
  sliceGap?: number;

  /**
   * Pie is the only non-XY chart that renders a legend, so the field lives
   * here rather than on the base {@link ChartOptions}. Gauge / sankey / chord
   * deliberately do not expose `legend`.
   */
  legend?: LegendOptions;
}
