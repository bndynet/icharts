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

/** Per-slice styling. Lives at `PieChartOptions.slice`. */
export interface PieSliceOptions {
  borderRadius?: number;
  borderColor?: string;
  gap?: number;
}

export interface PieChartOptions extends ChartOptions {
  variant?: PieVariant;
  innerRadius?: string | number;
  outerRadius?: string | number;
  /** When false, slices keep their data order; otherwise sorted by value desc. Default: true. */
  autoSort?: boolean;
  slice?: PieSliceOptions;
  /**
   * Pie is the only non-XY chart that renders a legend, so the field lives
   * here rather than on the base {@link ChartOptions}. Gauge / sankey / chord
   * deliberately do not expose `legend`.
   */
  legend?: LegendOptions;
}
