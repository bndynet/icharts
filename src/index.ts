// Web component (registers <i-chart> custom element as side effect)
export { IChartElement } from './components/i-chart.js';

// Imperative API
export { createChart } from './api.js';

// Types
export {
  ChartType,
  type ChartData,
  type ChartOptions,
  type IChartInstance,
  type XYData,
  type XYDataSeries,
  type PieData,
  type PieDataItem,
  type GaugeData,
  type SeriesOptions,
  type LegendOptions,
  type GridOptions,
  type AxisOptions,
  type TooltipOptions,
  type PieSliceOptions,
  type ChartVariant,
  type LineVariant,
  type BarVariant,
  type AreaVariant,
  type PieVariant,
  type GaugeVariant,
} from './types.js';

// Theme utilities
export {
  registerTheme,
  getSeriesColor,
  getCurrentTheme,
  getThemeColors,
  type ChartThemeConfig,
} from './themes/index.js';
