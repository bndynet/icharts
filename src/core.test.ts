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
  init: vi.fn(() => ({
    setOption: vi.fn(),
    dispose: vi.fn(),
    setTheme: vi.fn(),
    resize: vi.fn(),
  })),
  registerTheme: vi.fn(),
}));

import { IChart } from './core.js';
import { registerAdapter, type RenderContext } from './adapters/index.js';
import type { ChartData } from './types.js';

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
});

/** Cast to satisfy the `HTMLElement` arg without a real DOM. */
function fakeContainer(): HTMLElement {
  return {} as HTMLElement;
}

describe('IChart engine — RenderContext threading', () => {
  it('reports no observation on initial render', () => {
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toBeUndefined();
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

  it('setTheme() re-renders without a ctx (theme switches are not ticks)', () => {
    const chart = new IChart(fakeContainer(), 'observed-stub', stubData);
    observations.length = 0;

    chart.setTheme('default');
    expect(observations).toHaveLength(1);
    expect(observations[0]).toBeUndefined();
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
