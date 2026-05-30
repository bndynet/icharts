import type {
  ChartData,
  AnyChartOptions,
  IChartInstance,
  ChartTypeRegistry,
  ChartDataFor,
  ChartOptionsFor,
} from './types.js';
import { IChart } from './core.js';

/**
 * Create a chart imperatively.
 *
 * The `type` argument drives full type inference: passing a registered type
 * literal (e.g. `'pie'`) narrows `data` to its data shape (`PieData`) and
 * `options` to its options shape (`PieChartOptions`, including the narrowed
 * `variant`), so mismatches are caught at compile time and editors offer
 * accurate completions. Passing an arbitrary `string` (dynamic type, or a
 * custom type not folded into {@link ChartTypeRegistry}) falls back to the
 * broad {@link ChartData} / {@link AnyChartOptions} unions.
 *
 * Custom chart types registered via `registerAdapter` become first-class by
 * augmenting {@link ChartTypeRegistry} via declaration merging — see its
 * docs for the pattern.
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
export function createChart<T extends keyof ChartTypeRegistry | (string & {})>(
  el: HTMLElement,
  type: T,
  data: ChartDataFor<T>,
  options: ChartOptionsFor<T> = {} as ChartOptionsFor<T>,
): IChartInstance<T> {
  return new IChart(
    el,
    type,
    data as ChartData,
    options as AnyChartOptions,
  ) as unknown as IChartInstance<T>;
}
