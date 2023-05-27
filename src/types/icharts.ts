import { GridOption } from 'echarts/types/dist/shared';
import { LegendItemContext } from './chart';
import { Position } from './common';

export interface IChartOptions<TData> {
  /**
   * The theme name which should already registered into ECharts.
   */
  theme?: string;
  isDark?: boolean;
  // data?: TData;

  legend?: IChartLegendOptions;
  grid?: IGrid;

  colors?: string[];
  colormap?: {
    [key: string]:
      | string
      | string[]
      | ((options: IChartOptions<TData>) => string | string[]);
  };
  series?: ISeries[];

  callbacks?: {
    formatTime?: (time: number | string, index: number) => string;
    tooltip?: {
      getContent?: (
        params: any,
        ticket: any,
        callback: (ticket: any, content: string) => void,
      ) => string | HTMLElement;
      formatValue?: (value: number | string, dataIndex: number) => string;
    };
    legend?: {
      formatLabel: (context: LegendItemContext) => string;
    };
  };
}

export interface IChartLegendOptions {
  position?: Position;
  fnLabels?: (key: string, value: number, total: number) => (string | number)[];
  labelStyles?: any[];
  formatter?: (key: string, value: number, total?: number) => string;
}

export interface IChartAxis {
  formatLabel?: (value: string | number, index: number) => string;
  showAxisLine?: boolean;
  // echarts
  name?: string;
  nameGap?: number;
  boundaryGap?: boolean;
}

export interface ISeries {
  valueAxisIndex?: number;
  lineSmooth?: boolean | number;
  lineWidth?: number;
  lineType?: 'solid' | 'dashed' | 'dotted';
  colorStart?: Position;
  colorEnd?: Position;
  showPoint?: boolean;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside' | 'center';
  showAverageLine?: boolean;
  showMaxLine?: boolean;
  showMinLine?: boolean;
  showMaxBubble?: boolean;
  showMinBubble?: boolean;
  // echarts
  name?: string;
  type?: 'line' | 'pie' | 'bar';
}

export interface IGrid extends GridOption {
  noop?: boolean; // just placeholder for solving eslint error
}
