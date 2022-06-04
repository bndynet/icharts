import { ChartData, ChartOptions } from '../../types';

export type PieChartData =
  | { [key: string]: number }
  | { [key: string]: number }[]
  | {
      name: string;
      value: number;
    }[]
  | ChartData;

export enum PieVariant {
  None = 'none',
  Doughnut = 'donut',
  NightingaleRose = 'nightingale-rose',
  HalfDonut = 'half-donut',
}

export interface PieChartOptions extends ChartOptions<PieChartData> {
  variant?: PieVariant;
  innerRadius?: string | number;
  outerRadius?: string | number;
  autoSort?: boolean;
  slice?: {
    borderRadius?: number;
    borderColor?: string;
    gap?: number;
  };
  label?: {
    show?: boolean;
    percentToHide?: number;
    position?: 'inside' | 'outside' | 'center';
    highlight?: boolean;
    highlightFontSize?: number;
  };
}
