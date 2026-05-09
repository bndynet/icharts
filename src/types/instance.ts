import type * as echarts from 'echarts';
import type { ChartOptions } from './base.js';
import type { XYData, XYChartOptions } from './xy.js';
import type { LineVariant, LineChartOptions } from './line.js';
import type { BarVariant, BarChartOptions } from './bar.js';
import type { AreaVariant, AreaChartOptions } from './area.js';
import type { PieVariant, PieData, PieChartOptions } from './pie.js';
import type { GaugeVariant, GaugeData, GaugeChartOptions } from './gauge.js';
import type { SankeyVariant, SankeyData, SankeyChartOptions } from './sankey.js';
import type { ChordData, ChordChartOptions } from './chord.js';
import type { RadarVariant, RadarData, RadarChartOptions } from './radar.js';

// ---------------------------------------------------------------------------
// Aggregate unions
//
// These compose the per-chart types into the public surface used by the
// adapter registry, the imperative API, and the web component.
// ---------------------------------------------------------------------------

export type ChartVariant =
  | LineVariant
  | BarVariant
  | AreaVariant
  | PieVariant
  | GaugeVariant
  | SankeyVariant
  | RadarVariant;

export type ChartData =
  | XYData
  | PieData
  | GaugeData
  | SankeyData
  | ChordData
  | RadarData;

/**
 * Discriminated union of every built-in chart's options type.
 *
 * Used as the public parameter type for `createChart`, the `IChart`
 * constructor, and the `<i-chart>` web component's `options` property so that
 * a chart-specific literal (e.g. `{ innerRadius: '50%' }`) type-checks as
 * `PieChartOptions` without forcing the caller to import and annotate the
 * subtype explicitly.
 */
export type AnyChartOptions =
  | ChartOptions
  | XYChartOptions
  | LineChartOptions
  | BarChartOptions
  | AreaChartOptions
  | PieChartOptions
  | GaugeChartOptions
  | SankeyChartOptions
  | ChordChartOptions
  | RadarChartOptions;

// ---------------------------------------------------------------------------
// Chart instance interface (returned by createChart)
// ---------------------------------------------------------------------------

export interface IChartInstance {
  update(data?: ChartData, options?: AnyChartOptions): void;
  /** Switch ECharts theme without disposing the instance (ECharts 6+). Updates series colors from the active palette. */
  setTheme(theme: string): void;
  resize(): void;
  dispose(): void;
  getEChartsInstance(): echarts.ECharts;
}
