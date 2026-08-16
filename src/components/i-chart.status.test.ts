/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IChartElement } from './i-chart.js';

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe('<i-chart> status slots', () => {
  afterEach(() => {
    document.body.replaceChildren();
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
});
