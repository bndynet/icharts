import * as echarts from 'echarts';
import type { ChartData, AnyChartOptions, IChartInstance } from './types.js';
import { resolveEChartsOption, type RenderContext } from './adapters/index.js';
import { ensureThemesRegistered, resolveThemeName } from './themes/index.js';
import { chartRegistry } from './registry.js';
import { installSentinel, type SentinelHandle } from './disconnect-sentinel.js';

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
    if (newData !== undefined) this._data = newData;
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
      this.ecInstance.setTheme(name);
    }
    // Theme switches don't represent a frame tick — don't poison the
    // observed interval with the (potentially long) time since the last
    // user-driven update.
    this._apply();
  }

  resize(): void {
    this.ecInstance.resize();
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
    // `inShadowDom` is engine-owned: every render path must see it,
    // even the ones (constructor, `setTheme`) that pass no caller ctx.
    // Merging here keeps each call site terse and prevents the flag
    // from being silently dropped when a future code path forgets to
    // forward it.
    const fullCtx: RenderContext = {
      ...ctx,
      inShadowDom: this._inShadowDom,
    };
    const { option, onInit, notMerge } = resolveEChartsOption(
      this._type,
      this._data,
      this._options,
      fullCtx,
    );
    this._observeGridRight(option);
    this.ecInstance.setOption(option, notMerge ?? true);
    onInit?.(this.ecInstance);
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
