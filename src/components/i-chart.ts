import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ChartData, ChartOptions, IChartInstance } from '../types.js';
import { IChart } from '../core.js';

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

  private engine: IChart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  override render() {
    return html`<div class="ichart-container"></div>`;
  }

  override firstUpdated(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.engine?.resize();
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
      if (changed.has('type') && !changed.get('type') && this.engine === null) return;
      this.renderChart();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.engine?.dispose();
    this.engine = null;
  }

  /** Expose the underlying chart instance for advanced usage. */
  getChartInstance(): IChartInstance | null {
    return this.engine;
  }

  private renderChart(): void {
    if (!this.data) return;

    const container = this.shadowRoot?.querySelector(
      '.ichart-container',
    ) as HTMLElement | null;
    if (!container) return;

    if (!this.engine) {
      this.engine = new IChart(container, this.type, this.data, this.options);
    } else {
      this.engine.setType(this.type);
      this.engine.update(this.data, this.options);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chart': IChartElement;
  }
}
