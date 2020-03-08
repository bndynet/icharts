/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ChartOptions {
  data?: any;
  title?: ChartTitleOptions;
  legend?: ChartLegendOptions;
  tooltip?: {
    getContent: (dataItem: any) => string;
  };
  colors?: { [key: string]: string } | string[];
}

export interface ChartTitleOptions {
  text?: string;
  description?: string;
}

export interface ChartLegendOptions {
  show?: boolean;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  orient?: 'vertical' | 'horizontal';
  fnLabels?: (key: string, value: number, total: number) => (string | number)[];
  labelStyles?: any[];
  formatter?: (key: string, value: number, total?: number) => string;
  textStyle?: any;
}

export interface ChartTooltipOptions {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  padding?: number[];
}
