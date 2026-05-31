/**
 * Engine half of the auto-measured race frame duration:
 *
 * The adapters themselves are covered by `bar.test.ts` / `line.test.ts`
 * (they verify that an explicit `ctx.observedFrameMs` lands on
 * `animationDurationUpdate`). This file covers the wiring on the OTHER
 * side: that `IChart.update()` actually measures the wall-clock gap
 * between consecutive calls and threads it through `RenderContext` to the
 * adapter — and that initial render / `setTheme()` do NOT report stale
 * intervals.
 *
 * We mock the `echarts` module so the test can run under the existing
 * node-only Vitest environment (no DOM, no canvas, no real ECharts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('echarts', () => ({
  use: vi.fn(),
  init: vi.fn(() => ({
    setOption: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    setTheme: vi.fn(),
    resize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
  registerTheme: vi.fn(),
}));

vi.mock('@echarts-x/custom-word-cloud', () => ({
  default: { install: vi.fn() },
}));

import { IChart } from './core.js';
import { registerAdapter, type RenderContext } from './adapters/index.js';
import { configure, resetConfiguration } from './config.js';
import { resolveColors } from './utils.js';
import { switchTheme, resetColorMap } from './themes/index.js';
import type { ChartData, ChartOptions } from './types.js';
import * as echarts from 'echarts';

const observations: Array<RenderContext | undefined> = [];

/** Minimal valid ChartData shape so TypeScript accepts the stub calls. */
const stubData: ChartData = { categories: [], series: [] };

beforeEach(() => {
  observations.length = 0;
  registerAdapter('observed-stub', {
    validate: () => true,
    resolve: (_data, _options, ctx) => {
      observations.push(ctx);
      return { option: { series: [] } };
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  resetConfiguration();
});

/** Cast to satisfy the `HTMLElement` arg without a real DOM. */
function fakeContainer(): HTMLElement {
  return {} as HTMLElement;
}

describe('IChart engine — RenderContext threading', () => {
  // Note on assertion shape: `_apply` always carries `inShadowDom`
  // (engine-owned, container-derived), so `ctx` is never `undefined`
  // anymore. Frame-derived fields (`observedFrameMs`, `maxRaceGridRight`)
  // are what we assert "absence" on — those *are* still undefined on
  // non-tick code paths (initial render, setTheme).

  it('reports no frame observation on initial render', () => {
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    expect(observations).toHaveLength(1);
    expect(observations[0]?.observedFrameMs).toBeUndefined();
    expect(observations[0]?.maxRaceGridRight).toBeUndefined();
    chart.dispose();
  });

  it('first update() has no prior tick — observedFrameMs is undefined', () => {
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    observations.length = 0; // ignore the constructor call

    chart.update(stubData);
    expect(observations).toHaveLength(1);
    expect(observations[0]?.observedFrameMs).toBeUndefined();
    chart.dispose();
  });

  it('subsequent update()s report the elapsed gap from the prior update()', () => {
    const nowSpy = vi.spyOn(performance, 'now');
    // Sequence of wall-clock samples the engine will see, in order:
    //   constructor (no observation), then three update() calls.
    nowSpy.mockReturnValueOnce(1000) // update #1: lastUpdateAt was null → undefined
      .mockReturnValueOnce(1250) // update #2: observed = 1250 - 1000 = 250ms
      .mockReturnValueOnce(1430); // update #3: observed = 1430 - 1250 = 180ms

    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    observations.length = 0;

    chart.update(stubData);
    chart.update(stubData);
    chart.update(stubData);

    expect(observations).toHaveLength(3);
    expect(observations[0]?.observedFrameMs).toBeUndefined();
    expect(observations[1]?.observedFrameMs).toBe(250);
    expect(observations[2]?.observedFrameMs).toBe(180);

    chart.dispose();
    nowSpy.mockRestore();
  });

  it('setTheme() does not report a frame tick (theme switches are not ticks)', () => {
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    observations.length = 0;

    chart.setTheme('default');
    expect(observations).toHaveLength(1);
    expect(observations[0]?.observedFrameMs).toBeUndefined();
    chart.dispose();
  });
});

describe('IChart engine — clearOnThemeChange adapter capability', () => {
  it('clears the instance before applying a new theme when the adapter opts in', () => {
    registerAdapter('clear-on-theme-stub', {
      validate: () => true,
      clearOnThemeChange: true,
      resolve: () => ({
        option: {
          series: [{ type: 'custom', renderItem: 'wordCloud', coordinateSystem: 'none' }],
        },
      }),
    });

    const chart = new IChart(fakeContainer(), 'clear-on-theme-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      clear: ReturnType<typeof vi.fn>;
    };
    expect(ec.clear).not.toHaveBeenCalled();

    chart.setTheme('dark');
    expect(ec.clear).toHaveBeenCalledTimes(1);
    chart.dispose();
  });

  it('does NOT clear on theme switch when the adapter omits the flag', () => {
    // 'observed-stub' (registered in the top-level beforeEach) has no
    // clearOnThemeChange flag — the engine must not clear for it.
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      clear: ReturnType<typeof vi.fn>;
    };

    chart.setTheme('dark');
    expect(ec.clear).not.toHaveBeenCalled();
    chart.dispose();
  });
});

describe('IChart engine — mergeData adapter capability', () => {
  it('folds successive update() data through adapter.mergeData when both pass validate', () => {
    const mergeData = vi.fn(
      (prev: ChartData, next: ChartData) =>
        ({ ...(prev as object), ...(next as object) }) as ChartData,
    );
    const seen: ChartData[] = [];
    registerAdapter('merge-stub', {
      validate: (d) => d !== null && typeof d === 'object' && 'value' in d,
      mergeData,
      resolve: (data) => {
        seen.push(data);
        return { option: { series: [] } };
      },
    });

    const chart = new IChart(
      fakeContainer(),
      'merge-stub',
      { value: 1, max: 10 } as unknown as ChartData,
    );
    chart.update({ value: 2 } as unknown as ChartData);

    expect(mergeData).toHaveBeenCalledTimes(1);
    // max carried forward from the prior frame by the shallow merge stub.
    expect(seen[seen.length - 1]).toEqual({ value: 2, max: 10 });
    chart.dispose();
  });

  it('replaces data wholesale when the adapter has no mergeData', () => {
    const seen: ChartData[] = [];
    registerAdapter('replace-stub', {
      validate: () => true,
      resolve: (data) => {
        seen.push(data);
        return { option: { series: [] } };
      },
    });

    const chart = new IChart(
      fakeContainer(),
      'replace-stub',
      { value: 1, max: 10 } as unknown as ChartData,
    );
    chart.update({ value: 2 } as unknown as ChartData);

    // No merge: the new frame replaces the old one entirely (max dropped).
    expect(seen[seen.length - 1]).toEqual({ value: 2 });
    chart.dispose();
  });
});

describe('IChart engine — events (onClick / onMouseOver)', () => {
  type MockEC = {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
  const eventStub = {
    validate: () => true,
    resolve: () => ({ option: { series: [] } }),
  };

  it('binds options.events handlers and passes a normalized context', () => {
    registerAdapter('event-stub', eventStub);
    const onClick = vi.fn();
    const chart = new IChart(fakeContainer(), 'event-stub', stubData, {
      events: { onClick },
    });
    const ec = chart.getEChartsInstance() as unknown as MockEC;

    const clickReg = ec.on.mock.calls.find((c) => c[0] === 'click');
    expect(clickReg).toBeDefined();

    // Fire the registered wrapper with a raw ECharts click param.
    (clickReg![1] as (p: unknown) => void)({
      componentType: 'series',
      seriesType: 'pie',
      name: 'North',
      value: 40,
      dataIndex: 1,
      color: '#5470c6',
    });

    expect(onClick).toHaveBeenCalledTimes(1);
    const ctx = onClick.mock.calls[0][0];
    expect(ctx.type).toBe('click');
    expect(ctx.data).toEqual({
      kind: 'item',
      dataIndex: 1,
      name: 'North',
      value: 40,
      percent: undefined,
      marker: undefined,
      color: '#5470c6',
    });
    chart.dispose();
  });

  it('does not bind any handler when options.events is absent', () => {
    registerAdapter('event-stub', eventStub);
    const chart = new IChart(fakeContainer(), 'event-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as MockEC;
    expect(ec.on.mock.calls.some((c) => c[0] === 'click')).toBe(false);
    chart.dispose();
  });

  it('rebinds (off then on) on re-render so handlers never stack', () => {
    registerAdapter('event-stub', eventStub);
    const chart = new IChart(fakeContainer(), 'event-stub', stubData, {
      events: { onClick: vi.fn() },
    });
    const ec = chart.getEChartsInstance() as unknown as MockEC;
    expect(ec.on.mock.calls.filter((c) => c[0] === 'click')).toHaveLength(1);

    chart.update(stubData);
    // Previous wrapper detached, new wrapper attached.
    expect(ec.off.mock.calls.filter((c) => c[0] === 'click')).toHaveLength(1);
    expect(ec.on.mock.calls.filter((c) => c[0] === 'click')).toHaveLength(2);
    chart.dispose();
  });

  it('swallows a throwing handler so ECharts dispatch is not broken', () => {
    registerAdapter('event-stub', eventStub);
    const chart = new IChart(fakeContainer(), 'event-stub', stubData, {
      events: {
        onMouseOver: () => {
          throw new Error('handler boom');
        },
      },
    });
    const ec = chart.getEChartsInstance() as unknown as MockEC;
    const reg = ec.on.mock.calls.find((c) => c[0] === 'mouseover');
    expect(reg).toBeDefined();
    expect(() => (reg![1] as (p: unknown) => void)({ componentType: 'series', name: 'x' })).not.toThrow();
    chart.dispose();
  });
});

describe('IChart engine — onInit teardown lifecycle', () => {
  it('runs the previous teardown before each re-render, and once on dispose', () => {
    const cleanup = vi.fn();
    // onInit returns a fresh teardown each pass; the engine must run the
    // PRIOR pass's teardown before invoking onInit again, and the final
    // teardown on dispose() — no stacking, no leaks.
    registerAdapter('teardown-stub', {
      validate: () => true,
      resolve: () => ({ option: { series: [] }, onInit: () => cleanup }),
    });

    const chart = new IChart(fakeContainer(), 'teardown-stub', stubData);
    // Constructor render wired teardown #1; nothing cleaned up yet.
    expect(cleanup).not.toHaveBeenCalled();

    chart.update(stubData); // tears down #1, wires #2
    expect(cleanup).toHaveBeenCalledTimes(1);

    chart.setTheme('dark'); // tears down #2, wires #3
    expect(cleanup).toHaveBeenCalledTimes(2);

    chart.dispose(); // tears down #3 (final)
    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it('tolerates an onInit that returns nothing (no teardown to run)', () => {
    // 'observed-stub' (top-level beforeEach) has an onInit-less resolve.
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    expect(() => {
      chart.update(stubData);
      chart.dispose();
    }).not.toThrow();
  });

  it('swallows a throwing teardown so render/dispose still proceed', () => {
    registerAdapter('throwing-teardown-stub', {
      validate: () => true,
      resolve: () => ({
        option: { series: [] },
        onInit: () => () => {
          throw new Error('teardown boom');
        },
      }),
    });

    const chart = new IChart(fakeContainer(), 'throwing-teardown-stub', stubData);
    expect(() => chart.update(stubData)).not.toThrow();
    expect(() => chart.dispose()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// `inShadowDom` threading — the engine samples the container's root once at
// construction and forwards it on every render. The flag is the contract the
// tooltip helpers (`buildTooltip` / `buildSparkTooltip` / `resolveAppendToBody`)
// rely on to decide whether to default `tooltip.appendToBody` to true (light
// DOM) or false (Shadow DOM, e.g. <i-chart>).
//
// Vitest's default node env has no `ShadowRoot` global and no real DOM — we
// simulate both halves of the check:
//   - "in shadow DOM": container.getRootNode() returns an instance of a fake
//     ShadowRoot class we install on globalThis.
//   - "in light DOM": ShadowRoot is defined but the container's root is not
//     an instance of it. (Or ShadowRoot is undefined entirely, the SSR case.)
// Both branches must produce the same answer the production engine produces
// in a real browser.
// ---------------------------------------------------------------------------

describe('IChart engine — inShadowDom detection and threading', () => {
  // We pollute the global namespace on purpose; afterEach restores it so
  // tests below this block run under the original (undefined) ShadowRoot.
  const originalShadowRoot = (
    globalThis as { ShadowRoot?: unknown }
  ).ShadowRoot;
  afterEach(() => {
    if (originalShadowRoot === undefined) {
      delete (globalThis as { ShadowRoot?: unknown }).ShadowRoot;
    } else {
      (globalThis as { ShadowRoot?: unknown }).ShadowRoot = originalShadowRoot;
    }
  });

  function shadowRootContainer(): HTMLElement {
    class FakeShadowRoot {}
    (globalThis as { ShadowRoot?: unknown }).ShadowRoot = FakeShadowRoot;
    const root = new FakeShadowRoot();
    return {
      getRootNode: () => root,
    } as unknown as HTMLElement;
  }

  function lightDomContainer(): HTMLElement {
    class FakeShadowRoot {}
    (globalThis as { ShadowRoot?: unknown }).ShadowRoot = FakeShadowRoot;
    // Some non-ShadowRoot root node — what an `<el-card>` body looks like.
    return {
      getRootNode: () => ({}),
    } as unknown as HTMLElement;
  }

  it('reports inShadowDom: true when the container lives under a ShadowRoot', () => {
    const chart = new IChart(shadowRootContainer(), 'observed-stub', stubData);
    expect(observations[0]?.inShadowDom).toBe(true);
    chart.dispose();
  });

  it('reports inShadowDom: false in light DOM containers', () => {
    const chart = new IChart(lightDomContainer(), 'observed-stub', stubData);
    expect(observations[0]?.inShadowDom).toBe(false);
    chart.dispose();
  });

  it('reports inShadowDom: false when ShadowRoot is undefined (SSR / node)', () => {
    // Default test env has no ShadowRoot global; the engine's typeof
    // guard short-circuits before calling getRootNode(), so a plain
    // fakeContainer (which has no getRootNode) doesn't throw.
    delete (globalThis as { ShadowRoot?: unknown }).ShadowRoot;
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    expect(observations[0]?.inShadowDom).toBe(false);
    chart.dispose();
  });

  it('threads inShadowDom through update() and setTheme(), not just construction', () => {
    const chart = new IChart(shadowRootContainer(), 'observed-stub', stubData);
    observations.length = 0;

    chart.update(stubData);
    chart.setTheme('default');

    expect(observations).toHaveLength(2);
    expect(observations[0]?.inShadowDom).toBe(true);
    expect(observations[1]?.inShadowDom).toBe(true);
    chart.dispose();
  });
});

describe('IChart engine — race label headroom high-water mark', () => {
  /**
   * Stub adapter that lets the test drive `grid.right` on each render
   * (mirroring what bar-race / line-race do based on current frame's
   * widest label), and records the `maxRaceGridRight` the engine fed
   * back via `RenderContext`.
   */
  let nextGridRight = 0;
  const seenMax: Array<number | undefined> = [];

  beforeEach(() => {
    nextGridRight = 0;
    seenMax.length = 0;
    registerAdapter('headroom-stub', {
      validate: () => true,
      resolve: (_data, _options, ctx) => {
        seenMax.push(ctx?.maxRaceGridRight);
        return { option: { grid: { right: nextGridRight }, series: [] } };
      },
    });
  });

  it('starts undefined and grows monotonically with the largest grid.right seen', () => {
    nextGridRight = 50;
    const chart = new IChart(fakeContainer(), 'headroom-stub', stubData);
    // Initial render: nothing was painted yet so engine has no prior value.
    expect(seenMax[0]).toBeUndefined();

    nextGridRight = 120;
    chart.update(stubData);
    // After the constructor painted with right=50, the second render sees 50.
    expect(seenMax[1]).toBe(50);

    nextGridRight = 90; // narrower this frame — should NOT push the mark down
    chart.update(stubData);
    expect(seenMax[2]).toBe(120);

    nextGridRight = 200; // wider — pushes the mark up
    chart.update(stubData);
    expect(seenMax[3]).toBe(120);

    chart.update(stubData);
    expect(seenMax[4]).toBe(200);

    chart.dispose();
  });

  it('tolerates options without a grid (e.g. pie / gauge) and never throws', () => {
    registerAdapter('no-grid-stub', {
      validate: () => true,
      resolve: () => ({ option: { series: [] } }),
    });
    const chart = new IChart(fakeContainer(), 'no-grid-stub', stubData);
    expect(() => chart.update(stubData)).not.toThrow();
    chart.dispose();
  });
});

// ---------------------------------------------------------------------------
// Async-tooltip dismiss wiring — the engine half of the cache-on-hideTip
// behavior. The formatter half (createAsyncTooltipFormatter) is covered by
// async-tooltip.test.ts. This block verifies that when an adapter emits a
// tooltip.formatter with a `dismiss` property, the engine registers it as
// a `hideTip` listener and re-binds (off → on) on each `_apply()` without
// stacking listeners.
// ---------------------------------------------------------------------------

describe('IChart engine — async tooltip dismiss wiring', () => {
  it('binds tooltip.formatter.dismiss to hideTip when present on the resolved option', () => {
    const dismiss = vi.fn();
    const formatter = Object.assign(() => 'sync', { dismiss });
    registerAdapter('async-tooltip-stub', {
      validate: () => true,
      resolve: () => ({
        option: { tooltip: { formatter }, series: [] },
      }),
    });

    const chart = new IChart(fakeContainer(), 'async-tooltip-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      on: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
    };

    expect(ec.on).toHaveBeenCalledTimes(1);
    expect(ec.on.mock.calls[0][0]).toBe('hideTip');
    expect(ec.on.mock.calls[0][1]).toBe(dismiss);
    chart.dispose();
  });

  it('re-binds on each _apply() with off-then-on (no listener stacking)', () => {
    let currentFormatter: ((p: unknown) => string) & { dismiss: () => void } =
      Object.assign(() => 'sync', { dismiss: vi.fn() });

    registerAdapter('rebind-stub', {
      validate: () => true,
      resolve: () => ({
        option: { tooltip: { formatter: currentFormatter }, series: [] },
      }),
    });

    const chart = new IChart(fakeContainer(), 'rebind-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      on: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
    };

    const first = currentFormatter.dismiss;
    expect(ec.on).toHaveBeenCalledTimes(1);
    expect(ec.on.mock.calls[0][1]).toBe(first);
    expect(ec.off).not.toHaveBeenCalled();

    // Simulate a new adapter resolve emitting a fresh formatter closure
    // (which is what each update() / setTheme() / resize() does in
    // production).
    const second = vi.fn();
    currentFormatter = Object.assign(() => 'sync', { dismiss: second });
    chart.update(stubData);

    expect(ec.off).toHaveBeenCalledTimes(1);
    expect(ec.off.mock.calls[0][0]).toBe('hideTip');
    expect(ec.off.mock.calls[0][1]).toBe(first);
    expect(ec.on).toHaveBeenCalledTimes(2);
    expect(ec.on.mock.calls[1][1]).toBe(second);

    chart.dispose();
  });

  it('skips wiring when tooltip.formatter is missing or has no dismiss method', () => {
    registerAdapter('plain-tooltip-stub', {
      validate: () => true,
      resolve: () => ({
        option: { tooltip: { formatter: () => 'sync' }, series: [] },
      }),
    });

    const chart = new IChart(fakeContainer(), 'plain-tooltip-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      on: ReturnType<typeof vi.fn>;
    };
    expect(ec.on).not.toHaveBeenCalled();
    chart.dispose();
  });

  it('skips wiring when the option has no tooltip at all', () => {
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      on: ReturnType<typeof vi.fn>;
    };
    expect(ec.on).not.toHaveBeenCalled();
    chart.dispose();
  });

  it('detaches the old listener when subsequent renders no longer emit an async formatter', () => {
    let withDismiss = true;
    const dismiss = vi.fn();
    registerAdapter('toggle-stub', {
      validate: () => true,
      resolve: () => ({
        option: {
          tooltip: withDismiss
            ? { formatter: Object.assign(() => 'sync', { dismiss }) }
            : { formatter: () => 'sync' },
          series: [],
        },
      }),
    });

    const chart = new IChart(fakeContainer(), 'toggle-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      on: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
    };
    expect(ec.on).toHaveBeenCalledTimes(1);

    withDismiss = false;
    chart.update(stubData);

    expect(ec.off).toHaveBeenCalledTimes(1);
    expect(ec.off.mock.calls[0][0]).toBe('hideTip');
    expect(ec.off.mock.calls[0][1]).toBe(dismiss);
    // No new `on` call — the new option has no dismiss to wire.
    expect(ec.on).toHaveBeenCalledTimes(1);

    chart.dispose();
  });
});

describe('IChart engine — configured fontFamily propagation', () => {
  it('applies configure({ fontFamily }) to root, series labels, and graphic text', () => {
    registerAdapter('font-stub', {
      validate: () => true,
      resolve: () => ({
        option: {
          title: { text: 'Revenue', textStyle: { color: '#111827' } },
          legend: { show: true, textStyle: { color: '#111827' } },
          series: [
            {
              type: 'pie',
              data: [{ name: 'A', value: 1 }],
              label: { show: true },
              emphasis: { label: { show: true } },
            },
          ],
          graphic: [
            {
              type: 'text',
              style: {
                text: '{a|Total}',
                rich: { a: { fontSize: 18 } },
              },
            },
          ],
        },
      }),
    });

    configure({ fontFamily: 'Inter, sans-serif' });
    const chart = new IChart(fakeContainer(), 'font-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      setOption: ReturnType<typeof vi.fn>;
    };
    const option = ec.setOption.mock.calls[0][0] as {
      textStyle?: { fontFamily?: string };
      title?: { textStyle?: { fontFamily?: string } };
      legend?: { textStyle?: { fontFamily?: string } };
      series?: Array<{ label?: { fontFamily?: string }; emphasis?: { label?: { fontFamily?: string } } }>;
      graphic?: Array<{ style?: { fontFamily?: string; rich?: Record<string, { fontFamily?: string }> } }>;
    };

    expect(option.textStyle?.fontFamily).toBe('Inter, sans-serif');
    expect(option.title?.textStyle?.fontFamily).toBe('Inter, sans-serif');
    expect(option.legend?.textStyle?.fontFamily).toBe('Inter, sans-serif');
    expect(option.series?.[0]?.label?.fontFamily).toBe('Inter, sans-serif');
    expect(option.series?.[0]?.emphasis?.label?.fontFamily).toBe('Inter, sans-serif');
    expect(option.graphic?.[0]?.style?.fontFamily).toBe('Inter, sans-serif');
    expect(option.graphic?.[0]?.style?.rich?.a?.fontFamily).toBe('Inter, sans-serif');

    chart.dispose();
  });

  it('fills empty or undefined fontFamily fields instead of falling back to ECharts defaults', () => {
    registerAdapter('font-empty-stub', {
      validate: () => true,
      resolve: () => ({
        option: {
          series: [
            {
              type: 'line',
              data: [1, 2, 3],
              label: { show: true, fontFamily: undefined as unknown as string },
              emphasis: { label: { show: true, fontFamily: '' } },
            },
          ],
        },
      }),
    });

    configure({ fontFamily: 'Inter, sans-serif' });
    const chart = new IChart(fakeContainer(), 'font-empty-stub', stubData);
    const ec = chart.getEChartsInstance() as unknown as {
      setOption: ReturnType<typeof vi.fn>;
    };
    const option = ec.setOption.mock.calls[0][0] as {
      series?: Array<{ label?: { fontFamily?: string }; emphasis?: { label?: { fontFamily?: string } } }>;
    };

    expect(option.series?.[0]?.label?.fontFamily).toBe('Inter, sans-serif');
    expect(option.series?.[0]?.emphasis?.label?.fontFamily).toBe('Inter, sans-serif');
    chart.dispose();
  });
});

// ---------------------------------------------------------------------------
// consistentColors name lease — dispose recycles palette slots so the next
// chart restarts at palette[0] WITHOUT depending on pruneDetachedCharts. This
// is the P2 "no drift without a sweep" guarantee, exercised end-to-end through
// the real engine + resolver (not just the PaletteRegistry unit).
// ---------------------------------------------------------------------------

describe('IChart engine — consistentColors dispose-release recycle', () => {
  /** Adapter that resolves colors for `data.names` and records the result. */
  const captured: string[][] = [];

  beforeEach(() => {
    captured.length = 0;
    registerAdapter('color-lease-stub', {
      validate: () => true,
      resolve: (data, options) => {
        const names = (data as unknown as { names: string[] }).names ?? [];
        captured.push(resolveColors(names, options as ChartOptions));
        return { option: { series: [] } };
      },
    });
    resetConfiguration();
    switchTheme('light');
    resetColorMap();
    configure({ consistentColors: true });
  });

  function chartWith(names: string[]): IChart {
    return new IChart(
      fakeContainer(),
      'color-lease-stub',
      { names } as unknown as ChartData,
    );
  }

  it('recycles a disposed chart\u2019s slots so the next chart restarts at palette[0] (no prune call)', () => {
    const a = chartWith(['lease-X', 'lease-Y']);
    expect(captured[0]).toEqual(['#3b82f6', '#10b981']); // palette[0], [1]

    a.dispose(); // releases lease-X / lease-Y; slots recycled

    // No pruneDetachedCharts(), no switchTheme() — just a fresh chart.
    const b = chartWith(['lease-P', 'lease-Q']);
    expect(captured[1]).toEqual(['#3b82f6', '#10b981']); // restarts, no drift
    b.dispose();
  });

  it('keeps accumulating across charts that are still alive (live charts retain their colors)', () => {
    const a = chartWith(['live-A', 'live-B']);
    expect(captured[0]).toEqual(['#3b82f6', '#10b981']);

    // a is NOT disposed — its names are still leased, so b continues the
    // palette exactly like the pre-refactor behavior.
    const b = chartWith(['live-C', 'live-D']);
    expect(captured[1]).toEqual(['#f59e0b', '#ef4444']); // palette[2], [3]

    a.dispose();
    b.dispose();
  });
});

describe('IChart engine — configured global theme fallback', () => {
  it('initializes charts without options.theme using configure({ theme }).name', () => {
    configure({
      theme: {
        name: 'core-config-theme',
        palette: ['#22d3ee', '#818cf8'],
      },
    });

    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    const initMock = vi.mocked(echarts.init);
    const lastCall = initMock.mock.calls[initMock.mock.calls.length - 1] ?? [];
    const [, themeName] = lastCall;
    expect(themeName).toBe('core-config-theme');
    chart.dispose();
  });
});
