import type { XYChartOptions, XYData } from './xy.js';

export type AreaVariant = 'default' | 'spark';

export type AreaData = XYData;

export interface AreaChartOptions extends XYChartOptions {
  variant?: AreaVariant;
}
