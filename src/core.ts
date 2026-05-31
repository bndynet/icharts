import * as echarts from 'echarts';
import type { ChartData, AnyChartOptions, IChartInstance } from './types.js';
import {
  resolveEChartsOption,
  getAdapter,
  type RenderContext,
} from './adapters/index.js';
import { getConfig } from './config.js';
import { buildChartEventContext } from './tooltip-context.js';
import type { ChartEventType, ChartEventHandler } from './types.js';
import { applyConfiguredFontFamilyToOption } from './adapters/common/font-family.js';
import {
  ensureThemesRegistered,
  resolveThemeName,
  beginColorRender,
  endColorRender,
  releaseColorOwner,
} from './themes/index.js';
import { chartRegistry } from './registry.js';
import { installSentinel, type SentinelHandle } from './disconnect-sentinel.js';

// NOTE: `@echarts-x/custom-word-cloud` + `@echarts-x/custom-liquid-fill`
// are NOT imported here. Both packages touch `window` / `document` at
// module-load time, which would break the SSR-safe
// `@bndynet/icharts/core` subpath. Their `echarts.use(...)`
// registration is performed by `./installers/index.ts`, which is
// imported as a side-effect *only* from the browser-first main entry
// (`src/index.ts`). `echarts.use(...)` is idempotent, so this engine
// happily renders wordcloud / liquid-progress charts whenever the
// installers have been registered ahead of time on the active
// `echarts` global.

/**
 * Core chart engine that manages an ECharts instance and provides the
 * full {@link IChartInstance} contract.  Used by both the `<i-chart>`
 * web component and the imperative `createChart` helper.
 */
export class IChart implements IChartInstance {
  private ecInstance: echarts.ECharts;
  private _type: string;
  private _data: ChartData;
  private _options: AnyChartOptions;
  private _activeTheme: string;
  /**
   * Wall-clock time (ms since page-load) of the previous `update()` call.
   * Used to compute `RenderContext.observedFrameMs` so race / streaming
   * adapters can auto-size their animation duration to the consumer's
   * actual tick cadence — no need for the caller to mirror their
   * `setInterval` value as `race.frameDuration`.
   *
   * `null` until the first `update()`. Reset never; the timer reflects the
   * actual rendering pipeline regardless of theme switches or option merges.
   */
  private _lastUpdateAt: number | null = null;
  /**
   * Largest `grid.right` (px) any frame's resolved option has emitted on
   * this chart. Fed to the adapter via `RenderContext.maxRaceGridRight` so
   * race adapters can keep the value/end-label headroom monotonic across
   * frames (see `resolveRaceLabelHeadroom`). Without this, every tick that
   * grew or shrank a digit would relayout the plot area and jitter the
   * line/bar positions.
   *
   * Tracked for every chart type (not just race) because the field lives
   * on the resolved option, not on the adapter contract — non-race
   * adapters simply emit the same value each frame, so the high-water
   * mark equals the current value, and nothing changes.
   */
  private _maxGridRight = 0;
  /**
   * `true` when the chart container's root is a `ShadowRoot` (i.e. the
   * `<i-chart>` web component path; plain `createChart(divEl, ...)`
   * leaves this `false`).
   *
   * Sampled once at construction time because:
   *   - `getRootNode()` is the only cheap way to ask this question
   *     ("am I in shadow DOM?") and the answer doesn't change for a
   *     given mounted instance — moving the host element between
   *     shadow / light DOM after `echarts.init` isn't a supported
   *     scenario (ECharts would need a re-init anyway).
   *   - Doing it once avoids paying the cost every `update()` /
   *     `setTheme()` call when the value can never change.
   *
   * Threaded through every `_apply()` call via {@link RenderContext}.
   * Adapters consume it from `buildTooltip` / `buildSparkTooltip` (and
   * the inline tooltip blocks in pie / sankey / chord / radar) to
   * default `tooltip.appendToBody`: `true` in light DOM so the tooltip
   * escapes `overflow: hidden` ancestors like cards / dialogs, `false`
   * inside shadow DOM so the tooltip stays inside the web component
   * for style encapsulation. Users can still override via
   * `options.tooltip.appendToBody`.
   *
   * Conservative on non-DOM platforms (SSR / tests without
   * `ShadowRoot`): when the `ShadowRoot` global is undefined we treat
   * the container as light DOM, which matches the dominant CSR path
   * and keeps tooltips functional.
   */
  private _inShadowDom: boolean;
  /**
   * Set to `true` by the first successful {@link dispose} call. Guards
   * the dispose body against double-execution — necessary because the
   * `<i-chart>` web component's `disconnectedCallback` and our own
   * sentinel-driven auto-dispose can both race to tear down the same
   * instance when an `<i-chart>` element is removed from the document.
   * ECharts' own dispose is idempotent internally but emits a console
   * warning on the second call; skipping the redundant work is cleaner.
   */
  private _disposed = false;
  /**
   * Sentinel handle returned by {@link installSentinel}; held so
   * {@link dispose} can detach the sentinel without triggering its own
   * disconnect callback (which would re-enter dispose). `null` in
   * environments without `customElements` / `document` — those rely on
   * the registry's `pruneDetachedCharts` walk during the next theme or
   * `consistentColors` change.
   */
  private _sentinel: SentinelHandle | null = null;
  /**
   * Reference to the async-tooltip `dismiss` callback currently bound to
   * the ECharts `hideTip` event. Re-bound on every `_apply()` because the
   * adapter pipeline creates a fresh formatter closure (and a fresh
   * `dismiss`) each resolve — we have to `off()` the previous reference
   * before `on()`-ing the new one to avoid stacking listeners.
   *
   * When set, ECharts fires this on every tooltip dismissal so the
   * formatter's HTML cache lives exactly for the duration of one
   * tooltip session — a new hover after dismissal re-fetches fresh
   * data, while rapid cursor motion within a session still dedupes
   * down to a single `customHtml` call.
   *
   * `null` when the resolved option has no async-tooltip formatter
   * (e.g. spark charts, gauge, or chart types whose adapter doesn't
   * call `createAsyncTooltipFormatter`).
   */
  private _asyncTooltipDismiss: (() => void) | null = null;
  /**
   * Teardown callback returned by the adapter's most recent `onInit`
   * (see {@link ChartTeardown}). The engine owns its lifecycle so adapters
   * that wire `ResizeObserver` / listeners / timers in `onInit` get a
   * deterministic cleanup point: we run it before the next `_apply()`'s
   * `onInit` and once more on `dispose()`. `null` when the last `onInit`
   * returned nothing (or no adapter wires one).
   */
  private _applyCleanup: (() => void) | null = null;
  /**
   * ECharts event wrappers currently bound for `options.events` handlers.
   * Re-derived on every `_apply()` (handlers can change via `update`), so we
   * detach the previous wrappers before attaching new ones to avoid stacking
   * listeners. Each entry pairs the ECharts event name with the wrapper we
   * registered so we can `off()` exactly what we `on()`-ed.
   */
  private _boundEvents: Array<{
    event: ChartEventType;
    handler: (params: unknown) => void;
  }> = [];

  constructor(
    container: HTMLElement,
    type: string,
    data: ChartData,
    options: AnyChartOptions = {},
  ) {
    ensureThemesRegistered();
    this._type = type;
    this._data = data;
    this._options = options;
    this._activeTheme = resolveThemeName(options.theme);
    this._inShadowDom =
      typeof ShadowRoot !== 'undefined' &&
      container.getRootNode() instanceof ShadowRoot;
    this.ecInstance = echarts.init(container, this._activeTheme);
    chartRegistry.add(this);
    this._apply();
    // Auto-dispose on container detach. Installed AFTER `_apply()` so a
    // throwing adapter doesn't leave behind a sentinel whose disposer
    // would race a half-initialized chart through `dispose()`. See
    // disconnect-sentinel.ts for the full rationale (Vue Teleport
    // self-healing, HMR, `<i-chart>` double-dispose ordering).
    this._sentinel = installSentinel(container, () => this.dispose());
  }

  update(newData?: ChartData, newOptions?: AnyChartOptions): void {
    if (newData !== undefined) {
      // Live-updating adapters (gauge, liquid-progress, or any custom type)
      // opt into cross-frame data merging via `adapter.mergeData`. Only fold
      // when both the prior and incoming data pass the adapter's own guard,
      // so a partial `{ value }` patch carries `max` / `label` forward;
      // everything else replaces wholesale (the default).
      const adapter = getAdapter(this._type);
      this._data =
        adapter?.mergeData &&
        adapter.validate(this._data) &&
        adapter.validate(newData)
          ? adapter.mergeData(this._data, newData)
          : newData;
    }
    if (newOptions) this._options = { ...this._options, ...newOptions };

    // Sample the inter-update interval BEFORE re-rendering so adapters can
    // use it as a default for their per-frame animation duration. The first
    // call has nothing to measure against — adapters fall back to their
    // own defaults in that case.
    const now = performance.now();
    const observedFrameMs =
      this._lastUpdateAt !== null ? now - this._lastUpdateAt : undefined;
    this._lastUpdateAt = now;

    this._apply({
      observedFrameMs,
      maxRaceGridRight: this._maxGridRight || undefined,
    });
  }

  setTheme(theme: string): void {
    this._options = { ...this._options, theme };
    const name = resolveThemeName(theme);
    if (this._activeTheme !== name) {
      this._activeTheme = name;
      // Some custom-series renderers (e.g. wordcloud) leave stale display
      // elements in place during ECharts' diff/merge on a theme switch,
      // which shows up as duplicated/overlapped marks. Adapters opt into a
      // pre-repaint clear via `clearOnThemeChange`; the engine no longer
      // hardcodes per-type behavior here.
      if (getAdapter(this._type)?.clearOnThemeChange) {
        this.ecInstance.clear?.();
      }
      this.ecInstance.setTheme(name);
    }
    // Theme switches don't represent a frame tick — don't poison the
    // observed interval with the (potentially long) time since the last
    // user-driven update.
    this._apply();
  }

  resize(): void {
    this.ecInstance.resize();
    // Re-invoke the adapter so container-aware sizing (e.g. gauge
    // `percentage` ring thickness / inner font size, both computed from
    // `min(containerWidth, containerHeight)` in `RenderContext`) re-flows
    // against the new viewport. Other adapters' resolved options don't
    // depend on container dims, so this is a deterministic no-op for
    // them. Race-frame timing (`_lastUpdateAt`) is intentionally
    // untouched — only `update()` advances it — so a flurry of resize
    // events can't poison `observedFrameMs`.
    this._apply();
  }

  dispose(): void {
    // Idempotent: see `_disposed` above. Both `<i-chart>`'s Lit
    // disconnect path and our sentinel can fire dispose for the same
    // instance during the same teardown — exit early on the second
    // call rather than asking ECharts to dispose twice.
    if (this._disposed) return;
    this._disposed = true;
    // Detach the sentinel first, *before* anything else can throw —
    // its `remove()` clears the callback so the synchronous
    // `disconnectedCallback` it triggers is a no-op. If we did this
    // last, an `ecInstance.dispose()` throw would leak the sentinel
    // (still living in `container`, still holding a closure over a
    // disposed-but-still-registered chart).
    this._sentinel?.remove();
    this._sentinel = null;
    // ECharts' own `dispose()` clears every listener internally, so we
    // only need to drop our local reference — no `off('hideTip', ...)`
    // call here (which would throw post-dispose on some ECharts builds).
    this._asyncTooltipDismiss = null;
    // ECharts' dispose() clears its own listeners; just drop our references
    // to the event wrappers so they (and the options closure they hold) can
    // be collected.
    this._boundEvents = [];
    // Run the adapter's final teardown (e.g. disconnect a ResizeObserver)
    // before ECharts tears down the instance.
    this._runApplyCleanup();
    // Release this chart's consistentColors name lease so any auto-assigned
    // palette slot it was the last holder of is recycled. This is the primary
    // cleanup path that makes the registry / sentinel sweeps a fallback rather
    // than load-bearing — see `releaseColorOwner` / `PaletteRegistry`.
    releaseColorOwner(this);
    chartRegistry.delete(this);
    this.ecInstance.dispose();
  }

  getEChartsInstance(): echarts.ECharts {
    return this.ecInstance;
  }

  /** Change the chart type (used by the web component when the `type` property changes). */
  setType(type: string): void {
    this._type = type;
  }

  private _apply(ctx?: RenderContext): void {
    // `inShadowDom` and container dims are engine-owned: every render
    // path must see them, even the ones (constructor, `setTheme`,
    // `resize`) that pass no caller ctx. Merging here keeps each call
    // site terse and prevents the flags from being silently dropped
    // when a future code path forgets to forward them.
    //
    // Container dims are sampled fresh each render so resize-triggered
    // re-renders pick up the new viewport. Non-finite / zero readings
    // (SSR, `display:none` ancestor, jsdom without layout) are
    // surfaced as `undefined` so adapters can fall back to their
    // static defaults rather than emit garbage sizes. `getWidth` /
    // `getHeight` are probed defensively (optional call) so test
    // doubles that don't bother implementing the full ECharts surface
    // — see `src/core.test.ts` — keep working; real ECharts instances
    // always implement them.
    const w = this.ecInstance.getWidth?.();
    const h = this.ecInstance.getHeight?.();
    const fullCtx: RenderContext = {
      ...ctx,
      inShadowDom: this._inShadowDom,
      containerWidth:
        typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : undefined,
      containerHeight:
        typeof h === 'number' && Number.isFinite(h) && h > 0 ? h : undefined,
    };
    // Bracket the adapter resolve with a color render session so the names it
    // resolves (via `resolveColors`, when `consistentColors` is on) become a
    // refcounted lease owned by this chart. `dispose()` releases the lease and
    // recycles freed palette slots — see `releaseColorOwner` below and
    // `PaletteRegistry`. The session wraps only the resolve (where colors are
    // computed); `try/finally` guarantees the session closes even if an
    // adapter throws, and keeps `onInit` / `setOption` outside the session so
    // a re-entrant render (e.g. an `onInit` calling `resize()`) can't nest.
    const renderThemeName = resolveThemeName(this._options.theme);
    let resolved: ReturnType<typeof resolveEChartsOption>;
    beginColorRender(this, renderThemeName);
    try {
      resolved = resolveEChartsOption(
        this._type,
        this._data,
        this._options,
        fullCtx,
      );
    } finally {
      endColorRender(this);
    }
    const { option, onInit, notMerge } = resolved;
    applyConfiguredFontFamilyToOption(option, getConfig().fontFamily);
    this._observeGridRight(option);
    this.ecInstance.setOption(option, notMerge ?? true);
    this._rebindAsyncTooltipDismiss(option);
    this._rebindEvents();
    // Tear down the previous render's adapter effect before re-running
    // `onInit` so each pass starts from a clean slate (no stacked
    // observers / listeners). The adapter may return a fresh teardown.
    this._runApplyCleanup();
    const cleanup = onInit?.(this.ecInstance);
    this._applyCleanup = typeof cleanup === 'function' ? cleanup : null;
  }

  /**
   * Bind `options.events` handlers to the underlying ECharts instance,
   * normalizing each raw `params` into a {@link ChartEventContext} via
   * {@link buildChartEventContext}. Mirrors `_rebindAsyncTooltipDismiss`:
   * re-derived on every `_apply()` (handlers can change via `update`), so we
   * detach the previous wrappers first and never stack listeners. A throwing
   * user handler is swallowed so one bad callback can't break ECharts'
   * internal event dispatch.
   */
  private _rebindEvents(): void {
    const ec = this.ecInstance as unknown as {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      off?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    if (this._boundEvents.length && typeof ec.off === 'function') {
      for (const { event, handler } of this._boundEvents) {
        ec.off(event, handler);
      }
    }
    this._boundEvents = [];

    const events = this._options.events;
    if (!events || typeof ec.on !== 'function') return;

    const mapping: Array<[ChartEventType, ChartEventHandler | undefined]> = [
      ['click', events.onClick],
      ['dblclick', events.onDoubleClick],
      ['mouseover', events.onMouseOver],
      ['mouseout', events.onMouseOut],
    ];

    for (const [event, fn] of mapping) {
      if (typeof fn !== 'function') continue;
      const wrapper = (params: unknown): void => {
        try {
          fn(buildChartEventContext(event, params));
        } catch {
          // A user event handler must never break ECharts' event dispatch.
        }
      };
      ec.on(event, wrapper);
      this._boundEvents.push({ event, handler: wrapper });
    }
  }

  /** Run and clear the pending adapter teardown, swallowing its errors. */
  private _runApplyCleanup(): void {
    if (!this._applyCleanup) return;
    const cleanup = this._applyCleanup;
    this._applyCleanup = null;
    try {
      cleanup();
    } catch {
      // A misbehaving adapter teardown must never break the render /
      // dispose path. Swallow — the engine has already dropped its
      // reference, so a throwing cleanup can't wedge subsequent passes.
    }
  }

  /**
   * Wire `formatter.dismiss` (from {@link createAsyncTooltipFormatter}) to
   * ECharts' `hideTip` event so the formatter's per-slice HTML cache is
   * cleared whenever the tooltip closes. The cache then only deduplicates
   * `customHtml` calls *within* a single tooltip session — next hover
   * re-fetches fresh data.
   *
   * Idempotent across repeated `_apply()` calls: we detach the previous
   * formatter's listener before attaching the new one, so re-renders
   * (`update()`, `setTheme()`, `resize()`) never stack listeners.
   */
  private _rebindAsyncTooltipDismiss(option: unknown): void {
    const next = extractAsyncTooltipDismiss(option);
    if (next === this._asyncTooltipDismiss) return;
    const ec = this.ecInstance as unknown as {
      off?: (event: string, handler: (...args: unknown[]) => void) => void;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    if (this._asyncTooltipDismiss && typeof ec.off === 'function') {
      ec.off('hideTip', this._asyncTooltipDismiss);
    }
    this._asyncTooltipDismiss = next;
    if (next && typeof ec.on === 'function') {
      ec.on('hideTip', next);
    }
  }

  /**
   * Lift the high-water mark for `grid.right` from the resolved option so
   * the next `update()` can feed it back via {@link RenderContext}. Race
   * adapters use this to keep label headroom monotonic — see
   * `resolveRaceLabelHeadroom`. Tolerant of options without a grid (e.g.
   * pie, gauge) and of `grid` being either an object or an array.
   */
  private _observeGridRight(option: unknown): void {
    const grid = (option as { grid?: unknown }).grid;
    const first = Array.isArray(grid) ? grid[0] : grid;
    const right = (first as { right?: unknown } | undefined)?.right;
    if (typeof right === 'number' && right > this._maxGridRight) {
      this._maxGridRight = right;
    }
  }
}

/**
 * Walk a resolved ECharts option for a `tooltip.formatter` produced by
 * {@link createAsyncTooltipFormatter} (identified by the `dismiss`
 * function property attached to the formatter callable). Tolerant of:
 *
 *   - `tooltip` being either an object (typical) or an array (when the
 *     user passes multiple tooltip configurations through
 *     `echarts.tooltip`),
 *   - `formatter` being a plain string, undefined, or a function without
 *     a `dismiss` property (e.g. a user-supplied formatter that bypasses
 *     the async pipeline).
 *
 * Returns the first matching `dismiss` callback, or `null` when nothing
 * async-tooltip-shaped is present.
 */
function extractAsyncTooltipDismiss(option: unknown): (() => void) | null {
  const tooltip = (option as { tooltip?: unknown }).tooltip;
  if (!tooltip) return null;
  const candidates = Array.isArray(tooltip) ? tooltip : [tooltip];
  for (const t of candidates) {
    const fmt = (t as { formatter?: unknown } | undefined)?.formatter;
    if (typeof fmt !== 'function') continue;
    const maybeDismiss = (fmt as { dismiss?: unknown }).dismiss;
    if (typeof maybeDismiss === 'function') {
      return maybeDismiss as () => void;
    }
  }
  return null;
}
