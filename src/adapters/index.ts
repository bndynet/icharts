import type * as echarts from 'echarts';
import type { ChartData, ChartOptions } from '../types.js';

/**
 * Result returned by an adapter's resolve method.
 *
 * `option`  -- full ECharts option ready for setOption().
 * `onInit`  -- optional hook called once after the instance is initialised
 *              and setOption() has been called (e.g. for event listeners).
 */
export interface ChartSetupResult {
  option: Record<string, unknown>;
  onInit?: (instance: echarts.ECharts) => void;
}

/**
 * Contract every chart adapter must satisfy.
 *
 * `validate` -- returns true when `data` has the shape this adapter expects.
 * `resolve`  -- builds the ECharts option (and optional onInit hook).
 */
export interface ChartAdapter {
  validate(data: ChartData): boolean;
  resolve(data: ChartData, options: ChartOptions): ChartSetupResult;
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
  return adapter.resolve(data, options);
}

// ---------------------------------------------------------------------------
// Register built-in adapters
// ---------------------------------------------------------------------------

import { ChartType, isXYData, isPieData, isGaugeData, isSankeyData, isChordData } from '../types.js';
import type { XYData, PieData, GaugeData, SankeyData, ChordData } from '../types.js';
import { resolveLineOptions, resolveAreaOptions } from './line.js';
import { resolveBarOptions } from './bar.js';
import { resolvePieOptions } from './pie.js';
import { resolveGaugeOptions } from './gauge.js';
import { resolveSankeyOptions } from './sankey.js';
import { resolveChordOptions } from './chord.js';

registerAdapter(ChartType.Line, {
  validate: isXYData,
  resolve: (data, options) => ({
    option: resolveLineOptions(data as XYData, options),
  }),
});

registerAdapter(ChartType.Area, {
  validate: isXYData,
  resolve: (data, options) => ({
    option: resolveAreaOptions(data as XYData, options),
  }),
});

registerAdapter(ChartType.Bar, {
  validate: isXYData,
  resolve: (data, options) => ({
    option: resolveBarOptions(data as XYData, options),
  }),
});

registerAdapter(ChartType.Pie, {
  validate: isPieData,
  resolve: (data, options) => ({
    option: resolvePieOptions(data as PieData, options),
  }),
});

registerAdapter(ChartType.Gauge, {
  validate: isGaugeData,
  resolve: (data, options) => ({
    option: resolveGaugeOptions(data as GaugeData, options),
  }),
});

registerAdapter(ChartType.Sankey, {
  validate: isSankeyData,
  resolve: (data, options) => ({
    option: resolveSankeyOptions(data as SankeyData, options),
  }),
});

registerAdapter(ChartType.Chord, {
  validate: isChordData,
  resolve: (data, options) => resolveChordOptions(data as ChordData, options),
});
