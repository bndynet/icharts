import type { XYChartOptions, XYData } from './xy.js';

export type LineVariant = 'default' | 'spark';

/**
 * Line, bar, and area share the same runtime shape ({@link XYData}). Each
 * chart still gets its own named alias so adapters and call sites can declare
 * intent explicitly, matching the per-chart `*ChartOptions` convention.
 */
export type LineData = XYData;

export interface LineChartOptions extends XYChartOptions {
  variant?: LineVariant;
}
