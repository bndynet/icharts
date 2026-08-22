import type { ChartStatus, ChartStatusRenderer } from './types.js';
import { getConfig } from './config.js';

/** Owns the DOM layer used to render non-ready chart states. */
export class ChartStatusOverlay {
  private readonly container: HTMLElement;
  private readonly layer: HTMLElement | null;
  private renderer: ChartStatusRenderer | undefined;
  private cleanup: (() => void) | null = null;
  private status: ChartStatus = { type: 'ready' };
  private changedPosition = false;
  private previousPosition = '';
  private previousPositionPriority = '';

  constructor(container: HTMLElement, renderer?: ChartStatusRenderer) {
    this.container = container;
    this.renderer = renderer;
    // Keep this module safe to import from the SSR-safe entry. The constructor
    // is only used when a browser chart instance is created.
    this.layer = container.ownerDocument?.createElement('div') ?? null;
    if (this.layer) {
      this.layer.className = 'ichart-status-layer';
      Object.assign(this.layer.style, {
        position: 'absolute',
        inset: '0',
        zIndex: '10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: '16px',
        textAlign: 'center',
        color: 'var(--ichart-status-color, CanvasText)',
        background: 'var(--ichart-status-background, color-mix(in srgb, Canvas 84%, transparent))',
        backdropFilter: 'blur(1px)',
        pointerEvents: 'auto',
      });
      this.layer.setAttribute('aria-live', 'polite');
    }
  }

  setRenderer(renderer?: ChartStatusRenderer): void {
    this.renderer = renderer;
    if (this.status.type !== 'ready') this.render();
  }

  setStatus(status: ChartStatus): void {
    this.status = status;
    if (status.type === 'ready') {
      this.clear();
      return;
    }
    this.prepareLayer();
    this.render();
  }

  getStatus(): ChartStatus {
    return this.status;
  }

  dispose(): void {
    this.clear();
    this.restorePosition();
    this.layer?.remove();
  }

  private prepareLayer(): void {
    const layer = this.layer;
    if (!layer) return;

    if (!layer.isConnected) this.container.appendChild(layer);
    const view = this.container.ownerDocument?.defaultView;
    const computedPosition = view?.getComputedStyle(this.container).position;
    if ((!computedPosition || computedPosition === 'static') && !this.changedPosition) {
      this.previousPosition = this.container.style.getPropertyValue('position');
      this.previousPositionPriority = this.container.style.getPropertyPriority('position');
      this.container.style.setProperty('position', 'relative');
      this.changedPosition = true;
    }
  }

  private render(): void {
    const layer = this.layer;
    if (!layer || this.status.type === 'ready') return;

    this.runCleanup();
    layer.replaceChildren();
    layer.setAttribute('role', this.status.type === 'error' ? 'alert' : 'status');
    layer.dataset.status = this.status.type;

    if (this.renderer) {
      try {
        const cleanup = this.renderer(this.status, layer);
        this.cleanup = typeof cleanup === 'function' ? cleanup : null;
        return;
      } catch {
        // A presentation callback must not break chart updates. Fall back to
        // the built-in view so the status remains visible.
        layer.replaceChildren();
      }
    }

    this.renderDefault(layer, this.status);
  }

  private renderDefault(
    layer: HTMLElement,
    status: Exclude<ChartStatus, { type: 'ready' }>,
  ): void {
    const content = layer.ownerDocument.createElement('div');
    content.className = 'ichart-status-content';
    Object.assign(content.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      maxWidth: '100%',
    });

    if (status.type === 'loading') {
      const spinner = layer.ownerDocument.createElement('span');
      spinner.setAttribute('aria-hidden', 'true');
      Object.assign(spinner.style, {
        width: '22px',
        height: '22px',
        boxSizing: 'border-box',
        border: '2px solid currentColor',
        borderRightColor: 'transparent',
        borderRadius: '50%',
        animation: 'ichart-status-spin 0.8s linear infinite',
      });
      content.appendChild(spinner);
    }

    const message = layer.ownerDocument.createElement('span');
    const configuredMessage = getConfig().statusMessages?.[status.type];
    message.textContent =
      status.message ??
      configuredMessage ??
      (status.type === 'loading'
        ? 'Loading…'
        : status.type === 'empty'
          ? 'No data available'
          : 'Unable to load chart');
    content.appendChild(message);
    layer.appendChild(content);

    const style = layer.ownerDocument.createElement('style');
    style.textContent = '@keyframes ichart-status-spin { to { transform: rotate(360deg); } }';
    layer.appendChild(style);
  }

  private clear(): void {
    this.runCleanup();
    this.layer?.remove();
    this.restorePosition();
  }

  private runCleanup(): void {
    const cleanup = this.cleanup;
    this.cleanup = null;
    try {
      cleanup?.();
    } catch {
      // Ignore user cleanup errors during a status transition or disposal.
    }
  }

  private restorePosition(): void {
    if (!this.changedPosition) return;
    if (this.container.style.getPropertyValue('position') === 'relative') {
      if (this.previousPosition) {
        this.container.style.setProperty(
          'position',
          this.previousPosition,
          this.previousPositionPriority,
        );
      } else {
        this.container.style.removeProperty('position');
      }
    }
    this.changedPosition = false;
  }
}
