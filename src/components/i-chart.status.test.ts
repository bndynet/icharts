/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IChartElement } from './i-chart.js';
import { configure, resetConfiguration } from '../config.js';

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe('<i-chart> status slots', () => {
  afterEach(() => {
    document.body.replaceChildren();
    resetConfiguration();
    vi.unstubAllGlobals();
  });

  it('shows a custom loading slot before the first data frame exists', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    if (!customElements.get('i-chart')) customElements.define('i-chart', IChartElement);
    const chart = document.createElement('i-chart') as IChartElement;
    chart.status = { type: 'loading', message: 'Loading report' };

    const customView = document.createElement('section');
    customView.slot = 'loading';
    customView.innerHTML = '<img src="/spinner.svg" alt="" /><strong>Loading report</strong>';
    chart.appendChild(customView);
    document.body.appendChild(chart);
    await chart.updateComplete;
    await Promise.resolve();

    const slot = chart.shadowRoot?.querySelector('slot[name="loading"]');
    expect(slot).toBeTruthy();
    expect(customView.assignedSlot).toBe(slot);
    expect(chart.getChartInstance()).toBeNull();
  });

  it('uses the configured global renderer before the first data frame exists', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    if (!customElements.get('i-chart')) customElements.define('i-chart', IChartElement);
    let renderCount = 0;
    const renderer = (_status: unknown, layer: HTMLElement) => {
      renderCount += 1;
      const icon = document.createElement('span');
      icon.textContent = 'Loading from app shell';
      layer.append(icon);
    };
    configure({ statusRenderer: renderer });
    const chart = document.createElement('i-chart') as IChartElement;
    chart.status = { type: 'loading', message: 'Loading report' };
    document.body.appendChild(chart);
    await chart.updateComplete;

    expect(renderCount).toBe(1);
    expect(chart.shadowRoot?.textContent).toContain('Loading from app shell');
    expect(chart.getChartInstance()).toBeNull();
  });

  it('keeps a matching named slot ahead of the global renderer', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    if (!customElements.get('i-chart')) customElements.define('i-chart', IChartElement);
    const renderer = vi.fn();
    configure({ statusRenderer: renderer });
    const chart = document.createElement('i-chart') as IChartElement;
    chart.status = { type: 'loading' };
    const customView = document.createElement('strong');
    customView.slot = 'loading';
    customView.textContent = 'Custom loading view';
    chart.append(customView);
    document.body.append(chart);
    await chart.updateComplete;

    expect(renderer).not.toHaveBeenCalled();
    expect(customView.assignedSlot?.getAttribute('name')).toBe('loading');
  });

  it('uses global fallback text before the first data frame without a custom renderer', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    if (!customElements.get('i-chart')) customElements.define('i-chart', IChartElement);
    configure({ statusMessages: { loading: '全局加载中…' } });
    const chart = document.createElement('i-chart') as IChartElement;
    chart.status = { type: 'loading' };
    document.body.append(chart);
    await chart.updateComplete;

    expect(chart.shadowRoot?.textContent).toContain('全局加载中…');
    chart.status = { type: 'loading', message: '单图加载文案' };
    await chart.updateComplete;
    expect(chart.shadowRoot?.textContent).toContain('单图加载文案');
  });
});
