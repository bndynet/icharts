import type { ChartData, ChartOptions, IChartInstance } from './types.js';
import { IChart } from './core.js';

/**
 * Create a chart imperatively.
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
  options: ChartOptions = {},
): IChartInstance {
  return new IChart(el, type, data, options);
}
