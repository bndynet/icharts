/** @vitest-environment jsdom */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { ChartStatusOverlay } from './status-overlay.js';
import { configure, resetConfiguration } from './config.js';

describe('ChartStatusOverlay', () => {
  afterEach(() => {
    resetConfiguration();
  });

  it('renders default states accessibly and restores container positioning', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const overlay = new ChartStatusOverlay(container);

    overlay.setStatus({ type: 'loading' });
    expect(container.querySelector('.ichart-status-layer')?.getAttribute('role')).toBe('status');
    expect(container.textContent).toContain('Loading…');
    expect(container.style.position).toBe('relative');

    overlay.setStatus({ type: 'error', message: 'Could not load report' });
    expect(container.querySelector('.ichart-status-layer')?.getAttribute('role')).toBe('alert');
    expect(container.textContent).toContain('Could not load report');

    overlay.setStatus({ type: 'ready' });
    expect(container.querySelector('.ichart-status-layer')).toBeNull();
    expect(container.style.position).toBe('');
    overlay.dispose();
    container.remove();
  });

  it('mounts custom DOM and runs renderer cleanup on state changes and disposal', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const cleanup = vi.fn();
    const renderer = vi.fn((status, layer: HTMLElement) => {
      const view = document.createElement('section');
      view.dataset.view = status.type;
      const image = document.createElement('img');
      image.alt = 'Report unavailable';
      image.src = '/report-error.svg';
      const retry = document.createElement('button');
      retry.textContent = 'Retry';
      view.append(image, retry);
      layer.appendChild(view);
      return cleanup;
    });
    const overlay = new ChartStatusOverlay(container, renderer);

    overlay.setStatus({ type: 'error', message: 'Failed' });
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/report-error.svg');
    expect(container.querySelector('button')?.textContent).toBe('Retry');

    overlay.setStatus({ type: 'loading' });
    expect(cleanup).toHaveBeenCalledOnce();
    expect(renderer).toHaveBeenCalledTimes(2);

    overlay.dispose();
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.ichart-status-layer')).toBeNull();
    container.remove();
  });

  it('does not overwrite a container position already chosen by the app', () => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    document.body.appendChild(container);
    const overlay = new ChartStatusOverlay(container);

    overlay.setStatus({ type: 'empty' });
    overlay.setStatus({ type: 'ready' });

    expect(container.style.position).toBe('absolute');
    overlay.dispose();
    container.remove();
  });

  it('uses global fallback messages unless the chart status has its own message', () => {
    configure({ statusMessages: { loading: 'Loading all reports…' } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const overlay = new ChartStatusOverlay(container);

    overlay.setStatus({ type: 'loading' });
    expect(container.textContent).toContain('Loading all reports…');
    overlay.setStatus({ type: 'loading', message: 'Refreshing this chart…' });
    expect(container.textContent).toContain('Refreshing this chart…');

    overlay.dispose();
    container.remove();
  });
});
