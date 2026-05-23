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
  getTitleReserve,
  getLegendReserve,
  compileRichText,
  getLabelFontSize,
  DEFAULT_LABEL_FONT_SIZE,
  LEGEND_RESERVE,
  computeStackedTextOffsets,
  STACKED_TEXT_DEFAULT_VISIBLE_GAP_PX,
  STACKED_TEXT_DEFAULT_GLYPH_PADDING_EM,
  type EdgeReserves,
  type CompiledRichText,
  type StackedTextOffsetsOptions,
  type StackedTextOffsets,
} from './adapters/common/index.js';

// Adapter registry (extensibility)
export { registerAdapter, type ChartAdapter, type ChartSetupResult } from './adapters/index.js';

// Types
export {
  ChartType,
  type ChartData,
  type ChartOptions,
  type AnyChartOptions,
  type IChartInstance,
  // Data shapes (per-chart aliases; `LineData`/`BarData`/`AreaData` all alias XYData)
  type XYData,
  type XYDataSeries,
  type LineData,
  type BarData,
  type AreaData,
  type PieData,
  type PieDataItem,
  type GaugeData,
  type LiquidProgressData,
  type SankeyData,
  type SankeyNode,
  type SankeyLink,
  type ChordData,
  type ChordNode,
  type ChordLink,
  type RadarData,
  type RadarIndicator,
  type RadarDataSeries,
  type NetworkData,
  type NetworkNode,
  type NetworkLink,
  type TreeData,
  type TreeNode,
  type TreeDirection,
  type WordCloudData,
  type WordCloudDataItem,
  // Per-chart options (each extends ChartOptions / XYChartOptions)
  type XYChartOptions,
  type LineChartOptions,
  type BarChartOptions,
  type AreaChartOptions,
  type PieChartOptions,
  type GaugeChartOptions,
  type LiquidProgressChartOptions,
  type SankeyChartOptions,
  type ChordChartOptions,
  type RadarChartOptions,
  type NetworkChartOptions,
  type TreeChartOptions,
  type WordCloudChartOptions,
  // Shared option building blocks
  type SeriesOptions,
  type LegendOptions,
  type RichTextInput,
  type RichTextSpec,
  type RichTextSegment,
  type RichTextStyle,
  type GridOptions,
  type AxisOptions,
  type TooltipOptions,
  type TooltipContext,
  type TooltipContextAxis,
  type TooltipContextItem,
  type TooltipContextEdge,
  type CreateAsyncTooltipFormatterOptions,
  type BarRaceOptions,
  type LineRaceOptions,
  type ChartVariant,
  type LineVariant,
  type BarVariant,
  type AreaVariant,
  type PieVariant,
  type GaugeVariant,
  type LiquidProgressVariant,
  type SankeyVariant,
  type RadarVariant,
  type NetworkVariant,
  type WordCloudVariant,
  isSankeyData,
  isChordData,
  isRadarData,
  isNetworkData,
  isTreeData,
  isWordCloudData,
  isLiquidProgressData,
  mergeLiquidProgressData,
} from './types.js';

// Configuration
export { configure, resetConfiguration, type IChartsConfig } from './config.js';

// Number + color helpers.
// Adapters call these directly to obtain colors; the result is then attached
// to whichever ECharts option field makes sense for the chart type.
export {
  formatNumber,
  type FormatNumberOptions,
  resolveColors,
  resolveColorsForNodes,
} from './utils.js';

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
