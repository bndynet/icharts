import { Legend, Option } from './echarts';
import { IChartLegendOptions, IChartOptions } from './icharts';

export type ChartData = any;

export type ChartOptions<TData> = IChartOptions<TData> & Option;

export type ChartLegendOptions = IChartLegendOptions & Legend;

export type LegendItemContext = {
  name: string;
  color: string | null;
  details: {
    name?: string;
    value?: number;
    percent?: number;
    total?: number;
  }[];
};

export interface OnLegendContext {
  iGetItemContext(name: string): LegendItemContext;
}
