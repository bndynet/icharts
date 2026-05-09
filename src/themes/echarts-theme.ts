import type { ChartThemeColors } from './types.js';

/**
 * Build a full ECharts theme object from `ChartThemeColors` and a series palette.
 * Registered via `echarts.registerTheme(name, buildEChartsTheme(colors, palette))`.
 *
 * Token mapping:
 *  background    → chart canvas background (transparent by default)
 *  surface       → tooltip bg, axis-pointer callout bg, pie-slice border
 *  surfaceText   → tooltip text, axis-pointer callout text
 *  textPrimary   → chart title, legend, pie labels, gauge detail (value),
 *                  radar indicator names (axisName), markPoint labels,
 *                  bar/line value labels (incl. race value labels and
 *                  line-race endLabels)
 *  textSecondary → axis tick labels, gauge title (label text e.g. "CPU")
 *  gridLine      → splitLine (grid rules), radar splitLine + alternating
 *                  splitArea bands
 *  axisLine      → axis spine, tick marks, cursor crosshair, radar axisLine
 *
 * Note on label colors: bar/line adapters intentionally do NOT set
 * `series.label.color` / `series.endLabel.color`. ECharts deep-merges the
 * series-type defaults below (`bar.label`, `line.label`, `line.endLabel`)
 * into each series so themes drive the look. This keeps adapters
 * theme-agnostic (they never read the active palette directly) and means
 * a single theme switch repaints every data label on the chart.
 */
export function buildEChartsTheme(
  colors: ChartThemeColors,
  palette: string[],
) {
  return {
    color: palette,
    backgroundColor: colors.background,

    title: {
      textStyle: { color: colors.textPrimary },
    },

    legend: {
      textStyle: { color: colors.textPrimary },
    },

    tooltip: {
      backgroundColor: colors.tooltipBackground ?? colors.surface,
      borderColor:     colors.tooltipBorderColor ?? colors.axisLine,
      textStyle: {
        color: colors.tooltipTextColor ?? colors.surfaceText,
      },
      axisPointer: {
        lineStyle:  { color: colors.axisLine, width: 1 },
        crossStyle: { color: colors.axisLine, width: 1 },
        label: {
          backgroundColor: colors.tooltipBackground ?? colors.surface,
          color:           colors.tooltipTitleColor ?? colors.tooltipTextColor ?? colors.surfaceText,
        },
      },
    },

    categoryAxis: buildAxisStyle(colors),
    valueAxis:    buildAxisStyle(colors),
    logAxis:      buildAxisStyle(colors),
    timeAxis:     buildAxisStyle(colors),

    line: {
      smooth: false,
      symbol: 'circle',
      symbolSize: 4,
      // Data labels (`showLabel: true`) and race endLabels — both render
      // against the chart canvas, so they need the on-background text
      // color, not whatever ECharts' built-in default happens to be (which
      // is unreadable on dark themes).
      label:    { color: colors.textPrimary },
      endLabel: { color: colors.textPrimary },
    },

    bar: {
      itemStyle: { barBorderWidth: 0 },
      // Data labels (`showLabel: true`) and race value labels
      // (`position: 'right'` + `valueAnimation`). Same rationale as line —
      // labels live on the canvas and must follow the theme.
      label: { color: colors.textPrimary },
    },

    pie: {
      label:     { color: colors.textPrimary },
      itemStyle: { borderWidth: 1, borderColor: colors.surface },
    },

    gauge: {
      // ECharts gauge title/detail use `color` directly, NOT `textStyle.color`
      title:     { color: colors.textSecondary }, // label ("CPU", "Score") — descriptive
      detail:    { color: colors.textPrimary },   // value (the number)    — primary
      axisLabel: { color: colors.textSecondary },
      // Track (ring background): ECharts requires [[fraction, color]] array format.
      // Adapter sets only `width`; ECharts deep-merges lineStyle so color is preserved.
      axisLine:  { lineStyle: { color: [[1, colors.axisLine]] } },
      splitLine: { lineStyle: { color: colors.axisLine } },
      axisTick:  { lineStyle: { color: colors.axisLine } },
    },

    markPoint: {
      label: { color: colors.textPrimary },
    },

    radar: {
      // Indicator names ("Sales", "Marketing", …) are the only readable
      // labels on the chart — treat them like pie/legend text rather than
      // axis ticks so they stay legible against both light and dark
      // backgrounds. Without this entry they fall back to ECharts'
      // built-in grey and become hard to read on dark themes.
      axisName: { color: colors.textPrimary },
      // Spokes (axisLine) and concentric rings (splitLine) reuse the
      // same `axisLine` / `gridLine` tokens as XY axes so a radar
      // sitting beside a bar chart agrees on grid color.
      ...buildStructuralLineDefaults(colors),
      // Subtle alternating bands — half-strength gridLine so they hint at
      // the polygon's structure without competing with the data series.
      splitArea: {
        show: true,
        areaStyle: { color: ['transparent', colors.gridLine], opacity: 0.3 },
      },
    },
  };
}

/**
 * Themed defaults for "structural lines" — the axis spine plus the
 * split-line grid rules — shared between XY axes (categoryAxis,
 * valueAxis, …) and the radar component.
 *
 * Both visual roles map back to the same tokens:
 *   - {@link ChartThemeColors.axisLine}  → XY axis spine / radar spokes
 *     (the "frame" rule, intentionally more prominent than gridLine).
 *   - {@link ChartThemeColors.gridLine}  → XY splitLine / radar's
 *     concentric polygon rings (the "subtle reading aid" rules).
 *
 * Built once so a token change repaints every chart type in lockstep.
 * Adapters and `buildAxisStyle` consume this via spread; never
 * redeclare the inner `{ lineStyle: { color: ... } }` shape elsewhere
 * in the theme.
 */
function buildStructuralLineDefaults(colors: ChartThemeColors) {
  return {
    axisLine: { show: true, lineStyle: { color: colors.axisLine } },
    splitLine: { show: true, lineStyle: { color: colors.gridLine } },
  };
}

function buildAxisStyle(colors: ChartThemeColors) {
  return {
    ...buildStructuralLineDefaults(colors),
    axisTick: {
      show: true,
      lineStyle: { color: colors.axisLine },
    },
    axisLabel: {
      show: true,
      color: colors.textSecondary,
    },
    splitArea: { show: false },
  };
}
