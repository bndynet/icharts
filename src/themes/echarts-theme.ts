import type { ChartThemeColors } from './types.js';
import { DEFAULT_LABEL_FONT_SIZE } from '../adapters/common/text-measure.js';

/**
 * Build a full ECharts theme object from `ChartThemeColors` and a series palette.
 * Registered via `echarts.registerTheme(name, buildEChartsTheme(colors, palette))`.
 *
 * Token mapping:
 *  background    → chart canvas background (transparent by default)
 *  surface       → tooltip bg, axis-pointer callout bg
 *  surfaceText   → tooltip text, axis-pointer callout text
 *  itemDivider   → pie-slice border (and future sunburst sectors / treemap
 *                  cells / sankey & network node borders); falls back to
 *                  `surface` when undefined so themes registered before this
 *                  token existed keep their previous behaviour
 *  textPrimary   → chart title, legend, pie labels, gauge detail (value),
 *                  radar indicator names (axisName), markPoint labels,
 *                  bar/line value labels (incl. race value labels and
 *                  line-race endLabels), graph/sankey/chord/tree node
 *                  + link labels, and custom-series labels (used by
 *                  `wordcloud`'s custom renderer)
 *  textSecondary → axis tick labels, gauge title (label text e.g. "CPU")
 *  gridLine      → splitLine (grid rules), radar splitLine + alternating
 *                  splitArea bands
 *  axisLine      → axis spine, tick marks, cursor crosshair, radar axisLine
 *
 * Note on label colors: adapters intentionally do NOT set `series.label.color`
 * / `series.endLabel.color` / `series.edgeLabel.color`. ECharts deep-merges
 * the series-type defaults below (`bar.label`, `line.label`, `line.endLabel`,
 * `pie.label`, `radar.axisName`, `graph.label`, `graph.edgeLabel`,
 * `sankey.label`, `chord.label`, `tree.label`, `custom.label`, …) into each series so themes
 * drive the look.
 * This keeps adapters theme-agnostic (they never read the active palette
 * directly) and means a single theme switch repaints every data label on the
 * chart. AGENTS.md "Layout rule #6" documents this two-sided contract: any
 * new chart whose adapter renders canvas-rendered text MUST add the matching
 * `<seriesType>.<field>.color` entry here AND a regression test below in
 * `echarts-theme.test.ts` — leaving the theme side unwired silently breaks
 * dark-theme rendering for that chart.
 *
 * Note on label fontSize (different contract from color): every relevant
 * `<seriesType>.label.fontSize` / `<seriesType>.edgeLabel.fontSize` below
 * is wired to {@link DEFAULT_LABEL_FONT_SIZE} as a *fallback*. Unlike
 * color (which is owned entirely by the theme), fontSize is also emitted
 * by adapters via `getLabelFontSize(options)` so that
 * `ChartOptions.labelFontSize` actually takes effect at the series level.
 * ECharts series-level merge wins over series-type defaults, so:
 *   - user sets `labelFontSize: 18` → adapter emits 18 → theme's 12 is
 *     overridden, every chart renders at 18 px.
 *   - user sets nothing → adapter emits the same `DEFAULT_LABEL_FONT_SIZE`
 *     (12) → identical to the theme default; the theme entry is the
 *     belt-and-suspenders guarantee that even an adapter which forgets
 *     to emit `fontSize` still ends up at the canonical 12 px (rather
 *     than ECharts' built-in default for the series type).
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
      // is unreadable on dark themes). `fontSize` is the
      // `DEFAULT_LABEL_FONT_SIZE` fallback; adapter overrides with
      // `options.labelFontSize` via series-level merge.
      label:    { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE },
      endLabel: { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE },
    },

    bar: {
      itemStyle: { barBorderWidth: 0 },
      // Data labels (`showLabel: true`) and race value labels
      // (`position: 'right'` + `valueAnimation`). Same rationale as line —
      // labels live on the canvas and must follow the theme.
      label: { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE },
    },

    pie: {
      label:     { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE },
      // 1 px stroke that fakes a gap between adjacent slices. Pre-token,
      // this read `colors.surface` directly, which silently broke on
      // themes whose tooltip surface differs from the card background
      // (e.g. `dash-scifi`'s `surface: 'transparent'` glassmorphism →
      // slices fused into one continuous ring). `itemDivider` is the
      // dedicated knob; `?? colors.surface` keeps every pre-existing
      // user-registered theme behaviourally identical.
      itemStyle: { borderWidth: 1, borderColor: colors.itemDivider ?? colors.surface },
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

    // Graph-family series (network, sankey, chord). Each adapter emits
    // `series.label` (and network additionally emits `series.edgeLabel`)
    // without a `color` key, so ECharts' built-in default (a near-black
    // shade) would be unreadable on dark themes. Mirror the pie/bar/line
    // contract: theme owns the text color, adapters stay theme-agnostic.
    graph: {
      label:     { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE }, // network node labels
      edgeLabel: { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE }, // network link labels (when showLinkLabel)
    },
    sankey: {
      label: { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE }, // sankey node labels
    },
    chord: {
      label: { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE }, // chord node labels (outside the ring)
    },
    tree: {
      // Tree node labels render on the canvas next to each node marker.
      // Same two-sided contract as the other graph-family entries above:
      // the adapter (`src/adapters/tree.ts`) intentionally emits
      // `series.label` / `series.leaves.label` *without* a `color` key
      // so this theme entry can repaint every label in lockstep when
      // the user switches themes.
      label: { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE },
      // Connector lines (the curved branches between parent and child)
      // reuse the structural `axisLine` token so the tree's frame
      // agrees with axis spines on dark themes — without this they
      // fall back to a near-black ECharts default and disappear.
      lineStyle: { color: colors.axisLine },
    },
    custom: {
      // Wordcloud and liquidprogress are implemented via ECharts custom
      // series (`renderItem: 'wordCloud'` / `'liquidFill'`). Keep
      // custom-series labels on the same theme token so any label-like
      // text emitted by custom charts remains legible.
      label: { color: colors.textPrimary, fontSize: DEFAULT_LABEL_FONT_SIZE },
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
