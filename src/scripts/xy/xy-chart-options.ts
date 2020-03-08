/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChartOptions } from '../types';

export interface XYChartOptions extends ChartOptions {
  data: any[];
  xKey: string;
  gridLine?: 'none' | 'all' | 'vertial' | 'horizontal';
  type?: 'line' | 'bar' | 'area';
  stacked?: boolean;
  smooth?: boolean;
  styles?: {
    series?: SeriesStyleOptions;
    xAxis?: AxisStyleOptions;
  };
}

export interface SeriesStyleOptions {
  type?: 'line' | 'bar' | 'area';
  color?: string;
  smooth?: boolean;
}

export interface ChartTitleOptions {
  text?: string;
  description?: string;
}

export interface AxisStyleOptions {
  labelFormatter?: (label: any) => string;
  line?: {
    color?: string;
    width?: number;
    type?: 'solid' | 'dashed' | 'dotted';
    opacity?: number;
  };
}

export interface XYChartStyleOptions {
  series: { [key: string]: SeriesStyleOptions };
}
