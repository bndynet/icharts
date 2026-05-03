import type { ChartData, AnyChartOptions, IChartInstance } from './types.js';
import { IChart } from './core.js';

/**
 * Create a chart imperatively.
 *
 * `options` is typed as the {@link AnyChartOptions} union so a chart-specific
 * literal (e.g. `{ innerRadius: '50%' }` for pie, `{ gaugeWidth: 12 }` for
 * gauge) type-checks without forcing the caller to import the matching
 * subtype. Pass the concrete `XxxChartOptions` type for stricter validation.
 *
 * @example
 * ```ts
 * const chart = createChart(document.getElementById('app')!, 'line', {
 *   categories: ['Jan', 'Feb', 'Mar'],
 *   series: [{ name: 'Sales', data: [10, 20, 30] }],
 * });
 * chart.resize();
 * chart.dispose();
 * ```
 */
export function createChart(
  el: HTMLElement,
  type: string,
  data: ChartData,
  options: AnyChartOptions = {},
): IChartInstance {
  return new IChart(el, type, data, options);
}
