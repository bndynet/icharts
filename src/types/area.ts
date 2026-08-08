import type { XYBandOptions, XYChartOptions, XYData } from './xy.js';

export type AreaVariant = 'default' | 'spark';

export type AreaData = XYData;

export interface AreaChartOptions extends XYChartOptions {
  variant?: AreaVariant;

  /** Optional filled regions between two named line series. */
  bands?: XYBandOptions[];
}
