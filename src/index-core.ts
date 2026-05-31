// SSR-safe entry: same public API as `./index.js`, minus the
// `<i-chart>` web component side-effect.
//
// Import this entry from server-side runtimes (Next.js, Nuxt, Astro,
// SvelteKit, Vite SSR…) where the module graph must not touch Lit's
// custom-element registry. Chart instances are still created
// client-side via `createChart()` / `new IChart()` inside
// `onMounted` / `useEffect` / `'use client'` blocks.

// Core chart class
export { IChart } from './core.js';

// Imperative API
export { createChart } from './api.js';

// Server-side rendering — produces a complete `<svg>...</svg>` string
// from `(type, data, options)` without touching `window` / `document`
// / `customElements` / `<canvas>`. Pair with `sharp` or
// `@resvg/resvg-js` if you need PNG output. See `src/ssr-render.ts`
// for the full plugin / fallback contract.
export {
  renderChartToSVGString,
  type RenderChartToSVGStringOptions,
} from './ssr-render.js';

// SSR-safe plugin installers. Server consumers call these once before
// rendering plugin-backed chart types, instead of importing `echarts`
// + `@echarts-x/*` directly. Today only `installLiquidProgress()`
// ships — wordcloud is browser-only because the `@echarts-x/custom-
// word-cloud` package isn't SSR-renderable (see `src/ssr-plugins.ts`
// for the full rationale).
export { installLiquidProgress } from './ssr-plugins.js';

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
export {
  registerAdapter,
  getAdapter,
  hasAdapter,
  listAdapters,
  unregisterAdapter,
  type ChartAdapter,
  type ChartSetupResult,
  type ChartTeardown,
} from './adapters/index.js';

// Types
export {
  ChartType,
  type ChartData,
  type ChartOptions,
  type AnyChartOptions,
  type IChartInstance,
  type ChartTypeRegistry,
  type RegisteredChartType,
  type ChartDataFor,
  type ChartOptionsFor,
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
  type TreeLabelFormatterContext,
  type TreeNodeIconSpec,
  type TreemapData,
  type TreemapDataItem,
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
  type TreemapChartOptions,
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
  type ChartEventContext,
  type ChartEventType,
  type ChartEventHandler,
  type ChartEventHandlers,
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
  isTreemapData,
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
