import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';

export type GaugeVariant = 'default' | 'percentage';

export interface GaugeData {
  value: number;
  max?: number;
  label?: string;
}

export function isGaugeData(data: ChartData): data is GaugeData {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'value' in data &&
    !('categories' in data) &&
    !('nodes' in data)
  );
}

export interface GaugeChartOptions extends ChartOptions {
  variant?: GaugeVariant;
  /** Arc thickness in px. Default: 18 (default variant) / 20 (percentage variant). */
  gaugeWidth?: number;
}
