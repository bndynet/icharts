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

/**
 * Merge a partial gauge update into the previous frame.
 *
 * - `value` is always taken from `patch`.
 * - `max` / `label` are kept from `prev` unless the key is present on
 *   `patch` (including explicit empty values — `label: ''` clears the
 *   caption; `max: undefined` drops a prior custom max so the adapter
 *   falls back to its default).
 */
export function mergeGaugeData(prev: GaugeData, patch: GaugeData): GaugeData {
  const merged: GaugeData = { value: patch.value };
  if ('max' in patch) {
    merged.max = patch.max;
  } else if (prev.max !== undefined) {
    merged.max = prev.max;
  }
  if ('label' in patch) {
    merged.label = patch.label;
  } else if (prev.label !== undefined) {
    merged.label = prev.label;
  }
  return merged;
}

export interface GaugeChartOptions extends ChartOptions {
  variant?: GaugeVariant;
  /** Arc thickness in px. Default: 18 (default variant) / 20 (percentage variant). */
  gaugeWidth?: number;
}
