/**
 * https://echarts.apache.org/en/option.html
 */
export interface Option {
  color?: string[];
  backgroundColor?: string;

  title?: Title;
  legend?: Legend;
  tooltip?: Tooltip;
  toolbox?: Toolbox;
  textStyle?: TextStyle;
  // series?: Series[];
}

/**
 * https://echarts.apache.org/en/option.html#title.textStyle
 */
export interface TextStyle {
  color?: string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontWeight?: number | ('normal' | 'bold' | 'bolder' | 'lighter');
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  width?: number;
  height?: number;
  overflow?: 'none' | 'truncate' | 'break' | 'breakAll';

  /**
   * https://echarts.apache.org/en/option.html#legend.textStyle.rich
   */
  rich?: { [key: string]: Partial<Record<RichProperty, any>> };
}

/**
 * https://echarts.apache.org/en/option.html#title
 */
export interface Title {
  show?: boolean;
  text?: string;
  subtext?: string;
}

/**
 * https://echarts.apache.org/en/option.html#tooltip
 */
export interface Tooltip {
  show?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number | number[];
  textStyle?: TextStyle;
  confine?: boolean;
  /**
   * the value can be found at https://echarts.apache.org/en/option.html#tooltip.formatter
   * load tooltip from promise
   * @example
   * ```typescript
   * formatter: (params, ticket, callback) => {
   *    $.get('detail?name=' + params.name, function (content) {
   *      callback(ticket, toHTML(content));
   *    });
   *    return 'Loading';
   * }
   */
  formatter?:
    | string
    | ((
        params: TooltipFormatterParams,
        ticket: any,
        callback: (ticket: any, tooltipHtml: string | HTMLElement) => void,
      ) => string);

  valueFormatter?: (value: number | string, dataIndex: number) => string;
}

export interface TooltipFormatterParams {
  componentType: string;
  // Series type
  seriesType: string;
  // Series index in option.series
  seriesIndex: number;
  // Series name
  seriesName: string;
  // Data name, or category name
  name: string;
  // Data index in input data array
  dataIndex: number;
  // Original data as input
  data: Object;
  // Value of data. In most series it is the same as data.
  // But in some series it is some part of the data (e.g., in map, radar)
  value: number | Array<any> | Object;
  // encoding info of coordinate system
  // Key: coord, like ('x' 'y' 'radius' 'angle')
  // value: Must be an array, not null/undefined. Contain dimension indices, like:
  // {
  //     x: [2] // values on dimension index 2 are mapped to x axis.
  //     y: [0] // values on dimension index 0 are mapped to y axis.
  // }
  encode: Object;
  // dimension names list
  dimensionNames: Array<string>;
  // data dimension index, for example 0 or 1 or 2 ...
  // Only work in `radar` series.
  dimensionIndex: number;
  // Color of data
  color: string;
  // The percentage of current data item in the pie/funnel series
  percent: number;
  // The ancestors of current node in the sunburst series (including self)
  treePathInfo: Array<any>;
  // The ancestors of current node in the tree/treemap series (including self)
  treeAncestors: Array<any>;
}

/**
 * https://echarts.apache.org/en/option.html#legend
 */
export interface Legend {
  type?: 'plain' | 'scroll';
  show?: boolean;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  padding?: number | number[];
  width?: number;
  height?: number;

  /**
   * https://echarts.apache.org/en/option.html#legend.icon
   */
  icon?: Icon | string;
  orient?: Orient;
  itemGap?: number;
  itemWidth?: number;
  textStyle?: TextStyle;
  inactiveColor?: string;
  inactiveBorderColor?: string;
  inactiveBorderWidth?: string;
}

export interface Series {
  name?: string;
  type?: SeriesType;
  label?: {
    show?: boolean;
  };
  data?: number[];
}

export interface Toolbox {
  show?: boolean;
}

export enum Orient {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export enum Icon {
  Circle = 'circle',
  Rect = 'rect',
  RoundRect = 'roundRect',
  Triangle = 'triangle',
  Diamond = 'diamond',
  Pin = 'pin',
  Arrow = 'arrow',
  None = 'none',
}

export enum SeriesType {
  Line = 'line',
  Bar = 'bar',
  Pie = 'pie',
}

export type RichProperty =
  | 'color'
  | 'fontStyle'
  | 'fontWeight'
  | 'fontFamily'
  | 'fontSize'
  | 'align'
  | 'verticalAlign'
  | 'lineHeight'
  | 'backgroundColor'
  | 'borderColor'
  | 'borderWidth'
  | 'borderType'
  | 'borderDashOffset'
  | 'borderRadius'
  | 'padding'
  | 'shadowColor'
  | 'shadowBlur'
  | 'shadowOffsetX'
  | 'shadowOffsetY'
  | 'width'
  | 'height'
  | 'textBorderColor'
  | 'textBorderWidth'
  | 'textBorderType'
  | 'textBorderDashOffset'
  | 'textShadowColor'
  | 'textShadowBlur'
  | 'textShadowOffsetX'
  | 'textShadowOffsetY';
