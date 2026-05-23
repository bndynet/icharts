import type { ChartOptions } from './base.js';
import type { ChartData } from './instance.js';
import {
  isGaugeData,
  mergeGaugeData,
  type GaugeData,
} from './gauge.js';

export type LiquidProgressVariant = 'default';

export type LiquidProgressData = GaugeData;

/**
 * Liquid progress data shape.
 *
 * Note: this is structurally identical to `GaugeData`.
 * The chart `type` string selects the adapter.
 */
export function isLiquidProgressData(data: ChartData): data is LiquidProgressData {
  return isGaugeData(data);
}

/**
 * Merge a partial liquid-progress update into the previous frame.
 *
 * - `value` is always taken from `patch`.
 * - `max` / `label` are kept from `prev` unless the key is present on
 *   `patch` (including explicit empty values — `label: ''` clears the
 *   caption; `max: undefined` drops a prior custom max so the adapter
 *   falls back to its default).
 */
export function mergeLiquidProgressData(
  prev: LiquidProgressData,
  patch: LiquidProgressData,
): LiquidProgressData {
  return mergeGaugeData(prev, patch);
}

export interface LiquidProgressChartOptions extends ChartOptions {
  variant?: LiquidProgressVariant;
  /**
   * Radius of the liquid container.
   * Accepts ECharts percent or px number. Default: `'70%'`.
   */
  radius?: string | number;
  /**
   * Wave count for the liquid fill.
   * Default: `3`.
   */
  waveCount?: number;
  /**
   * Border thickness around the liquid container in px.
   * Default: `2`.
   */
  borderWidth?: number;
}
