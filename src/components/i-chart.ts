import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import * as echarts from 'echarts';
import type { ChartData, ChartOptions, IChartInstance } from '../types.js';
import { resolveEChartsOption } from '../adapters/index.js';
import { ensureThemesRegistered, resolveThemeName } from '../themes/index.js';
import { applyChartColors } from '../utils.js';

/**
 * `<i-chart>` web component backed by ECharts.
 *
 * @example
 * ```html
 * <i-chart
 *   type="line"
 *   .data=${{ categories: ['A','B','C'], series: [{ name: 'S1', data: [1,2,3] }] }}
 *   .options=${{ title: 'My Chart' }}
 * ></i-chart>
 * ```
 */
@customElement('i-chart')
export class IChartElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .ichart-container {
      width: 100%;
      height: 100%;
    }
  `;

  @property({ type: String })
  type: string = 'line';

  @property({ type: Object })
  data: ChartData | null = null;

  @property({ type: Object })
  options: ChartOptions = {};

  private echartsInstance: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** Tracks the theme name used when the current instance was created. */
  private _activeTheme: string | undefined = undefined;

  override render() {
    return html`<div class="ichart-container"></div>`;
  }

  override firstUpdated(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.echartsInstance?.resize();
    });
    this.resizeObserver.observe(this);
    this.renderChart();
  }

  override updated(changed: PropertyValues): void {
    if (
      changed.has('type') ||
      changed.has('data') ||
      changed.has('options')
    ) {
      // Skip the very first update — handled by firstUpdated
      if (changed.has('type') && !changed.get('type') && this.echartsInstance === null) return;
      this.renderChart();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.echartsInstance?.dispose();
    this.echartsInstance = null;
  }

  /** Expose the underlying chart instance for advanced usage. */
  getChartInstance(): IChartInstance | null {
    if (!this.echartsInstance || !this.data) return null;

    const instance = this.echartsInstance;
    const { type, data, options } = this;

    return {
      update: (newData?: ChartData, newOptions?: ChartOptions) => {
        const d = newData ?? data;
        const o = newOptions ? { ...options, ...newOptions } : options;
        const eOption = resolveEChartsOption(type, d, o);
        applyChartColors(type, eOption, d, o);
        instance.setOption(eOption, true);
      },
      resize: () => instance.resize(),
      dispose: () => instance.dispose(),
      getEChartsInstance: () => instance,
    };
  }

  private renderChart(): void {
    if (!this.data) return;

    ensureThemesRegistered();

    const container = this.shadowRoot?.querySelector('.ichart-container') as HTMLElement | null;
    if (!container) return;

    const opts = this.options ?? {};
    const themeName = resolveThemeName(opts.theme);

    // ECharts bakes the theme into the instance at init() time — setOption()
    // cannot change structural colors (background, text, grid, axes) after the
    // fact.  Dispose and re-init whenever the active theme changes.
    if (this.echartsInstance && this._activeTheme !== themeName) {
      this.echartsInstance.dispose();
      this.echartsInstance = null;
    }

    if (!this.echartsInstance) {
      this._activeTheme = themeName;
      this.echartsInstance = echarts.init(container, themeName);
    }

    const eOption = resolveEChartsOption(this.type, this.data, opts);
    applyChartColors(this.type, eOption, this.data, opts);
    this.echartsInstance.setOption(eOption, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chart': IChartElement;
  }
}
