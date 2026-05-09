import * as echarts from 'echarts';
import type { ChartData, AnyChartOptions, IChartInstance } from './types.js';
import { resolveEChartsOption, type RenderContext } from './adapters/index.js';
import { ensureThemesRegistered, resolveThemeName } from './themes/index.js';
import { chartRegistry } from './registry.js';

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
    this.ecInstance = echarts.init(container, this._activeTheme);
    chartRegistry.add(this);
    this._apply();
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
    const { option, onInit, notMerge } = resolveEChartsOption(
      this._type,
      this._data,
      this._options,
      ctx,
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
