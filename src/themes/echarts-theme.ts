import type { ChartThemeColors } from './types.js';

/**
 * Build a full ECharts theme object from `ChartThemeColors` and a series palette.
 * Registered via `echarts.registerTheme(name, buildEChartsTheme(colors, palette))`.
 *
 * Token mapping:
 *  background    → chart canvas background, pie-slice border
 *  surface       → tooltip bg, axis-pointer callout bg
 *  surfaceText   → tooltip text, axis-pointer callout text
 *  textPrimary   → chart title, legend, pie labels, gauge detail (value), markPoint labels
 *  textSecondary → axis tick labels, gauge title (label text e.g. "CPU")
 *  textSecondary → axis tick labels
 *  gridLine      → splitLine (grid rules)
 *  axisLine      → axis spine, tick marks, cursor crosshair
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
      backgroundColor: colors.surface,
      borderColor: colors.axisLine,
      textStyle: { color: colors.surfaceText },
      axisPointer: {
        lineStyle:  { color: colors.axisLine, width: 1 },
        crossStyle: { color: colors.axisLine, width: 1 },
        label: {
          backgroundColor: colors.surface,
          color:           colors.surfaceText,
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
    },

    bar: {
      itemStyle: { barBorderWidth: 0 },
    },

    pie: {
      label:     { color: colors.textPrimary },
      itemStyle: { borderWidth: 1, borderColor: colors.background },
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
  };
}

function buildAxisStyle(colors: ChartThemeColors) {
  return {
    axisLine: {
      show: true,
      lineStyle: { color: colors.axisLine },
    },
    axisTick: {
      show: true,
      lineStyle: { color: colors.axisLine },
    },
    axisLabel: {
      show: true,
      color: colors.textSecondary,
    },
    splitLine: {
      show: true,
      lineStyle: { color: colors.gridLine },
    },
    splitArea: { show: false },
  };
}
