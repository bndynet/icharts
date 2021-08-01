import { LegendItemContext } from './chart';
import { Position } from './common';

export interface IChartOptions<TData> {
  /**
   * The theme name which should already registered into ECharts.
   */
  theme?: string;
  data?: TData;
  /**
   * The series name.
   */
  seriesNames?: string[];

  legend?: IChartLegendOptions;

  colors?: string[];
  colormap?: { [key: string]: string };

  callbacks?: {
    tooltip?: {
      getContent?: (params: any, ticket: any, callback: (ticket: any, content: string) => void) => string | HTMLElement;
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
