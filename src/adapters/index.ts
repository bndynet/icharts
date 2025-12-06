import {
  ChartType,
  type ChartData,
  type ChartOptions,
  type XYData,
  type PieData,
  type GaugeData,
  isXYData,
  isPieData,
  isGaugeData,
} from '../types.js';
import { resolveLineOptions, resolveAreaOptions } from './line.js';
import { resolveBarOptions } from './bar.js';
import { resolvePieOptions } from './pie.js';
import { resolveGaugeOptions } from './gauge.js';

export type ResolverFn = (
  data: ChartData,
  options: ChartOptions,
) => Record<string, unknown>;

/**
 * Resolve chart data + options into a full ECharts option object
 * based on the chart type.
 */
export function resolveEChartsOption(
  type: ChartType | string,
  data: ChartData,
  options: ChartOptions,
): Record<string, unknown> {
  switch (type) {
    case ChartType.Line:
      assertXY(data, type);
      return resolveLineOptions(data as XYData, options);

    case ChartType.Area:
      assertXY(data, type);
      return resolveAreaOptions(data as XYData, options);

    case ChartType.Bar:
      assertXY(data, type);
      return resolveBarOptions(data as XYData, options);

    case ChartType.Pie:
      assertPie(data, type);
      return resolvePieOptions(data as PieData, options);

    case ChartType.Gauge:
      assertGauge(data, type);
      return resolveGaugeOptions(data as GaugeData, options);

    default:
      throw new Error(`Unsupported chart type: "${type}"`);
  }
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
