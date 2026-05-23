import type { TitleOptions, TooltipOptions } from './shared.js';

// ---------------------------------------------------------------------------
// Chart type enum
// ---------------------------------------------------------------------------

export enum ChartType {
  Line = 'line',
  Bar = 'bar',
  Area = 'area',
  Pie = 'pie',
  Gauge = 'gauge',
  LiquidProgress = 'liquidprogress',
  Sankey = 'sankey',
  Chord = 'chord',
  Radar = 'radar',
  Network = 'network',
  Tree = 'tree',
  WordCloud = 'wordcloud',
}

// ---------------------------------------------------------------------------
// ChartOptions — base for every per-chart subtype
// ---------------------------------------------------------------------------

/**
 * Cross-cutting options shared by every chart type.
 *
 * Only fields actually consulted by every built-in adapter live here. Anything
 * chart-specific (axes, stacking, variants, slice/gauge/race namespaces,
 * legend/grid for charts that don't render them) belongs on the per-chart
 * `XxxChartOptions` subtype.
 *
 * See [AGENTS.md](../../AGENTS.md) for the rule and rationale.
 */
export interface ChartOptions {
  theme?: string;
  /** Chart title. Pass a plain string as shorthand or a TitleOptions object for full control. */
  title?: string | TitleOptions;
  /**
   * Outer whitespace (px) between chart content and all canvas edges.
   * Applies to title, legend, and the plot area. Default: 12.
   */
  padding?: number;
  colors?: string[];
  colorMap?: Record<string, string>;

  /**
   * Global font size (px) for data labels and edge labels across every
   * chart type that renders them.
   *
   * **Applies to:**
   * - line / bar / area `series.label` (when `showLabel: true`) and
   *   line-race `endLabel`
   * - pie slice labels
   * - sankey / chord / tree node labels (parent + leaf for tree)
   * - network node `series.label` and `series.edgeLabel`
   *
   * **Does NOT apply to:**
   * - gauge `title` / `detail` inner text (container-auto-sized by the
   *   gauge `percentage` variant)
   * - radar `axisName` (indicator labels, not data labels)
   * - `markPoint.label`
   *
   * Default: 12.
   */
  labelFontSize?: number;

  tooltip?: TooltipOptions;

  /** Raw ECharts options merged last — escape hatch for advanced users */
  echarts?: Record<string, unknown>;
}
