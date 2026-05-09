import type * as echarts from 'echarts';
import type { ChartData, ChartOptions } from '../types.js';

/**
 * Result returned by an adapter's resolve method.
 *
 * `option`    -- full ECharts option ready for setOption().
 * `onInit`    -- optional hook called once after the instance is initialised
 *                and setOption() has been called (e.g. for event listeners).
 * `notMerge`  -- forwarded to ECharts `setOption(option, notMerge)`. Defaults
 *                to `true` (full replace). Adapters that depend on cross-call
 *                state transitions (e.g. bar `race` needs ECharts to animate
 *                value/position changes between successive `chart.update()`
 *                calls) set this to `false` so ECharts merges with the
 *                previous option instead of replacing it.
 */
export interface ChartSetupResult {
  option: Record<string, unknown>;
  onInit?: (instance: echarts.ECharts) => void;
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
 *
 * Frame-derived fields (`observedFrameMs`, `maxRaceGridRight`) are
 * `undefined` during the initial render from the constructor; container-
 * derived fields (`inShadowDom`) are populated from the very first render.
 */
export interface RenderContext {
  observedFrameMs?: number;
  maxRaceGridRight?: number;
  inShadowDom?: boolean;
}

/**
 * Contract every chart adapter must satisfy.
 *
 * `validate` -- returns true when `data` has the shape this adapter expects.
 * `resolve`  -- builds the ECharts option (and optional onInit hook).
 *               `ctx` is optional; adapters that don't need it ignore the arg.
 */
export interface ChartAdapter {
  validate(data: ChartData): boolean;
  resolve(
    data: ChartData,
    options: ChartOptions,
    ctx?: RenderContext,
  ): ChartSetupResult;
}

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

const adapterRegistry = new Map<string, ChartAdapter>();

/**
 * Register a chart adapter for a given type string.
 * Built-in adapters are registered at module load time.
 * Users can call this to add custom chart types.
 */
export function registerAdapter(type: string, adapter: ChartAdapter): void {
  adapterRegistry.set(type, adapter);
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
    throw new Error(`Unsupported chart type: "${type}"`);
  }
  if (!adapter.validate(data)) {
    throw new Error(
      `Invalid data for chart type "${type}": ` +
        JSON.stringify(data).slice(0, 100),
    );
  }
  return adapter.resolve(data, options, ctx);
}

// ---------------------------------------------------------------------------
// Register built-in adapters
// ---------------------------------------------------------------------------

import { ChartType, isXYData, isPieData, isGaugeData, isSankeyData, isChordData, isRadarData } from '../types.js';
import type {
  LineData,
  BarData,
  AreaData,
  PieData,
  GaugeData,
  SankeyData,
  ChordData,
  RadarData,
  LineChartOptions,
  BarChartOptions,
  AreaChartOptions,
  PieChartOptions,
  GaugeChartOptions,
  SankeyChartOptions,
  ChordChartOptions,
  RadarChartOptions,
} from '../types.js';
import { resolveLineOptions, resolveAreaOptions } from './line.js';
import { resolveBarOptions } from './bar.js';
import { resolvePieOptions } from './pie.js';
import { resolveGaugeOptions } from './gauge.js';
import { resolveSankeyOptions } from './sankey.js';
import { resolveChordOptions } from './chord.js';
import { resolveRadarOptions } from './radar.js';

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
  resolve: (data, options) => ({
    option: resolveGaugeOptions(data as GaugeData, options as GaugeChartOptions),
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
