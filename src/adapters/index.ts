import type * as echarts from 'echarts';
import type { ChartData, ChartOptions } from '../types.js';

/**
 * Cleanup callback an adapter's `onInit` may return. The engine runs it on
 * the next re-render (before the next `onInit`) and on `dispose()`, so an
 * adapter that wires `ResizeObserver` / event listeners / timers in `onInit`
 * has a deterministic teardown point — no need to stash state on the chart
 * instance or poll `isDisposed()`.
 */
export type ChartTeardown = () => void;

/**
 * Result returned by an adapter's resolve method.
 *
 * `option`    -- full ECharts option ready for setOption().
 * `onInit`    -- optional hook called after the instance is initialised and
 *                setOption() has been called (e.g. for event listeners). It
 *                fires on every render pass (initial + every update / theme /
 *                resize). May return a {@link ChartTeardown} cleanup; the
 *                engine invokes the previous pass's cleanup before the next
 *                `onInit`, and the final cleanup on `dispose()`.
 * `notMerge`  -- forwarded to ECharts `setOption(option, notMerge)`. Defaults
 *                to `true` (full replace). Adapters that depend on cross-call
 *                state transitions (e.g. bar `race` needs ECharts to animate
 *                value/position changes between successive `chart.update()`
 *                calls) set this to `false` so ECharts merges with the
 *                previous option instead of replacing it.
 */
export interface ChartSetupResult {
  option: Record<string, unknown>;
  onInit?: (instance: echarts.ECharts) => void | ChartTeardown;
  notMerge?: boolean;
}

/**
 * Per-render context the engine passes to adapters alongside data/options.
 *
 * Carries lightweight signals derived from prior render passes — or from
 * the chart container itself — so adapters can make better decisions
 * without holding their own state or doing their own DOM lookups:
 *
 *   - `observedFrameMs` — wall-clock gap between the last two `chart.update()`
 *     calls. Race / streaming adapters use this to auto-size
 *     `animationDurationUpdate` so callers don't have to mirror their own
 *     `setInterval` value as `race.frameDuration`. `undefined` on the very
 *     first `update()` (no prior call to measure against).
 *   - `maxRaceGridRight` — high-water mark of the largest `grid.right` any
 *     prior frame asked for. Race adapters mix this into their adaptive
 *     label-headroom calculation (see `resolveRaceLabelHeadroom`) so the
 *     reserved space grows monotonically as labels widen and never shrinks
 *     back, avoiding plot-area jitter when label digits flip frame to frame.
 *   - `inShadowDom` — `true` when the chart container's root is a
 *     `ShadowRoot` (e.g. the `<i-chart>` web component). Tooltip helpers
 *     (`buildTooltip` / `buildSparkTooltip`) use this to decide the default
 *     value of ECharts' `appendToBody`: `false` inside shadow DOM (so the
 *     tooltip stays inside the shadow root for style encapsulation) and
 *     `true` in light DOM (so it can escape ancestors with `overflow:
 *     hidden` like card / KPI containers). Users can still override via
 *     `options.tooltip.appendToBody`. The engine sets this flag once at
 *     construction time — moving the host between shadow / light DOM
 *     after `init` isn't a supported scenario.
 *   - `containerWidth` / `containerHeight` — px reported by
 *     `ecInstance.getWidth()` / `getHeight()` at render time. Threaded
 *     through every `_apply()` (including resize-triggered re-renders)
 *     so adapters that need pixel-derived sizing can react to the
 *     actual rendered viewport. Today the gauge `percentage` variant is
 *     the canonical consumer: ECharts' `axisLine.lineStyle.width`,
 *     `progress.width`, and `detail.fontSize` are pixel-only (no native
 *     `%` support), so the adapter computes them from
 *     `min(containerWidth, containerHeight)` when the consumer hasn't
 *     set them. Both fields are `undefined` when the instance reports a
 *     zero / non-finite size (SSR, display:none ancestors, jsdom
 *     environments without layout) so adapters can fall back to static
 *     defaults and keep snapshots stable.
 *
 * Frame-derived fields (`observedFrameMs`, `maxRaceGridRight`) are
 * `undefined` during the initial render from the constructor;
 * container-derived fields (`inShadowDom`, `containerWidth`,
 * `containerHeight`) are populated from the very first render.
 */
export interface RenderContext {
  observedFrameMs?: number;
  maxRaceGridRight?: number;
  inShadowDom?: boolean;
  containerWidth?: number;
  containerHeight?: number;
}

/**
 * Contract every chart adapter must satisfy.
 *
 * `validate` -- returns true when `data` has the shape this adapter expects.
 * `resolve`  -- builds the ECharts option (and optional onInit hook).
 *               `ctx` is optional; adapters that don't need it ignore the arg.
 *
 * `mergeData` -- optional. When provided, the engine calls it on `update()`
 *               to fold the next data into the previous frame instead of
 *               replacing it wholesale. This lets live-updating charts
 *               (e.g. gauge, liquid-progress) animate value transitions
 *               across successive `chart.update({ value })` calls — the
 *               caller can send a partial patch and the adapter decides how
 *               to carry forward fields it isn't given. The engine only
 *               invokes it when BOTH the previous and next data pass
 *               `validate`, so an adapter's `mergeData` can safely narrow to
 *               its own data shape. When omitted, the engine replaces data
 *               (the default).
 *
 * `clearOnThemeChange` -- optional. When `true`, the engine calls
 *               `instance.clear()` before re-applying on a `setTheme()`
 *               switch. Needed by custom-series renderers (e.g. wordcloud)
 *               whose diff/merge can leave stale display elements behind on
 *               a theme repaint. Defaults to `false`.
 */
export interface ChartAdapter {
  validate(data: ChartData): boolean;
  resolve(
    data: ChartData,
    options: ChartOptions,
    ctx?: RenderContext,
  ): ChartSetupResult;
  mergeData?(prev: ChartData, next: ChartData): ChartData;
  clearOnThemeChange?: boolean;
}

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

const adapterRegistry = new Map<string, ChartAdapter>();

/**
 * Snapshot of the type strings owned by built-in adapters. Populated once at
 * the bottom of this module after all built-ins are registered (stays `null`
 * during built-in registration so those calls never warn). Used solely to
 * flag the uncommon case of a consumer silently shadowing a built-in type.
 */
let builtinTypes: ReadonlySet<string> | null = null;

/**
 * Register a chart adapter for a given type string.
 * Built-in adapters are registered at module load time.
 * Users can call this to add custom chart types.
 *
 * Overriding a **built-in** type emits a `console.warn` (the override still
 * takes effect). This is almost always an accidental type-string collision;
 * prefer a distinct string for custom charts. Re-registering a custom type is
 * silent.
 */
export function registerAdapter(type: string, adapter: ChartAdapter): void {
  if (builtinTypes?.has(type) && adapterRegistry.get(type) !== adapter) {
    console.warn(
      `[icharts] registerAdapter("${type}") overrides a built-in chart type. ` +
        `If this is intentional you can ignore this; otherwise use a distinct ` +
        `type string for your custom chart to avoid shadowing the built-in.`,
    );
  }
  adapterRegistry.set(type, adapter);
}

/**
 * Look up the adapter registered for a given chart type, or `undefined` when
 * none is registered. Used by the engine to consult optional adapter
 * capabilities (`mergeData`, `clearOnThemeChange`) without hardcoding
 * per-type behavior.
 */
export function getAdapter(type: string): ChartAdapter | undefined {
  return adapterRegistry.get(type);
}

/**
 * Whether an adapter is registered for `type` (built-in or custom). Cheap
 * pre-flight check before `createChart` so callers can branch without a
 * try/catch around the engine's "Unsupported chart type" throw.
 */
export function hasAdapter(type: string): boolean {
  return adapterRegistry.has(type);
}

/**
 * The type strings of every registered adapter (built-in + custom), in
 * registration order. Useful for diagnostics, building a type picker, or
 * asserting a custom adapter registered as expected.
 */
export function listAdapters(): string[] {
  return [...adapterRegistry.keys()];
}

/**
 * Remove a previously registered adapter. Returns `true` if one was removed,
 * `false` if no adapter was registered for `type`. Primarily for tests and
 * hot-reload scenarios; removing a built-in is allowed but leaves that type
 * unusable until re-registered.
 */
export function unregisterAdapter(type: string): boolean {
  return adapterRegistry.delete(type);
}

/**
 * Human-readable, value-free description of a data payload's shape. Used to
 * build actionable validation errors without echoing the user's (potentially
 * sensitive / large) data values back into the message.
 */
function describeDataShape(data: unknown): string {
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';
  if (Array.isArray(data)) return `an array of length ${data.length}`;
  if (typeof data === 'object') {
    const keys = Object.keys(data as object);
    return keys.length
      ? `an object with keys [${keys.join(', ')}]`
      : 'an empty object';
  }
  return `a ${typeof data}`;
}

/**
 * Resolve chart data + options into a ChartSetupResult.
 */
export function resolveEChartsOption(
  type: string,
  data: ChartData,
  options: ChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const adapter = adapterRegistry.get(type);
  if (!adapter) {
    const known = listAdapters();
    throw new Error(
      `Unsupported chart type: "${type}". ` +
        (known.length
          ? `Registered types: ${known.join(', ')}. `
          : '') +
        `Register a custom adapter with registerAdapter("${type}", ...) first.`,
    );
  }
  if (!adapter.validate(data)) {
    throw new Error(
      `Invalid data for chart type "${type}": received ${describeDataShape(data)}. ` +
        `See the expected data format in docs/chart-*.md (or the chart's data type).`,
    );
  }
  return adapter.resolve(data, options, ctx);
}

// ---------------------------------------------------------------------------
// Register built-in adapters
// ---------------------------------------------------------------------------

import {
  ChartType,
  isXYData,
  isPieData,
  isGaugeData,
  mergeGaugeData,
  isLiquidProgressData,
  mergeLiquidProgressData,
  isSankeyData,
  isChordData,
  isRadarData,
  isNetworkData,
  isTreeData,
  isTreemapData,
  isWordCloudData,
} from '../types.js';
import type {
  LineData,
  BarData,
  AreaData,
  PieData,
  GaugeData,
  LiquidProgressData,
  SankeyData,
  ChordData,
  RadarData,
  NetworkData,
  TreeData,
  TreemapData,
  WordCloudData,
  LineChartOptions,
  BarChartOptions,
  AreaChartOptions,
  PieChartOptions,
  GaugeChartOptions,
  LiquidProgressChartOptions,
  SankeyChartOptions,
  ChordChartOptions,
  RadarChartOptions,
  NetworkChartOptions,
  TreeChartOptions,
  TreemapChartOptions,
  WordCloudChartOptions,
} from '../types.js';
import { resolveLineOptions, resolveAreaOptions } from './line.js';
import { resolveBarOptions } from './bar.js';
import { resolvePieOptions } from './pie.js';
import { resolveGaugeOptions } from './gauge.js';
import { resolveLiquidProgressOptions } from './liquid-progress.js';
import { resolveSankeyOptions } from './sankey.js';
import { resolveChordOptions } from './chord.js';
import { resolveRadarOptions } from './radar.js';
import { resolveNetworkOptions } from './network.js';
import { resolveTreeSetup } from './tree.js';
import { resolveTreemapOptions } from './treemap.js';
import { resolveWordCloudOptions } from './word-cloud.js';

// Each built-in adapter narrows the generic `ChartData` / `ChartOptions` it
// receives from the registry to its declared per-chart Data + Options pair.
// `validate` has already verified the data shape at this point.

registerAdapter(ChartType.Line, {
  validate: isXYData,
  resolve: (data, options, ctx) =>
    resolveLineOptions(data as LineData, options as LineChartOptions, ctx),
});

registerAdapter(ChartType.Area, {
  validate: isXYData,
  resolve: (data, options, ctx) => ({
    option: resolveAreaOptions(data as AreaData, options as AreaChartOptions, ctx),
  }),
});

registerAdapter(ChartType.Bar, {
  validate: isXYData,
  resolve: (data, options, ctx) =>
    resolveBarOptions(data as BarData, options as BarChartOptions, ctx),
});

registerAdapter(ChartType.Pie, {
  validate: isPieData,
  resolve: (data, options, ctx) =>
    resolvePieOptions(data as PieData, options as PieChartOptions, ctx),
});

registerAdapter(ChartType.Gauge, {
  validate: isGaugeData,
  // Carry max / label forward when the consumer sends a partial `{ value }`
  // patch on each `chart.update()` tick (see mergeGaugeData).
  mergeData: (prev, next) => mergeGaugeData(prev as GaugeData, next as GaugeData),
  resolve: (data, options, ctx) => ({
    option: resolveGaugeOptions(data as GaugeData, options as GaugeChartOptions, ctx),
    // Merge successive frames so ECharts can animate pointer / progress /
    // detail.valueAnimation when consumers drive live metrics via
    // `chart.update({ value })` on an interval.
    notMerge: false,
  }),
});

registerAdapter(ChartType.LiquidProgress, {
  validate: isLiquidProgressData,
  mergeData: (prev, next) =>
    mergeLiquidProgressData(
      prev as LiquidProgressData,
      next as LiquidProgressData,
    ),
  resolve: (data, options, ctx) => ({
    option: resolveLiquidProgressOptions(
      data as LiquidProgressData,
      options as LiquidProgressChartOptions,
      ctx,
    ),
    notMerge: false,
  }),
});

registerAdapter(ChartType.Sankey, {
  validate: isSankeyData,
  resolve: (data, options, ctx) => ({
    option: resolveSankeyOptions(data as SankeyData, options as SankeyChartOptions, ctx),
  }),
});

registerAdapter(ChartType.Chord, {
  validate: isChordData,
  resolve: (data, options, ctx) =>
    resolveChordOptions(data as ChordData, options as ChordChartOptions, ctx),
});

registerAdapter(ChartType.Radar, {
  validate: isRadarData,
  resolve: (data, options, ctx) => ({
    option: resolveRadarOptions(data as RadarData, options as RadarChartOptions, ctx),
  }),
});

registerAdapter(ChartType.Network, {
  validate: isNetworkData,
  resolve: (data, options, ctx) => ({
    option: resolveNetworkOptions(data as NetworkData, options as NetworkChartOptions, ctx),
  }),
});

registerAdapter(ChartType.Tree, {
  validate: isTreeData,
  resolve: (data, options, ctx) =>
    resolveTreeSetup(data as TreeData, options as TreeChartOptions, ctx),
});

registerAdapter(ChartType.Treemap, {
  validate: isTreemapData,
  resolve: (data, options, ctx) => ({
    option: resolveTreemapOptions(
      data as TreemapData,
      options as TreemapChartOptions,
      ctx,
    ),
  }),
});

registerAdapter(ChartType.WordCloud, {
  validate: isWordCloudData,
  // The wordcloud custom-series renderer can leave stale display elements
  // behind during ECharts' diff/merge on a theme repaint — clear first.
  clearOnThemeChange: true,
  resolve: (data, options, ctx) => ({
    option: resolveWordCloudOptions(
      data as WordCloudData,
      options as WordCloudChartOptions,
      ctx,
    ),
  }),
});

// Freeze the set of built-in type strings now that every built-in is
// registered. From here on, `registerAdapter` warns when a consumer overrides
// one of these (see registerAdapter above).
builtinTypes = new Set(adapterRegistry.keys());
