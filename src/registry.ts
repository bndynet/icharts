import type { IChartInstance } from './types.js';

/**
 * Global registry of all live IChart instances.
 * Used by {@link switchTheme} to propagate theme changes to every chart.
 */
export const chartRegistry = new Set<IChartInstance>();

/**
 * Drop and dispose any chart whose ECharts container is no longer in the
 * document.
 *
 * Most consumers never reach this code path — `IChart`'s constructor
 * installs a sentinel custom element (see `disconnect-sentinel.ts`) that
 * auto-disposes the chart the moment its container leaves the live DOM,
 * and `<i-chart>` additionally cleans up in its Lit `disconnectedCallback`.
 * This walk is the **last line of defense** for environments where the
 * sentinel can't fire:
 *
 * - SSR / Node test runners where `customElements` is undefined.
 * - Old browsers without the Custom Elements V1 registry.
 * - Cases where consumer code nukes the sentinel directly (e.g.
 *   `container.innerHTML = ''` — actually still fires disconnect; safe)
 *   or detaches the container before any task can run.
 *
 * Why it matters: registry walks (`switchTheme`,
 * `configure({ consistentColors })`) propagate changes to every entry,
 * and a detached chart still runs its adapter — which writes into the
 * active theme's `colorMap` (when `consistentColors: true`). Without
 * pruning, a stale chart from a previously visited page would re-populate
 * `colorMap` with its series names and starve the current page's palette,
 * producing the "theme colors don't apply" symptom users hit when
 * navigating between pages.
 *
 * `isConnected` is the DOM-standard check; works through shadow roots
 * (returns `true` only when the entire ancestor chain reaches `document`).
 * SSR / non-DOM environments expose `undefined` for `getDom()`, so we
 * leave those charts alone instead of misclassifying them as detached.
 */
export function pruneDetachedCharts(): void {
  const toDispose: IChartInstance[] = [];
  for (const chart of chartRegistry) {
    const ec = chart.getEChartsInstance();
    if (ec.isDisposed()) {
      // Already disposed but still in registry (shouldn't happen since
      // dispose() removes itself; belt-and-suspenders).
      chartRegistry.delete(chart);
      continue;
    }
    const dom = ec.getDom();
    if (dom && !dom.isConnected) {
      toDispose.push(chart);
    }
  }
  // Snapshot first, then dispose, to avoid mutating chartRegistry mid-walk.
  for (const chart of toDispose) {
    chart.dispose();
  }
}
