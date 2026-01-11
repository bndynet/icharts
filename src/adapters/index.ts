import * as echarts from 'echarts';
import {
  ChartType,
  type ChartData,
  type ChartOptions,
  type XYData,
  type PieData,
  type GaugeData,
  type SankeyData,
  type ChordData,
  isXYData,
  isPieData,
  isGaugeData,
  isSankeyData,
  isChordData,
} from '../types.js';
import { resolveLineOptions, resolveAreaOptions } from './line.js';
import { resolveBarOptions } from './bar.js';
import { resolvePieOptions } from './pie.js';
import { resolveGaugeOptions } from './gauge.js';
import { resolveSankeyOptions } from './sankey.js';
import { buildChordChart, initChordChart } from './chord.js';

export type ResolverFn = (
  data: ChartData,
  options: ChartOptions,
) => Record<string, unknown>;

/**
 * Result returned by resolveEChartsOption.
 *
 * `option` is the full ECharts option object ready for setOption().
 * `onInit` is an optional hook called once after the ECharts instance is
 * initialised and setOption() has been called. Chart adapters use this to
 * attach interactivity that requires a live ECharts instance (e.g. event
 * listeners, dispatchAction calls).
 */
export interface ChartSetupResult {
  option: Record<string, unknown>;
  onInit?: (instance: echarts.ECharts) => void;
}

/**
 * Per-type post-init hooks for chart types with simple, stateless setup.
 * Chart types that need closure state (like Chord) handle their own onInit
 * inline in the switch case below.
 */
const INIT_HOOKS: Partial<Record<string, (instance: echarts.ECharts) => void>> = {};

/**
 * Resolve chart data + options into a ChartSetupResult.
 */
export function resolveEChartsOption(
  type: ChartType | string,
  data: ChartData,
  options: ChartOptions,
): ChartSetupResult {
  let option: Record<string, unknown>;

  switch (type) {
    case ChartType.Line:
      assertXY(data, type);
      option = resolveLineOptions(data as XYData, options);
      break;

    case ChartType.Area:
      assertXY(data, type);
      option = resolveAreaOptions(data as XYData, options);
      break;

    case ChartType.Bar:
      assertXY(data, type);
      option = resolveBarOptions(data as XYData, options);
      break;

    case ChartType.Pie:
      assertPie(data, type);
      option = resolvePieOptions(data as PieData, options);
      break;

    case ChartType.Gauge:
      assertGauge(data, type);
      option = resolveGaugeOptions(data as GaugeData, options);
      break;

    case ChartType.Sankey:
      assertSankey(data, type);
      option = resolveSankeyOptions(data as SankeyData, options);
      break;

    case ChartType.Chord: {
      assertChord(data, type);
      const { option: chordOption, setup } = buildChordChart(data as ChordData, options);
      return {
        option: chordOption,
        onInit: (inst) => initChordChart(inst, setup),
      };
    }

    default:
      throw new Error(`Unsupported chart type: "${type}"`);
  }

  return { option, onInit: INIT_HOOKS[type] };
}

function assertXY(data: ChartData, type: string): asserts data is XYData {
  if (!isXYData(data)) {
    throw new Error(
      `Chart type "${type}" requires XYData ({ categories, series }), ` +
      `but received ${JSON.stringify(data).slice(0, 100)}`,
    );
  }
}

function assertPie(data: ChartData, type: string): asserts data is PieData {
  if (!isPieData(data)) {
    throw new Error(
      `Chart type "${type}" requires PieData ([{ name, value }]), ` +
      `but received ${JSON.stringify(data).slice(0, 100)}`,
    );
  }
}

function assertGauge(data: ChartData, type: string): asserts data is GaugeData {
  if (!isGaugeData(data)) {
    throw new Error(
      `Chart type "${type}" requires GaugeData ({ value, max? }), ` +
      `but received ${JSON.stringify(data).slice(0, 100)}`,
    );
  }
}

function assertSankey(data: ChartData, type: string): asserts data is SankeyData {
  if (!isSankeyData(data)) {
    throw new Error(
      `Chart type "${type}" requires SankeyData ({ nodes, links }), ` +
      `but received ${JSON.stringify(data).slice(0, 100)}`,
    );
  }
}

function assertChord(data: ChartData, type: string): asserts data is ChordData {
  if (!isChordData(data)) {
    throw new Error(
      `Chart type "${type}" requires ChordData ({ nodes, links }), ` +
      `but received ${JSON.stringify(data).slice(0, 100)}`,
    );
  }
}
