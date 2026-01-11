import * as echarts from 'echarts';
import type { ChartData, ChartOptions, IChartInstance } from './types.js';
import { resolveEChartsOption } from './adapters/index.js';
import { ensureThemesRegistered, resolveThemeName } from './themes/index.js';
import { applyChartColors } from './utils.js';

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
  ensureThemesRegistered();

  const echartsInstance = echarts.init(el, resolveThemeName(options.theme));
  const { option, onInit } = resolveEChartsOption(type, data, options);

  applyChartColors(type, option, data, options);
  echartsInstance.setOption(option);
  onInit?.(echartsInstance);

  return {
    update(newData?: ChartData, newOptions?: ChartOptions) {
      const d = newData ?? data;
      const o = newOptions ? { ...options, ...newOptions } : options;
      const { option: updated } = resolveEChartsOption(type, d, o);
      applyChartColors(type, updated, d, o);
      echartsInstance.setOption(updated, true);
    },

    resize() {
      echartsInstance.resize();
    },

    dispose() {
      echartsInstance.dispose();
    },

    getEChartsInstance() {
      return echartsInstance;
    },
  };
}
