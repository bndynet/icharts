import { ChartOptions, CouldBeFunction } from '../../types';
import type { GaugeChart } from './gauge';

export enum GaugeChartVariant {
  Percentage = 'percentage',
}

export interface GaugeChartData {
  value: number;
  maxValue: number;
}

export interface GaugeChartOptions extends ChartOptions<GaugeChartData> {
  variant?: GaugeChartVariant;

  textBackgroundColor?: CouldBeFunction<string, GaugeChart>;
  primaryTextFontSize?: number;
  primaryTextColor?: CouldBeFunction<string, GaugeChart>;
  secondaryText?: string;
  secondaryTextColor?: CouldBeFunction<string, GaugeChart>;
  secondaryTextFontSize?: number;

  indicatorBackgroundColor?: CouldBeFunction<string, GaugeChart>;
  indicatorWidth?: number;

  /**
   * Only works for percentage variant
   * For example, https://echarts.apache.org/examples/data/asset/img/custom-gauge-panel.png
   */
  indicatorBackgroundImage?: string;
  /**
   * Only works for default variant
   */
  indicatorDivider?: number;
}
