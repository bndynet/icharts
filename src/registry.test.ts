/**
 * `pruneDetachedCharts` defends the global chart registry against leaked
 * instances — charts whose host component unmounted without calling
 * `dispose()`. The fixture below stubs `IChartInstance` with the minimum
 * surface the pruner reads (`getEChartsInstance().getDom()`,
 * `isDisposed()`) plus a captured `dispose()` spy.
 *
 * Why this is worth a dedicated test: the symptom from a leaked chart
 * (the next page's palette starts shifted) is subtle and only manifests
 * during multi-page SPA navigation, which integration tests don't cover.
 * Locking the prune behavior here keeps future refactors honest.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { IChartInstance, ChartData, AnyChartOptions } from './types.js';
import { chartRegistry, pruneDetachedCharts } from './registry.js';

// Minimal IChartInstance fake — we only need the methods `pruneDetachedCharts`
// touches, plus a self-removing `dispose` that mirrors the real chart's
// contract (the real `IChart.dispose` removes itself from the registry).
function makeFakeChart(opts: {
  connected: boolean;
  disposed?: boolean;
}): { instance: IChartInstance; disposeSpy: ReturnType<typeof vi.fn> } {
  const dom: { isConnected: boolean } | undefined = { isConnected: opts.connected };
  let isDisposed = opts.disposed ?? false;

  const disposeSpy = vi.fn(() => {
    isDisposed = true;
    chartRegistry.delete(instance);
  });

  const ec = {
    isDisposed: () => isDisposed,
    getDom: () => dom as unknown as HTMLElement,
  };

  const instance: IChartInstance = {
    update: (_d?: ChartData, _o?: AnyChartOptions) => {},
    setTheme: (_t: string) => {},
    resize: () => {},
    dispose: disposeSpy,
    getEChartsInstance: () => ec as unknown as ReturnType<IChartInstance['getEChartsInstance']>,
  };

  return { instance, disposeSpy };
}

beforeEach(() => {
  chartRegistry.clear();
});

describe('pruneDetachedCharts', () => {
  it('disposes charts whose container is no longer connected', () => {
    const live = makeFakeChart({ connected: true });
    const zombie = makeFakeChart({ connected: false });

    chartRegistry.add(live.instance);
    chartRegistry.add(zombie.instance);

    pruneDetachedCharts();

    expect(zombie.disposeSpy).toHaveBeenCalledOnce();
    expect(live.disposeSpy).not.toHaveBeenCalled();
    expect(chartRegistry.has(zombie.instance)).toBe(false);
    expect(chartRegistry.has(live.instance)).toBe(true);
  });

  it('removes already-disposed charts from the registry without re-disposing them', () => {
    // `dispose()` normally removes itself from chartRegistry — but if a chart
    // got disposed via a non-IChart path and stayed in the registry, the
    // pruner still cleans up the orphan entry.
    const orphan = makeFakeChart({ connected: false, disposed: true });
    chartRegistry.add(orphan.instance);

    pruneDetachedCharts();

    expect(orphan.disposeSpy).not.toHaveBeenCalled();
    expect(chartRegistry.has(orphan.instance)).toBe(false);
  });

  it('leaves charts alone when getDom() returns undefined (SSR / test envs)', () => {
    // Simulate an environment without a real DOM container.
    const headless: IChartInstance = {
      update: () => {},
      setTheme: () => {},
      resize: () => {},
      dispose: vi.fn(),
      getEChartsInstance: () =>
        ({
          isDisposed: () => false,
          getDom: () => undefined,
        }) as unknown as ReturnType<IChartInstance['getEChartsInstance']>,
    };
    chartRegistry.add(headless);

    pruneDetachedCharts();

    expect(headless.dispose).not.toHaveBeenCalled();
    expect(chartRegistry.has(headless)).toBe(true);
  });

  it('iterates a stable snapshot so disposing during the walk is safe', () => {
    // All three zombies. If the pruner mutated the Set during iteration,
    // some entries could be skipped — assert all three are disposed.
    const z1 = makeFakeChart({ connected: false });
    const z2 = makeFakeChart({ connected: false });
    const z3 = makeFakeChart({ connected: false });
    chartRegistry.add(z1.instance);
    chartRegistry.add(z2.instance);
    chartRegistry.add(z3.instance);

    pruneDetachedCharts();

    expect(z1.disposeSpy).toHaveBeenCalledOnce();
    expect(z2.disposeSpy).toHaveBeenCalledOnce();
    expect(z3.disposeSpy).toHaveBeenCalledOnce();
    expect(chartRegistry.size).toBe(0);
  });
});
