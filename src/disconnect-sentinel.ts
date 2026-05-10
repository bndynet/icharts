/**
 * Auto-dispose mechanism for charts created via the imperative
 * `createChart()` API.
 *
 * `IChart`'s constructor appends a hidden custom element — the "sentinel"
 * — to the chart container. When the container leaves the document (the
 * host component unmounts, a parent calls `removeChild`, the user clears
 * `innerHTML`, …), the browser synchronously fires the sentinel's
 * `disconnectedCallback`, which we use to call `chart.dispose()` for the
 * caller. No `onUnmounted` hook required.
 *
 * # Why a custom element instead of …
 *
 * - `MutationObserver`: each chart would need its own observer (or one
 *   global observer with bookkeeping). `disconnectedCallback` is a
 *   zero-cost browser-native lifecycle hook with no observer wiring.
 * - `ResizeObserver` / `IntersectionObserver`: neither fires on detach.
 * - Polling (`requestAnimationFrame` / `setInterval`): runs forever and
 *   wastes the main thread.
 *
 * # Edge cases handled
 *
 * - **SSR / non-DOM environments** — `installSentinel` returns `null` when
 *   `document` or `customElements` is unavailable; `IChart` continues to
 *   function (the `pruneDetachedCharts()` fallback in `registry.ts`
 *   covers test environments that walk the registry on theme switch).
 * - **HMR / duplicate module copies** — if the tag name is already
 *   registered we skip `customElements.define` and reuse the existing
 *   class. The disconnection contract is identical across copies.
 * - **Transient detach-then-reattach (Vue Teleport / React Portal)** — we
 *   defer the disposer one microtask. If the sentinel is re-attached
 *   synchronously (same task), `isConnected` is `true` by the time the
 *   microtask runs and we skip disposal entirely. The microtask runs
 *   before any paint, so the user never sees a half-disposed chart.
 * - **Explicit `chart.dispose()`** — the returned handle's `remove()`
 *   clears the callback *before* removing the sentinel, so the
 *   disconnect we're about to cause can't re-enter the dispose path.
 *   `IChart.dispose()` is also idempotent (guarded by a `_disposed`
 *   flag) so double-disposal from both paths is safe regardless of
 *   ordering — important for `<i-chart>` whose Lit `disconnectedCallback`
 *   already calls `engine.dispose()` independently.
 */

const TAG_NAME = 'icharts-sentinel';

// Per-instance state stored as a symbol-keyed property so direct
// `document.createElement('icharts-sentinel')` (without going through
// `installSentinel`) can't accidentally trigger a stranger's disposer.
const CALLBACK_KEY: unique symbol = Symbol('icharts.sentinel.callback');

interface SentinelElement extends HTMLElement {
  [CALLBACK_KEY]?: (() => void) | null;
}

let registered = false;

/**
 * Register the sentinel custom element with the global registry.
 *
 * The `class … extends HTMLElement` declaration is **deliberately
 * function-local**: in pure-Node environments (Vitest's default
 * `environment: node`, SSR bundles) `HTMLElement` is undefined at
 * module-load time, so a top-level class would throw `ReferenceError`
 * the moment `core.ts` imports this file — long before any sentinel is
 * actually installed. Deferring the declaration into a function body
 * means the `HTMLElement` reference is only resolved on the first
 * `installSentinel()` call in a DOM-capable environment.
 */
function ensureRegistered(): boolean {
  if (registered) return true;
  // `customElements` may be missing in tests / SSR / very old browsers.
  // Caller falls back to the registry's `pruneDetachedCharts` walk.
  if (typeof customElements === 'undefined') return false;
  if (typeof HTMLElement === 'undefined') return false;
  if (customElements.get(TAG_NAME)) {
    // Already defined by another copy of this module (HMR or
    // multi-instance bundle). Skip the re-definition — `customElements`
    // would throw `NotSupportedError` — and trust the existing class to
    // implement the same contract.
    registered = true;
    return true;
  }
  class IChartsSentinel extends HTMLElement {
    disconnectedCallback(): void {
      const cb = (this as SentinelElement)[CALLBACK_KEY];
      if (!cb) return;
      // Defer one microtask so a synchronous detach→reattach (Vue
      // Teleport, React Portal, manual `parent.appendChild(node)` while
      // keeping the tree alive) self-heals: by the time the microtask
      // runs, the browser has finished the reattach and
      // `this.isConnected` reports the final state. We clear the
      // callback before invoking it to make the disposer
      // re-entrant-safe in case `cb()` itself triggers another detach
      // (e.g. removing the sentinel inside dispose()).
      queueMicrotask(() => {
        if (this.isConnected) return;
        (this as SentinelElement)[CALLBACK_KEY] = null;
        cb();
      });
    }
  }
  customElements.define(TAG_NAME, IChartsSentinel);
  registered = true;
  return true;
}

export interface SentinelHandle {
  /**
   * Remove the sentinel without firing its disposer. Called by
   * `IChart.dispose()` to avoid re-entering its own dispose path through
   * the sentinel's `disconnectedCallback`.
   */
  remove(): void;
}

/**
 * Append a hidden sentinel to `container` and invoke `onDisconnect`
 * exactly once when the sentinel leaves the live DOM. Returns `null` in
 * environments without a DOM / custom-elements registry — in which case
 * the chart relies on the registry's `pruneDetachedCharts` defense.
 */
export function installSentinel(
  container: HTMLElement,
  onDisconnect: () => void,
): SentinelHandle | null {
  if (typeof document === 'undefined') return null;
  if (!ensureRegistered()) return null;

  const sentinel = document.createElement(TAG_NAME) as SentinelElement;
  // Layout-free + pointer-transparent so we don't shift ECharts' canvas
  // measurement or block hover/click on the chart. `contain: strict`
  // isolates this element from the parent's layout/paint pipeline.
  sentinel.style.cssText =
    'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;contain:strict';
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel[CALLBACK_KEY] = onDisconnect;
  container.appendChild(sentinel);

  return {
    remove(): void {
      // Order matters: clear the callback *before* removing the element.
      // `sentinel.remove()` synchronously triggers
      // `disconnectedCallback`, which would otherwise queue a microtask
      // that re-enters `IChart.dispose()`. The `_disposed` guard in
      // `IChart` makes the re-entry harmless, but skipping the work
      // entirely is cheaper and easier to reason about.
      sentinel[CALLBACK_KEY] = null;
      sentinel.remove();
    },
  };
}
