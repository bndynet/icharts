/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ChartOptions {
  data?: any;
  title?: ChartTitleOptions;
  legend?: ChartLegendOptions;
  tooltip?: {
    getContent: (dataItem: any) => string;
  };
  toolbox?: ChartToolboxOptions;
  colors?: { [key: string]: string } | string[];
  style?: ChartStyleOptions;
  textColor?: string;
  mutedTextColor?: string;
  isDark?: boolean;
}

export interface ChartTextColorOptions {
  primary?: string;
  secondary?: string;
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
  location?: 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right' | 'right' | 'left';
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

export interface ChartToolboxOptions {
  show?: boolean;
}

export interface ChartStyleOptions {
  todo?: string;
}
