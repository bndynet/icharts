// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { LegendSelectionController } from './legend-selection.js';
import type { LineChartOptions } from './types.js';

function setup(options: LineChartOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const controller = new LegendSelectionController(container, options);
  const option: Record<string, unknown> = {
    legend: { show: true, data: ['Revenue', 'Expenses'], selected: { Expenses: false } },
    color: ['red', 'blue'],
  };
  controller.prepare(option, options);
  controller.render(options);
  return { container, controller, option };
}

describe('independent legend selection', () => {
  it('defaults to multiple, keeps data visible, and retains clicks across redraws', () => {
    const onChange = vi.fn();
    const options: LineChartOptions = {
      legend: { selection: { selected: ['Revenue'], onChange } },
    };
    const { container, controller, option } = setup(options);
    const buttons = container.querySelectorAll('button');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[0].style.background).not.toBe('transparent');
    expect(buttons[1].style.background).toBe('transparent');
    buttons[1].click();
    expect([...container.querySelectorAll('button')].map((item) => item.getAttribute('aria-pressed')))
      .toEqual(['true', 'true']);
    expect(container.querySelectorAll('button')[1].style.background).not.toBe('transparent');
    expect(onChange).toHaveBeenCalledWith({
      name: 'Expenses', active: true, selected: ['Revenue', 'Expenses'],
    });
    expect(option.legend).toMatchObject({
      show: false, selectedMode: false, selected: { Revenue: true, Expenses: true },
    });

    const next = { legend: { show: true, data: ['Revenue', 'Expenses', 'Profit'] } };
    controller.prepare(next, options);
    controller.render(options);
    expect([...container.querySelectorAll('button')].map((item) => item.getAttribute('aria-pressed')))
      .toEqual(['true', 'true', 'false']);
    controller.dispose();
    expect(container.querySelector('button')).toBeNull();
    container.remove();
  });

  it('single mode moves or clears the highlight and explicit selected resets it', () => {
    const options: LineChartOptions = {
      legend: { selection: { mode: 'single', selected: ['Revenue'] } },
    };
    const { container, controller } = setup(options);
    container.querySelectorAll('button')[1].click();
    expect([...container.querySelectorAll('button')].map((item) => item.getAttribute('aria-pressed')))
      .toEqual(['false', 'true']);
    container.querySelectorAll('button')[1].click();
    expect([...container.querySelectorAll('button')].map((item) => item.getAttribute('aria-pressed')))
      .toEqual(['false', 'false']);

    const reset: LineChartOptions = {
      legend: { selection: { mode: 'single', selected: ['Revenue'] } },
    };
    controller.setExplicitSelected(reset);
    controller.prepare({ legend: { show: true, data: ['Revenue', 'Expenses'] } }, reset);
    controller.render(reset);
    expect(container.querySelector('button')?.getAttribute('aria-pressed')).toBe('true');
    controller.dispose();
    container.remove();
  });

  it('keeps slice swatches paired with names when data order differs from legend order', () => {
    const options: LineChartOptions = { legend: { selection: {} } };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = new LegendSelectionController(container, options);
    const option = {
      legend: { show: true, data: ['A', 'B'] },
      color: ['red', 'blue'],
      series: [{ data: [{ name: 'B', value: 8 }, { name: 'A', value: 2 }] }],
    };
    controller.prepare(option, options);
    controller.render(options);
    const icons = container.querySelectorAll('button > span:first-child');
    expect((icons[0] as HTMLElement).style.backgroundColor).toBe('blue');
    expect((icons[1] as HTMLElement).style.backgroundColor).toBe('red');
    controller.dispose();
    container.remove();
  });
});
