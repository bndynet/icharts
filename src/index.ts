// Web component (registers <i-chart> custom element as side effect)
export { IChartElement } from './components/i-chart.js';

// Core chart class
export { IChart } from './core.js';

// Imperative API
export { createChart } from './api.js';

// Tooltip helpers (any chart type via echarts.tooltip.formatter)
export {
  createAsyncTooltipFormatter,
  escapeTooltipHtml,
} from './async-tooltip.js';

export {
  pieParamsToTooltipContext,
  sankeyChordParamsToTooltipContext,
  formatPieTooltipSyncHtml,
} from './tooltip-context.js';

export {
  formatAxisTooltipSyncHtml,
  buildAxisTooltipContext,
} from './adapters/common.js';

// Adapter registry (extensibility)
export { registerAdapter, type ChartAdapter, type ChartSetupResult } from './adapters/index.js';

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
  type SankeyData,
  type SankeyNode,
  type SankeyLink,
  type ChordData,
  type ChordNode,
  type ChordLink,
  type SeriesOptions,
  type LegendOptions,
  type GridOptions,
  type AxisOptions,
  type TooltipOptions,
  type TooltipContext,
  type TooltipContextAxis,
  type TooltipContextItem,
  type TooltipContextEdge,
  type CreateAsyncTooltipFormatterOptions,
  type PieSliceOptions,
  type ChartVariant,
  type LineVariant,
  type BarVariant,
  type AreaVariant,
  type PieVariant,
  type GaugeVariant,
  type SankeyVariant,
  isSankeyData,
  isChordData,
} from './types.js';

// Configuration
export { configure, type IChartsConfig } from './config.js';

// Theme utilities
export {
  switchTheme,
  registerTheme,
  getSeriesColor,
  getCurrentTheme,
  getThemeColors,
  setColorMap,
  resetColorMap,
  type ChartThemeConfig,
} from './themes/index.js';
