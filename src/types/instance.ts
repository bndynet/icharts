import type * as echarts from 'echarts';
import type { ChartOptions } from './base.js';
import type { XYData, XYChartOptions } from './xy.js';
import type { LineVariant, LineData, LineChartOptions } from './line.js';
import type { BarVariant, BarData, BarChartOptions } from './bar.js';
import type { AreaVariant, AreaData, AreaChartOptions } from './area.js';
import type { PieVariant, PieData, PieChartOptions } from './pie.js';
import type { GaugeVariant, GaugeData, GaugeChartOptions } from './gauge.js';
import type {
  LiquidProgressVariant,
  LiquidProgressData,
  LiquidProgressChartOptions,
} from './liquid-progress.js';
import type { SankeyVariant, SankeyData, SankeyChartOptions } from './sankey.js';
import type { ChordData, ChordChartOptions } from './chord.js';
import type { RadarVariant, RadarData, RadarChartOptions } from './radar.js';
import type { NetworkVariant, NetworkData, NetworkChartOptions } from './network.js';
import type { TreeData, TreeChartOptions } from './tree.js';
import type { TreemapData, TreemapChartOptions } from './treemap.js';
import type {
  WordCloudVariant,
  WordCloudData,
  WordCloudChartOptions,
} from './word-cloud.js';

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
  | LiquidProgressVariant
  | SankeyVariant
  | RadarVariant
  | NetworkVariant
  | WordCloudVariant;

export type ChartData =
  | XYData
  | PieData
  | GaugeData
  | LiquidProgressData
  | SankeyData
  | ChordData
  | RadarData
  | NetworkData
  | TreeData
  | TreemapData
  | WordCloudData;

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
  | LiquidProgressChartOptions
  | SankeyChartOptions
  | ChordChartOptions
  | RadarChartOptions
  | NetworkChartOptions
  | TreeChartOptions
  | TreemapChartOptions
  | WordCloudChartOptions;

// ---------------------------------------------------------------------------
// Chart type registry — type-level map from `type` string to its data/options
// ---------------------------------------------------------------------------

/**
 * Open registry mapping each chart `type` string to its `data` + `options`
 * pair. This is the single source of truth that lets `createChart` and
 * `IChartInstance` infer the exact data / options / variant types from the
 * `type` argument alone.
 *
 * Built-in types are declared below. Consumers who add a custom type via
 * {@link registerAdapter} can fold it into this map with TypeScript
 * declaration merging so `createChart('myType', data, options)` type-checks
 * with full inference — no `as any` casts:
 *
 * ```ts
 * declare module '@bndynet/icharts' {
 *   interface ChartTypeRegistry {
 *     scatter: { data: ScatterData; options: ScatterChartOptions };
 *   }
 * }
 * ```
 */
export interface ChartTypeRegistry {
  line: { data: LineData; options: LineChartOptions };
  bar: { data: BarData; options: BarChartOptions };
  area: { data: AreaData; options: AreaChartOptions };
  pie: { data: PieData; options: PieChartOptions };
  gauge: { data: GaugeData; options: GaugeChartOptions };
  liquidprogress: { data: LiquidProgressData; options: LiquidProgressChartOptions };
  sankey: { data: SankeyData; options: SankeyChartOptions };
  chord: { data: ChordData; options: ChordChartOptions };
  radar: { data: RadarData; options: RadarChartOptions };
  network: { data: NetworkData; options: NetworkChartOptions };
  tree: { data: TreeData; options: TreeChartOptions };
  treemap: { data: TreemapData; options: TreemapChartOptions };
  wordcloud: { data: WordCloudData; options: WordCloudChartOptions };
}

/** Union of every registered chart `type` string (built-in + augmented). */
export type RegisteredChartType = keyof ChartTypeRegistry;

/**
 * Data type for a given chart `type`. Resolves to the registered shape for a
 * known key, or the broad {@link ChartData} union for an arbitrary string
 * (dynamic types / custom types not folded into {@link ChartTypeRegistry}).
 */
export type ChartDataFor<T> = T extends keyof ChartTypeRegistry
  ? ChartTypeRegistry[T]['data']
  : ChartData;

/**
 * Options type for a given chart `type`. Resolves to the registered shape for
 * a known key, or the broad {@link AnyChartOptions} union otherwise.
 */
export type ChartOptionsFor<T> = T extends keyof ChartTypeRegistry
  ? ChartTypeRegistry[T]['options']
  : AnyChartOptions;

// ---------------------------------------------------------------------------
// Chart instance interface (returned by createChart)
// ---------------------------------------------------------------------------

/**
 * Chart instance contract. The optional `T` type parameter (the chart `type`
 * string) narrows `update`'s `data` / `options` to the matching registered
 * shapes. Defaults to `string`, which resolves the broad
 * {@link ChartData} / {@link AnyChartOptions} unions — so existing untyped
 * usage is unaffected.
 */
export interface IChartInstance<T extends string = string> {
  update(data?: ChartDataFor<T>, options?: ChartOptionsFor<T>): void;
  /** Switch ECharts theme without disposing the instance (ECharts 6+). Updates series colors from the active palette. */
  setTheme(theme: string): void;
  resize(): void;
  dispose(): void;
  getEChartsInstance(): echarts.ECharts;
}
