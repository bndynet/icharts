/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { resizeSpy } = vi.hoisted(() => ({ resizeSpy: vi.fn() }));

vi.mock('echarts', () => ({
  use: vi.fn(),
  init: vi.fn(() => ({
    setOption: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    setTheme: vi.fn(),
    resize: resizeSpy,
    on: vi.fn(),
    off: vi.fn(),
    dispatchAction: vi.fn(),
  })),
  registerTheme: vi.fn(),
}));

vi.mock('@echarts-x/custom-word-cloud', () => ({
  default: { install: vi.fn() },
}));

import { IChart } from './core.js';
import { registerAdapter } from './adapters/index.js';
import type { ChartData } from './types.js';

type ObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(private readonly callback: ObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }

  trigger(width: number, height: number, target: Element): void {
    this.callback(
      [{ target, contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

const data: ChartData = { categories: [], series: [] };

function makeContainer(): HTMLDivElement {
  const container = document.createElement('div');
  Object.defineProperties(container, {
    clientWidth: { configurable: true, value: 320 },
    clientHeight: { configurable: true, value: 180 },
  });
  document.body.append(container);
  return container;
}

describe('IChart automatic resize', () => {
  afterEach(() => {
    document.body.replaceChildren();
    ResizeObserverStub.instances = [];
    resizeSpy.mockClear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('observes container size by default and resizes when it becomes visible', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.useFakeTimers();
    const container = makeContainer();
    const chart = new IChart(container, 'auto-resize-stub', data);
    const observer = ResizeObserverStub.instances[0];

    expect(observer.observe).toHaveBeenCalledWith(container);
    observer.trigger(0, 0, container);
    vi.runOnlyPendingTimers();
    expect(resizeSpy).not.toHaveBeenCalled();

    observer.trigger(320, 180, container);
    vi.runOnlyPendingTimers();
    expect(resizeSpy).toHaveBeenCalledTimes(1);

    chart.dispose();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it('allows automatic resize to be disabled and re-enabled through update()', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    const container = makeContainer();
    const chart = new IChart(container, 'auto-resize-stub', data, { autoResize: false });

    expect(ResizeObserverStub.instances).toHaveLength(0);
    chart.update(undefined, { autoResize: true });
    expect(ResizeObserverStub.instances).toHaveLength(1);
    chart.update(undefined, { autoResize: false });
    expect(ResizeObserverStub.instances[0].disconnect).toHaveBeenCalledOnce();
    chart.dispose();
  });

  it('falls back to a window resize listener when ResizeObserver is unavailable', () => {
    const container = makeContainer();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const chart = new IChart(container, 'auto-resize-stub', data);

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    chart.dispose();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

registerAdapter('auto-resize-stub', {
  validate: () => true,
  resolve: () => ({ option: { series: [] } }),
});
