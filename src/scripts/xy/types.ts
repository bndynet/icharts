import { Axis } from 'echarts';
import { ChartOptions, IChartAxis } from '../../types';

export type XYChartData = { [key: string]: string | number }[];

export enum AxisType {
  Category = 'category',
  Value = 'value',
}

export enum XYChartVariant {
  Line = 'line',
  Bar = 'bar',
  Area = 'area',
  HorizontalBar = 'horizontal-bar',
  SparkLine = 'spark-line',
  SparkBar = 'spark-bar',
}

export interface XYChartOptions extends ChartOptions<XYChartData> {
  xAxis?: Partial<Axis & IChartAxis>[];
  yAxis?: Partial<Axis & IChartAxis>[];

  // ichart properties
  dataKey?: string;
  stacked?: boolean;
  variant?: XYChartVariant;

  lineWidth?: number;

  barRadius?: number;
  barWidth?: number;
  barMaxWidth?: number;
}
