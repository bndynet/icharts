import { LitElement, html, css, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import type {
  ChartData,
  AnyChartOptions,
  IChartInstance,
  ChartStatus,
} from '../types.js';
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
export class IChartElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .ichart-container {
      width: 100%;
      height: 100%;
    }
    .ichart-status-layer {
      position: absolute;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      padding: 16px;
      text-align: center;
      color: var(--ichart-status-color, CanvasText);
      background: var(--ichart-status-background, color-mix(in srgb, Canvas 84%, transparent));
      backdrop-filter: blur(1px);
    }
    .ichart-status-layer[hidden] {
      display: none;
    }
    .ichart-status-view {
      display: none;
      pointer-events: auto;
    }
    .ichart-status-layer[data-status='loading'] [data-view='loading'],
    .ichart-status-layer[data-status='empty'] [data-view='empty'],
    .ichart-status-layer[data-status='error'] [data-view='error'] {
      display: block;
    }
    .ichart-status-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .ichart-status-spinner {
      width: 22px;
      height: 22px;
      box-sizing: border-box;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: ichart-status-spin 0.8s linear infinite;
    }
    @keyframes ichart-status-spin {
      to { transform: rotate(360deg); }
    }
  `;

  @property({ type: String })
  type: string = 'line';

  @property({ type: Object })
  data: ChartData | null = null;

  @property({ type: Object })
  options: AnyChartOptions = {};

  /** Set the loading / empty / error display. Named slots can replace each view. */
  @property({ attribute: false })
  status: ChartStatus | null = null;

  @state()
  private engineStatus: ChartStatus = { type: 'ready' };
  private hasEngineStatus = false;

  private engine: IChart | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private statusContainer: HTMLElement | null = null;
  private readonly statusChangeListener = (event: Event): void => {
    this.engineStatus = (event as CustomEvent<ChartStatus>).detail;
    this.hasEngineStatus = true;
  };

  override render() {
    const status = this.currentStatus();
    const customRenderer = Boolean(this.options.statusRenderer);
    const hidden = status.type === 'ready' || customRenderer;
    return html`
      <div class="ichart-container"></div>
      <div
        class="ichart-status-layer"
        data-status=${status.type}
        role=${status.type === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        ?hidden=${hidden}
      >
        <div class="ichart-status-view" data-view="loading">
          <slot name="loading">
            <div class="ichart-status-fallback">
              <span class="ichart-status-spinner" aria-hidden="true"></span>
              <span>${status.type === 'loading' ? status.message ?? 'Loading…' : 'Loading…'}</span>
            </div>
          </slot>
        </div>
        <div class="ichart-status-view" data-view="empty">
          <slot name="empty">
            <div class="ichart-status-fallback">
              <span>${status.type === 'empty' ? status.message ?? 'No data available' : 'No data available'}</span>
            </div>
          </slot>
        </div>
        <div class="ichart-status-view" data-view="error">
          <slot name="error">
            <div class="ichart-status-fallback">
              <span>${status.type === 'error' ? status.message ?? 'Unable to load chart' : 'Unable to load chart'}</span>
            </div>
          </slot>
        </div>
      </div>
    `;
  }

  override firstUpdated(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.engine?.resize();
    });
    this.resizeObserver.observe(this);
    this.renderChart(true);
  }

  override updated(changed: PropertyValues): void {
    if (
      changed.has('type') ||
      changed.has('data') ||
      changed.has('options')
    ) {
      // Skip the very first update — handled by firstUpdated
      if (changed.has('type') && !changed.get('type') && this.engine === null) return;
      this.renderChart(changed.has('options'));
    }
    if (changed.has('status')) {
      const status = this.currentStatus();
      this.engine?.setStatus(status);
      this.engineStatus = status;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.statusContainer?.removeEventListener('ichartstatuschange', this.statusChangeListener);
    this.statusContainer = null;
    this.engine?.dispose();
    this.engine = null;
  }

  /** Expose the underlying chart instance for advanced usage. */
  getChartInstance(): IChartInstance | null {
    return this.engine;
  }

  private renderChart(optionsChanged: boolean): void {
    const container = this.shadowRoot?.querySelector(
      '.ichart-container',
    ) as HTMLElement | null;
    if (!container) return;
    this.bindStatusListener(container);

    if (!this.data) {
      const status = this.currentStatus();
      this.engine?.setStatus(status);
      this.engineStatus = status;
      return;
    }

    if (!this.engine) {
      this.engine = new IChart(container, this.type, this.data, this.optionsWithStatusRenderer());
      this.engine.setStatus(this.currentStatus());
    } else {
      this.engine.setType(this.type);
      this.engine.update(
        this.data,
        optionsChanged ? this.optionsWithStatusRenderer() : undefined,
      );
      this.engine.setStatus(this.currentStatus());
    }
  }

  private currentStatus(): ChartStatus {
    if (this.status) return this.status;
    if (this.hasEngineStatus) return this.engineStatus;
    return this.options.status ?? this.engineStatus;
  }

  private bindStatusListener(container: HTMLElement): void {
    if (this.statusContainer === container) return;
    this.statusContainer?.removeEventListener('ichartstatuschange', this.statusChangeListener);
    this.statusContainer = container;
    this.statusContainer.addEventListener('ichartstatuschange', this.statusChangeListener);
  }

  private optionsWithStatusRenderer(): AnyChartOptions {
    if (this.options.statusRenderer) return this.options;
    return {
      ...this.options,
      statusRenderer: (_status, layer) => {
        // The Web Component renders its named slots in Lit's static template;
        // keep the imperative overlay hidden while still using the shared
        // instance state/event lifecycle.
        layer.style.display = 'none';
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chart': IChartElement;
  }
}

// Register the custom element only when a `customElements` registry is
// available (browsers, jsdom, Lit's `@lit-labs/ssr-dom-shim`). In pure
// Node SSR runtimes without the shim, this is a deliberate no-op so
// `import '@bndynet/icharts'` doesn't throw — the chart is created
// client-side via `createChart()` / mounting `<i-chart>` regardless.
// The `customElements.get('i-chart')` check also handles HMR /
// multi-bundle scenarios where the tag may already be registered.
if (
  typeof customElements !== 'undefined' &&
  !customElements.get('i-chart')
) {
  customElements.define('i-chart', IChartElement);
}
