import type {
  PieData,
  PieChartOptions,
  PieVariant,
  PieCenterLabel,
} from '../types.js';
import type * as echarts from 'echarts';
import type { ChartSetupResult, RenderContext } from './index.js';
import { createAsyncTooltipFormatter } from '../async-tooltip.js';
import {
  formatPieTooltipSyncHtml,
  pieParamsToTooltipContext,
} from '../tooltip-context.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  type EdgeReserves,
  buildTitle,
  buildLegend,
  compileRichText,
  getLabelFontSize,
  getLegendReserve,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common.js';
import { measureTextWidth } from './text-measure.js';
import { getThemeColors, resolveThemeName, syncColorHubTheme } from '../themes/index.js';

// ---------------------------------------------------------------------------
// Layout architecture
// ---------------------------------------------------------------------------
//
// Pie is a body-centered chart, but unlike radar its slice / label / legend
// geometry leaves very little tolerance for "close enough" sizing — the older
// percent-of-reference-canvas math (PIE_REFERENCE_WIDTH = 480) under-shifted
// the center on narrow cards because a fixed pixel legend reserve takes a
// much larger fraction of a 280 px card than of the 480 px reference. The
// result was a doughnut whose right edge landed on top of a `position:
// 'right'` legend in dashboards (the regression that motivated this rewrite).
//
// The fix runs in two passes:
//
//   1. The static option (returned from `resolvePieOptions`) holds a generic
//      centered fallback so the very first paint is reasonable even before
//      the post-init hook fires.
//   2. The `onInit` hook reads `chart.getWidth()` / `getHeight()` — the only
//      authoritative source of canvas dimensions — and applies the
//      pixel-accurate `center` + `radius` via `setOption` merge.
//
// A `ResizeObserver` on the chart's container DOM re-runs the recompute
// whenever the container changes size (e.g. window resize, responsive
// breakpoints). Cleanup is implicit: the observer's callback checks
// `chart.isDisposed()` and self-disconnects, so we never leak observers
// even though the adapter contract has no dispose hook today.

/** Fraction of the smaller available-area dimension the pie body fills.
 *  85% leaves a small visual cushion between the doughnut's outer arc and
 *  the legend / title / canvas edge. */
const PIE_FILL_FACTOR = 0.85;

/** Half-doughnut version of {@link PIE_FILL_FACTOR}. The arc only occupies
 *  the upper half so it can absorb a larger fraction of the canvas without
 *  bumping into the bottom edge. */
const HALF_DOUGHNUT_FILL_FACTOR = 0.92;

/** Pixel floor so the pie never collapses to a postage stamp in tiny cards. */
const PIE_MIN_RADIUS_PX = 24;

/** Outside slice labels (`{b}: {d}%`) extend ~30 px past the outer arc.
 *  Reserved on every edge when slice labels are on so they don't get clipped. */
const PIE_LABEL_OVERFLOW_PX = 30;

/**
 * Extra slot ECharts allocates around its legend group beyond what
 * {@link getLegendReserve} captures:
 *
 *   - ECharts' own internal padding around the legend group (~10 px total)
 *   - Visual breathing room between the chart body and the legend column
 *
 * Added to the side-legend reserve so the doughnut's outer arc doesn't
 * sit touching the swatch column. Tuned by eye on 280-720 px wide cards.
 */
const LEGEND_VISUAL_SAFETY_PX = 16;

/** Row height ECharts uses for a single legend line (12 px text + ~6 px padding). */
const LEGEND_ITEM_HEIGHT_PX = 18;

/** Vertical gap ECharts inserts between wrapped legend rows. */
const LEGEND_ROW_GAP_PX = 10;

/**
 * Per-item horizontal slot inside a horizontal legend (icon + icon-text
 * gap + the inter-item gap ECharts inserts between adjacent items). Added
 * to each label's measured pixel width when estimating how many rows the
 * legend will wrap into.
 *
 * ECharts' default `itemWidth: 25` (not the 14 px the visible swatch hints
 * at — there's extra rendering padding around the icon) plus its default
 * 5 px gap to the label plus a 10 px inter-item gap. Over-estimating
 * triggers a slightly larger bottom reserve, which only shows up as a
 * cosmetic extra gap; under-estimating misses the wrap and re-introduces
 * the original overlap bug. We err on the conservative side.
 */
const LEGEND_ITEM_NON_TEXT_PX = 25 /* itemWidth */ + 5 /* icon-text gap */ + 10 /* item-to-item gap */;

const CENTER_LABEL_DEFAULT_GAP_PX = 4;
const CENTER_LABEL_PRIMARY_RATIO = 0.135;
const CENTER_LABEL_PRIMARY_MIN = 18;
const CENTER_LABEL_PRIMARY_MAX = 72;
const CENTER_LABEL_LINE_MIN = 10;
const CENTER_LABEL_LINE_MAX = 96;
const CENTER_LABEL_SECONDARY_SCALE = 0.4;
const CENTER_LABEL_FALLBACK_REF = 320;
const CENTER_LABEL_GRAPHIC_ID = '__ich_pie_center_labels';
// Keep doughnut ring auto-sizing aligned with gauge `percentage`.
const PIE_AUTO_RING_RATIO = 0.075;
const PIE_AUTO_RING_MIN = 8;
const PIE_AUTO_RING_MAX = 36;
const PIE_AUTO_RING_FALLBACK = 20;

/**
 * Per-chart-instance marker for the ResizeObserver. Stored as a symbol on
 * the chart so re-runs of `onInit` (each `_apply()` re-fires it) reuse the
 * same observer instead of stacking duplicates. The observer self-cleans
 * on `chart.isDisposed()` so we don't need an explicit dispose hook.
 */
const PIE_LAYOUT_OBSERVER_KEY = '__bndyIchartsPieLayoutObserver';

interface PieLayoutObserverState {
  observer: ResizeObserver;
  recompute: () => void;
}

export function resolvePieOptions(
  data: PieData,
  options: PieChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const themeName = resolveThemeName(options.theme);
  syncColorHubTheme(themeName);
  const defaultCenterLabelPrimaryColor = getThemeColors()?.textPrimary;
  const defaultCenterLabelSecondaryColor = getThemeColors()?.textSecondary;

  const variant = (options.variant ?? 'default') as PieVariant;
  const names = data.map((d) => d.name);
  const showLegend = options.legend?.show ?? false;
  const showSliceLabel = options.showSliceLabel ?? !showLegend;

  const sorted = options.autoSort !== false
    ? [...data].sort((a, b) => b.value - a.value)
    : data;

  // ECharts pie matches `option.color[i]` to `series.data[i]` by index, so
  // the palette has to follow the SORTED slice order — not the original
  // input order. Otherwise a `colorMap` pin on a name that the sort moves
  // (e.g. Premium at value 420 trailing higher tiers) paints the wrong
  // slice and its matching legend swatch. The legend's display order still
  // follows `names` (the user-supplied order) so callers retain control of
  // the legend layout independent of the painted slice order.
  const sliceNames = sorted.map((d) => d.name);

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  if (options.tooltip?.customHtml) {
    const customHtml = options.tooltip.customHtml;
    tooltip.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => formatPieTooltipSyncHtml(params, options),
      customHtml: (params) =>
        Promise.resolve(customHtml(pieParamsToTooltipContext(params))),
      placeholder: options.tooltip.placeholder,
    });
  }

  const centerLabels = normalizeCenterLabels(
    options.centerLabels,
    defaultCenterLabelPrimaryColor,
    defaultCenterLabelSecondaryColor,
  );
  const centerLabelOffset = options.centerLabelOffset ?? [0, 0];
  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: buildLegend(names, {
      ...options,
      legend: { ...options.legend, show: showLegend },
    }),
    tooltip,
    series: buildPieSeries(sorted, options, variant, showSliceLabel),
    ...(centerLabels
      ? {
          graphic: [
            buildCenterLabelGraphic(
              centerLabels,
              variant,
              0,
              0,
              centerLabelOffset[0],
              centerLabelOffset[1],
              false,
              ctx?.containerWidth,
              ctx?.containerHeight,
            ),
          ],
        }
      : {}),
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  merged.color = resolveColors(sliceNames, options);

  return {
    option: merged,
    onInit: (chart) =>
      applyAdaptiveLayout(
        chart,
        options,
        variant,
        showLegend,
        showSliceLabel,
        names,
        centerLabels,
        centerLabelOffset,
      ),
  };
}

// ---------------------------------------------------------------------------
// Pixel-accurate layout (runtime, knows actual canvas dimensions)
// ---------------------------------------------------------------------------

interface PieLayout {
  center: [number, number];
  radius: [number | string, number | string];
}

/**
 * Compute the pie's pixel-perfect center + radius from actual canvas
 * dimensions and per-edge reserves. Applied via `setOption` merge so the
 * static option's percent fallback is replaced before the user notices.
 */
function computePieLayout(
  W: number,
  H: number,
  reserves: EdgeReserves,
  variant: PieVariant,
  options: PieChartOptions,
): PieLayout {
  const availW = Math.max(0, W - reserves.left - reserves.right);
  const availH = Math.max(0, H - reserves.top - reserves.bottom);

  if (variant === 'half-doughnut') {
    return computeHalfDoughnutLayout(reserves, availW, availH, options);
  }

  // Center sits at the centroid of the available rectangle — the side with
  // the larger reserve "donates" pixels to the opposite edge.
  const cx = reserves.left + availW / 2;
  const cy = reserves.top + availH / 2;

  const outerRadius =
    options.outerRadius !== undefined
      ? options.outerRadius
      : Math.max(PIE_MIN_RADIUS_PX, (Math.min(availW, availH) / 2) * PIE_FILL_FACTOR);

  const innerRadius = resolveInnerRadius(variant, options, outerRadius, availW, availH);

  return {
    center: [Math.round(cx), Math.round(cy)],
    radius: [innerRadius, outerRadius],
  };
}

function computeHalfDoughnutLayout(
  reserves: EdgeReserves,
  availW: number,
  availH: number,
  options: PieChartOptions,
): PieLayout {
  // The arc spans startAngle=180 → endAngle=360 (upper half), so its visible
  // bounding rectangle is `2r` wide and `r` tall, sitting directly above
  // the center point. Two radius constraints:
  //
  //   - horizontal: 2r <= availW   → r <= availW / 2
  //   - vertical:   r  <= availH   (the arc rect is r tall)
  //
  // Take the smaller — the arc fits both ways.
  const limitingRadius = Math.min(availW / 2, availH);
  const outerRadius =
    options.outerRadius !== undefined
      ? options.outerRadius
      : Math.max(PIE_MIN_RADIUS_PX, limitingRadius * HALF_DOUGHNUT_FILL_FACTOR);

  // Center the arc's bounding rectangle vertically inside the available
  // area (between the title's bottom edge and the legend's top edge). The
  // arc rect is `r` tall, so its midpoint sits at `reserves.top + availH/2`
  // and the arc's diameter line (center.y) is half a radius below that.
  //
  // This replaces the old "anchor to the bottom" placement, which glued the
  // diameter to `H - reserves.bottom` and left all the vertical slack on
  // top — fine for short cards, ugly in tall ones where the grid stretches
  // the card to match a taller sibling.
  const cx = reserves.left + availW / 2;
  const radiusForCenter = typeof outerRadius === 'number' ? outerRadius : limitingRadius;
  const cy = reserves.top + availH / 2 + radiusForCenter / 2;

  // Ring thickness scales with the outer radius so a tiny chart doesn't
  // collapse to a hairline ring and a giant chart doesn't get an oversize
  // gap. Capped at 60 px so the ring stays visually thin on large cards.
  const ring =
    resolveAutoRingWidth(availW, availH);
  const innerRadius =
    options.innerRadius !== undefined
      ? options.innerRadius
      : typeof outerRadius === 'number'
        ? Math.max(0, outerRadius - ring)
        : '60%';

  return {
    center: [Math.round(cx), Math.round(cy)],
    radius: [innerRadius, outerRadius],
  };
}

function resolveInnerRadius(
  variant: PieVariant,
  options: PieChartOptions,
  outerRadius: number | string,
  availW?: number,
  availH?: number,
): number | string {
  if (options.innerRadius !== undefined) return options.innerRadius;
  if (variant === 'doughnut') {
    if (typeof outerRadius === 'number') {
      const ring = resolveAutoRingWidth(availW, availH);
      return Math.max(0, outerRadius - ring);
    }
    return '50%';
  }
  if (variant === 'nightingale') return typeof outerRadius === 'number' ? 16 : 20;
  return 0;
}

function resolveAutoRingWidth(w?: number, h?: number): number {
  if (!w || !h) return PIE_AUTO_RING_FALLBACK;
  const ref = Math.min(w, h);
  return clampRound(
    ref * PIE_AUTO_RING_RATIO,
    PIE_AUTO_RING_MIN,
    PIE_AUTO_RING_MAX,
  );
}

/**
 * Pixel-accurate edge reserves derived from actual canvas dimensions plus
 * title / legend / outside-label budgets.
 *
 * The horizontal-legend row count depends on the canvas width — five
 * tier names like `Premium`/`Pro`/`Standard`/`Basic`/`Churned` pack into
 * one row at 720 px but wrap to two at 380 px. Estimating that here lets
 * the half-doughnut's bottom edge clear a multi-row legend instead of
 * relying on the single-row assumption baked into `LEGEND_RESERVE`.
 *
 * `W` is optional so the function still works in the static-option path
 * (where canvas dimensions aren't known yet). When omitted, falls back to
 * the row-agnostic reserve `getLegendReserve` returns.
 */
function computeEdgeReserves(
  options: PieChartOptions,
  showLegend: boolean,
  showSliceLabel: boolean,
  names: ReadonlyArray<string>,
  W?: number,
): EdgeReserves {
  const p = options.padding ?? 12;
  const title = getTitleReserve(options);
  const legend = getLegendReserve(options, showLegend, 0, names);
  const labelGap = showSliceLabel ? PIE_LABEL_OVERFLOW_PX : 0;

  // Side legends sit at `right: p` (chart padding), so the chart body needs
  // to leave room for the legend group AND the padding AND a visual gap.
  const sidePad = (edge: number): number =>
    edge > 0 ? edge + p + LEGEND_VISUAL_SAFETY_PX : 0;

  // For horizontal (top / bottom) legends, when we know the canvas width
  // we can estimate the rendered row count and replace the single-row
  // assumption baked into `LEGEND_RESERVE` with a row-aware reserve.
  // Skips the work when the legend isn't shown or names are empty.
  const horizontalReserve = (edge: number): number => {
    if (edge <= 0) return 0;
    if (W === undefined || names.length === 0) return edge;
    const rows = estimateHorizontalLegendRows(names, W - 2 * p);
    if (rows <= 1) return edge;
    const dynamicHeight =
      rows * LEGEND_ITEM_HEIGHT_PX + (rows - 1) * LEGEND_ROW_GAP_PX + p;
    return Math.max(edge, dynamicHeight);
  };

  return {
    top: (title.top > 0 ? p + title.top : 0) + horizontalReserve(legend.top) + labelGap,
    bottom: horizontalReserve(legend.bottom) + labelGap,
    left: sidePad(legend.left) + labelGap,
    right: sidePad(legend.right) + labelGap,
  };
}

/**
 * Greedily pack legend item widths into rows to estimate how many rows
 * ECharts will wrap the legend into at the given canvas width. Mirrors
 * ECharts' own placement loop closely enough for our reserve math —
 * we're not trying to reproduce pixel-perfect layout, just predict
 * whether the legend will be one row or multiple.
 */
function estimateHorizontalLegendRows(
  names: ReadonlyArray<string>,
  availWidth: number,
): number {
  if (availWidth <= 0) return 1;
  let rows = 1;
  let rowWidth = 0;
  for (const name of names) {
    const itemW = measureTextWidth(name) + LEGEND_ITEM_NON_TEXT_PX;
    if (rowWidth + itemW > availWidth && rowWidth > 0) {
      rows += 1;
      rowWidth = itemW;
    } else {
      rowWidth += itemW;
    }
  }
  return rows;
}

/**
 * Replace the static option's center/radius with pixel-accurate values
 * computed from the chart's real container dimensions. Idempotent across
 * repeated `_apply()` calls and re-runs on container resize.
 */
function applyAdaptiveLayout(
  chart: echarts.ECharts,
  options: PieChartOptions,
  variant: PieVariant,
  showLegend: boolean,
  showSliceLabel: boolean,
  names: ReadonlyArray<string>,
  centerLabels?: NormalizedCenterLabels,
  centerLabelOffset: [number, number] = [0, 0],
): void {
  const recompute = (): void => {
    if (chart.isDisposed()) return;
    const W = chart.getWidth();
    const H = chart.getHeight();
    if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
      // Container hasn't been laid out yet — the ResizeObserver will fire
      // when it does. Leave the static option's percent fallback in place
      // for the moment.
      return;
    }
    const reserves = computeEdgeReserves(options, showLegend, showSliceLabel, names, W);
    const layout = computePieLayout(W, H, reserves, variant, options);
    const payload: Record<string, unknown> = {
      series: [{ center: layout.center, radius: layout.radius }],
    };
    if (centerLabels) {
      payload.graphic = [
        buildCenterLabelGraphic(
          centerLabels,
          variant,
          layout.center[0],
          layout.center[1],
          centerLabelOffset[0],
          centerLabelOffset[1],
          true,
          W,
          H,
        ),
      ];
    }
    chart.setOption(
      payload,
      // Merge, not replace — we only want to overwrite center/radius and
      // leave the data / colors / labels / etc. that the static option
      // already set up.
      false,
    );
  };

  recompute();
  attachResizeObserver(chart, recompute);
}

/**
 * Attach a ResizeObserver to the chart's container DOM that re-runs the
 * pixel-layout recompute whenever the container changes size. Idempotent
 * per chart instance — repeated `onInit` calls (each `_apply()`) reuse
 * the same observer. The observer self-disconnects when the chart is
 * disposed so we don't leak listeners.
 */
function attachResizeObserver(
  chart: echarts.ECharts,
  recompute: () => void,
): void {
  if (typeof ResizeObserver === 'undefined') return; // SSR / older browsers
  const slot = chart as unknown as Record<string, unknown>;
  const existing = slot[PIE_LAYOUT_OBSERVER_KEY] as PieLayoutObserverState | undefined;
  if (existing) {
    // Keep a single observer per chart instance, but always refresh the
    // callback so theme/layout updates don't replay stale closures.
    existing.recompute = recompute;
    return;
  }

  const dom = chart.getDom() as HTMLElement | undefined;
  if (!dom) return;

  const state = {} as PieLayoutObserverState;
  state.recompute = recompute;
  const observer = new ResizeObserver(() => {
    if (chart.isDisposed()) {
      observer.disconnect();
      delete slot[PIE_LAYOUT_OBSERVER_KEY];
      return;
    }
    state.recompute();
  });
  observer.observe(dom);
  state.observer = observer;
  slot[PIE_LAYOUT_OBSERVER_KEY] = state;
}

// ---------------------------------------------------------------------------
// Static option construction (fallback for the very first paint)
// ---------------------------------------------------------------------------

function buildPieSeries(
  data: PieData,
  options: PieChartOptions,
  variant: PieVariant,
  showSliceLabel: boolean,
): Record<string, unknown>[] {
  // Reasonable centered defaults — these are only used until `onInit` fires
  // immediately after the first `setOption`. By then the user sees the
  // pixel-accurate layout. Tests that don't run onInit still get these
  // values, which keeps the static option assertable without mocks.
  const series: Record<string, unknown> = {
    type: 'pie',
    center: ['50%', '50%'],
    radius: defaultStaticRadius(variant, options),
    avoidLabelOverlap: true,
    data: data.map((d) => ({ name: d.name, value: d.value })),
    label: {
      show: showSliceLabel,
      position: 'outside',
      formatter: '{b}: {d}%',
      fontSize: getLabelFontSize(options),
    },
  };

  if (variant === 'half-doughnut') {
    series.startAngle = 180;
    series.endAngle = 360;
    series.center = ['50%', '75%'];
  }
  if (variant === 'nightingale') {
    series.roseType = 'radius';
  }

  applySliceStyle(series, options);
  return [series];
}

function defaultStaticRadius(
  variant: PieVariant,
  options: PieChartOptions,
): [number | string, number | string] {
  const inner =
    options.innerRadius !== undefined
      ? options.innerRadius
      : variant === 'doughnut'
        ? '50%'
        : variant === 'nightingale'
          ? 20
          : variant === 'half-doughnut'
            ? '60%'
            : 0;
  const outer =
    options.outerRadius !== undefined
      ? options.outerRadius
      : variant === 'half-doughnut'
        ? '90%'
        : '70%';
  return [inner, outer];
}

function applySliceStyle(series: Record<string, unknown>, options: PieChartOptions): void {
  if (options.sliceGap !== undefined) {
    series.padAngle = options.sliceGap;
  }

  const itemStyle: Record<string, unknown> = {};
  if (options.sliceBorderRadius !== undefined) itemStyle.borderRadius = options.sliceBorderRadius;
  if (options.sliceBorderColor !== undefined) itemStyle.borderColor = options.sliceBorderColor;
  if (Object.keys(itemStyle).length > 0) {
    series.itemStyle = itemStyle;
  }
}

interface NormalizedCenterLabelLine {
  plainText: string;
  richText?: string;
  rich?: Record<string, Record<string, unknown>>;
  isRich: boolean;
}

interface NormalizedCenterLabels {
  lines: NormalizedCenterLabelLine[];
  gap: number;
  defaultPrimaryColor?: string;
  defaultSecondaryColor?: string;
}

function normalizeCenterLabelLine(line: PieCenterLabel, index: number): NormalizedCenterLabelLine {
  if (typeof line === 'string') {
    return {
      plainText: line,
      isRich: false,
    };
  }
  const compiled = compileRichText(line, `pie_center_${index}`);
  return {
    plainText: compiled.plainText,
    richText: compiled.text,
    rich: compiled.rich as Record<string, Record<string, unknown>> | undefined,
    isRich: true,
  };
}

function normalizeCenterLabels(
  centerLabels: PieCenterLabel[] | undefined,
  defaultPrimaryColor?: string,
  defaultSecondaryColor?: string,
): NormalizedCenterLabels | undefined {
  if (!centerLabels) return undefined;
  const lines = centerLabels
    .map((line, index) => normalizeCenterLabelLine(line, index))
    .filter((line) => line.plainText.trim().length > 0);
  if (lines.length === 0) return undefined;
  return {
    lines,
    gap: CENTER_LABEL_DEFAULT_GAP_PX,
    defaultPrimaryColor,
    defaultSecondaryColor,
  };
}

function clampRound(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function resolveCenterLabelBaseFont(w?: number, h?: number): number {
  const ref = w && h ? Math.min(w, h) : CENTER_LABEL_FALLBACK_REF;
  return clampRound(
    ref * CENTER_LABEL_PRIMARY_RATIO,
    CENTER_LABEL_PRIMARY_MIN,
    CENTER_LABEL_PRIMARY_MAX,
  );
}

function centerLabelToken(index: number): string {
  return `cl${index}`;
}

function extractRichTokenKeys(text: string): string[] {
  const keys: string[] = [];
  const re = /\{([^|{}]+)\|/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

function buildCenterLabelRich(
  centerLabels: NormalizedCenterLabels,
  variant: PieVariant,
  w?: number,
  h?: number,
): { formatter: string; rich: Record<string, Record<string, unknown>> } {
  // Half-doughnut dedicates less vertical room to the inner label block, so
  // nudge base size down slightly to keep two+ lines readable without overlap.
  const variantScale = variant === 'half-doughnut' ? 0.9 : 1;
  const base = resolveCenterLabelBaseFont(w, h) * variantScale;
  const rich: Record<string, Record<string, unknown>> = {};
  const formatterLines: string[] = [];
  centerLabels.lines.forEach((line, index) => {
    const isPrimary = index === 0;
    const token = centerLabelToken(index);
    const scale = isPrimary ? 1 : CENTER_LABEL_SECONDARY_SCALE;
    const fontSize = clampRound(
      base * scale,
      CENTER_LABEL_LINE_MIN,
      CENTER_LABEL_LINE_MAX,
    );
    const fontWeight = isPrimary ? 700 : 400;
    const lineDefaultColor = isPrimary
      ? centerLabels.defaultPrimaryColor
      : centerLabels.defaultSecondaryColor ?? centerLabels.defaultPrimaryColor;

    if (!line.isRich || !line.richText || !line.rich) {
      rich[token] = {
        fontSize,
        fontWeight,
        color: lineDefaultColor,
        fill: lineDefaultColor,
        lineHeight: fontSize + centerLabels.gap,
        align: 'center',
        verticalAlign: 'middle',
      };
      formatterLines.push(`{${token}|${line.plainText}}`);
      return;
    }
    const tokenKeys = extractRichTokenKeys(line.richText);
    for (const [styleKey, styleValue] of Object.entries(line.rich)) {
      const shouldApplyLineDefaults = tokenKeys.includes(styleKey);
      rich[styleKey] = {
        ...styleValue,
        fontSize:
          styleValue.fontSize ?? (shouldApplyLineDefaults ? fontSize : undefined),
        fontWeight:
          styleValue.fontWeight ?? (shouldApplyLineDefaults ? fontWeight : undefined),
        color: styleValue.color ?? lineDefaultColor,
        fill: (styleValue as Record<string, unknown>).fill ?? styleValue.color ?? lineDefaultColor,
        lineHeight:
          styleValue.lineHeight ??
          (shouldApplyLineDefaults ? fontSize + centerLabels.gap : undefined),
      };
    }
    formatterLines.push(line.richText);
  });
  return {
    formatter: formatterLines.join('\n'),
    rich,
  };
}

function buildCenterLabelGraphic(
  centerLabels: NormalizedCenterLabels,
  variant: PieVariant,
  centerX: number,
  centerY: number,
  offsetX: number,
  offsetY: number,
  visible: boolean,
  w?: number,
  h?: number,
): Record<string, unknown> {
  const label = buildCenterLabelRich(centerLabels, variant, w, h);
  return {
    id: CENTER_LABEL_GRAPHIC_ID,
    type: 'text',
    x: centerX + offsetX,
    y: centerY + offsetY,
    invisible: !visible,
    silent: true,
    z: 20,
    style: {
      x: 0,
      y: 0,
      text: label.formatter,
      rich: label.rich,
      fill: centerLabels.defaultPrimaryColor,
      textAlign: 'center',
      textVerticalAlign: 'middle',
    },
  };
}

// ---------------------------------------------------------------------------
// Internal test helpers — exported under a `__test` namespace so the unit
// tests can pin the pixel-layout math without an actual ECharts instance.
// ---------------------------------------------------------------------------

export const __test = {
  computeEdgeReserves,
  computePieLayout,
};
