import * as echarts from 'echarts';
import type { ChartData, ChartOptions, IChartInstance } from './types.js';
import { resolveEChartsOption } from './adapters/index.js';
import { ensureThemesRegistered, resolveThemeName } from './themes/index.js';
import { applyChartColors } from './utils.js';
import { chartRegistry } from './registry.js';

/**
 * Core chart engine that manages an ECharts instance and provides the
 * full {@link IChartInstance} contract.  Used by both the `<i-chart>`
 * web component and the imperative `createChart` helper.
 */
export class IChart implements IChartInstance {
  private ecInstance: echarts.ECharts;
  private _type: string;
  private _data: ChartData;
  private _options: ChartOptions;
  private _activeTheme: string;

  constructor(
    container: HTMLElement,
    type: string,
    data: ChartData,
    options: ChartOptions = {},
  ) {
    ensureThemesRegistered();
    this._type = type;
    this._data = data;
    this._options = options;
    this._activeTheme = resolveThemeName(options.theme);
    this.ecInstance = echarts.init(container, this._activeTheme);
    chartRegistry.add(this);
    this._apply();
  }

  update(newData?: ChartData, newOptions?: ChartOptions): void {
    if (newData !== undefined) this._data = newData;
    if (newOptions) this._options = { ...this._options, ...newOptions };
    this._apply();
  }

  setTheme(theme: string): void {
    this._options = { ...this._options, theme };
    const name = resolveThemeName(theme);
    if (this._activeTheme !== name) {
      this._activeTheme = name;
      this.ecInstance.setTheme(name);
    }
    this._apply();
  }

  resize(): void {
    this.ecInstance.resize();
  }

  dispose(): void {
    chartRegistry.delete(this);
    this.ecInstance.dispose();
  }

  getEChartsInstance(): echarts.ECharts {
    return this.ecInstance;
  }

  /** Change the chart type (used by the web component when the `type` property changes). */
  setType(type: string): void {
    this._type = type;
  }

  private _apply(): void {
    const { option, onInit } = resolveEChartsOption(
      this._type,
      this._data,
      this._options,
    );
    applyChartColors(this._type, option, this._data, this._options);
    this.ecInstance.setOption(option, true);
    onInit?.(this.ecInstance);
  }
}
