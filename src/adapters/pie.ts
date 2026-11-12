import type {
  PieData,
  PieDataItem,
  PieConcentricData,
  PieChartOptions,
  PieVariant,
  PieCenterLabel,
} from '../types.js';
import type * as echarts from 'echarts';
import type { ChartSetupResult, RenderContext } from './index.js';
import { getConfig } from '../config.js';
import {
  formatPieTooltipSyncHtml,
  pieParamsToTooltipContext,
  type PieRingTooltipValue,
} from '../tooltip-context.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  type EdgeReserves,
  buildTitle,
  buildLegend,
  buildAsyncTooltipFormatter,
  buildEmphasisBlur,
  compileRichText,
  getLabelFontSize,
  getLegendReserve,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
  applyConfiguredFontFamilyToOption,
} from './common/index.js';
import { measureTextWidth } from './common/text-measure.js';
import { getThemeColors, resolveThemeName } from '../themes/index.js';

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
// breakpoints). `onInit` returns the observer's teardown (a `ChartTeardown`),
// so the engine disconnects it before the next render and on `dispose()` —
// no per-instance state stashed on the chart, no `isDisposed()` polling.

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
const NIGHTINGALE_INNER_CORNER_RADIUS = 4;

interface PieSeriesEntry {
  name?: string;
  data: PieDataItem[];
}

export function resolvePieOptions(
  data: PieData | PieConcentricData,
  options: PieChartOptions,
  ctx?: RenderContext,
): ChartSetupResult {
  const themeName = resolveThemeName(options.theme);
  const defaultCenterLabelPrimaryColor = getThemeColors(themeName).textPrimary;
  const defaultCenterLabelSecondaryColor = getThemeColors(themeName).textSecondary;

  // Normalize both input shapes into a series list. `Array.isArray(data)` is
  // the legacy single-series `PieData`; `{ series: [...] }` is the new
  // concentric shape. `isConcentric` drives every multi-ring branch below so
  // the legacy path stays byte-for-byte identical.
  const seriesList: PieSeriesEntry[] = Array.isArray(data)
    ? [{ name: undefined, data }]
    : data.series;
  const isConcentric = seriesList.length > 1;

  const variant = (options.variant ?? 'default') as PieVariant;
  // Legend names are the union of category names across rings (first-
  // appearance order). For a single series this is the input slice order —
  // unchanged from before.
  const names = isConcentric
    ? uniqueCategoryNames(seriesList)
    : seriesList[0].data.map((d) => d.name);
  const showLegend = options.legend?.show ?? false;
  const showSliceLabel = options.showSliceLabel ?? !showLegend;

  // Each ring sorts independently by value desc (or keeps input order).
  const sortedSeriesList: PieSeriesEntry[] = seriesList.map((s) => ({
    name: s.name,
    data: options.autoSort !== false
      ? [...s.data].sort((a, b) => b.value - a.value)
      : s.data,
  }));

  // ECharts pie matches `option.color[i]` to `series.data[i]` by index, so
  // the palette has to follow the SORTED slice order — not the original
  // input order. Otherwise a `colorMap` pin on a name that the sort moves
  // (e.g. Premium at value 420 trailing higher tiers) paints the wrong
  // slice and its matching legend swatch. The legend's display order still
  // follows `names` (the user-supplied order) so callers retain control of
  // the legend layout independent of the painted slice order.
  const sliceNames = sortedSeriesList[0].data.map((d) => d.name);

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  // Concentric charts aggregate the hovered category across every ring so the
  // default tooltip can render one row per ring (compare across datasets).
  const ringsByCategory = isConcentric ? buildRingsByCategory(seriesList) : undefined;
  const defaultSync = (params: unknown): string =>
    formatPieTooltipSyncHtml(params, options, ringsByCategory);
  const pieFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync,
    toContext: pieParamsToTooltipContext,
  });
  // Always install a formatter: with `customHtml`/`appendHtml` the async
  // wrapper composes them around `defaultSync`; otherwise the unified default
  // layout (single-line / header+line / concentric rows) replaces ECharts'
  // built-in tooltip.
  tooltip.formatter = pieFormatter ?? defaultSync;

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
    series: isConcentric
      ? buildConcentricSeries(sortedSeriesList, options, variant, showSliceLabel)
      : buildPieSeries(sortedSeriesList[0].data, options, variant, showSliceLabel),
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
  if (isConcentric) {
    // Concentric rings paint by NAME, not by index: resolve the union of
    // category names once, then stamp each datum with its color so a
    // category keeps the same color across rings even when orders differ or
    // it's missing from some datasets.
    const unionColors = resolveColors(names, options);
    merged.color = unionColors;
    paintPieSlices(merged, new Map(names.map((n, i) => [n, unionColors[i]])));
  } else {
    merged.color = resolveColors(sliceNames, options);
  }

  const seriesCount = Array.isArray(merged.series)
    ? (merged.series as unknown[]).length
    : sortedSeriesList.length;

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
        sortedSeriesList.length,
        seriesCount,
      ),
  };
}

// ---------------------------------------------------------------------------
// Pixel-accurate layout (runtime, knows actual canvas dimensions)
// ---------------------------------------------------------------------------

interface PieLayout {
  center: [number, number];
  radius: [number | string, number | string];
  /** Multi-ring radii (inner → outer), present only for concentric pies. */
  radii?: Array<[number, number]>;
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

/**
 * Convert an ECharts pie radius value (px number, `"NN%"` string, or a
 * numeric string) into pixels against `ref` (ECharts resolves pie-radius
 * percentages against `min(width, height) / 2`).
 */
function resolveRadiusPx(radius: number | string, ref: number): number {
  if (typeof radius === 'number') return radius;
  if (radius.includes('%')) {
    const pct = parseFloat(radius);
    return Number.isFinite(pct) ? (pct / 100) * ref : ref;
  }
  const px = Number(radius);
  return Number.isFinite(px) ? px : ref;
}

/**
 * Split the `[innerBase, outer]` span into `count` concentric, non-
 * overlapping bands with a small gap between neighbours.
 */
function computeConcentricRadii(
  outer: number,
  options: PieChartOptions,
  count: number,
  ref: number,
  availW?: number,
  availH?: number,
): Array<[number, number]> {
  let innerStart: number;
  let thickness: number;
  let gap: number;

  if (options.innerRadius !== undefined) {
    const inner = Math.max(0, resolveRadiusPx(options.innerRadius, ref));
    const span = Math.max(0, outer - inner);
    gap = clampRound(span * 0.04, 2, 8);
    thickness = Math.max(1, (span - gap * (count - 1)) / count);
    innerStart = inner;
  } else {
    // Each ring gets the same auto-scaled thickness as a single doughnut
    // (`PIE_AUTO_RING_RATIO`, clamped 8–36 px), so adding datasets adds
    // rings instead of thinning the existing one. If they don't fit inside
    // `outer`, squeeze them proportionally.
    const ring = resolveAutoRingWidth(availW, availH);
    gap = clampRound(ring * 0.3, 2, 8);
    const desired = count * ring + gap * (count - 1);
    if (desired <= outer) {
      innerStart = outer - desired;
      thickness = ring;
    } else {
      gap = clampRound(outer * 0.04, 1, 6);
      thickness = Math.max(1, (outer - gap * (count - 1)) / count);
      innerStart = Math.max(0, outer - (count * thickness + gap * (count - 1)));
    }
  }

  const radii: Array<[number, number]> = [];
  for (let i = 0; i < count; i += 1) {
    const r0 = innerStart + i * (thickness + gap);
    radii.push([round1(r0), round1(r0 + thickness)]);
  }
  radii[count - 1][1] = outer; // pin the outermost edge to avoid float drift
  return radii;
}

/**
 * Concentric multi-ring layout: a shared center plus one radius band per
 * series. Reuses the same edge reserves / fill factors as the single-series
 * path so title + legend layout behave identically.
 */
function computeConcentricLayout(
  W: number,
  H: number,
  reserves: EdgeReserves,
  variant: PieVariant,
  options: PieChartOptions,
  count: number,
): PieLayout {
  const availW = Math.max(0, W - reserves.left - reserves.right);
  const availH = Math.max(0, H - reserves.top - reserves.bottom);
  const ref = Math.min(W, H) / 2;

  let cx: number;
  let cy: number;
  let outer: number;

  if (variant === 'half-doughnut') {
    const limitingRadius = Math.min(availW / 2, availH);
    outer =
      options.outerRadius !== undefined
        ? resolveRadiusPx(options.outerRadius, ref)
        : Math.max(PIE_MIN_RADIUS_PX, limitingRadius * HALF_DOUGHNUT_FILL_FACTOR);
    cx = reserves.left + availW / 2;
    cy = reserves.top + availH / 2 + outer / 2;
  } else {
    outer =
      options.outerRadius !== undefined
        ? resolveRadiusPx(options.outerRadius, ref)
        : Math.max(PIE_MIN_RADIUS_PX, (Math.min(availW, availH) / 2) * PIE_FILL_FACTOR);
    cx = reserves.left + availW / 2;
    cy = reserves.top + availH / 2;
  }

  const radii = computeConcentricRadii(outer, options, count, ref, availW, availH);

  return {
    center: [Math.round(cx), Math.round(cy)],
    radius: [radii[0][0], radii[count - 1][1]],
    radii,
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
 * computed from the chart's real container dimensions, then attach a
 * `ResizeObserver` so the layout re-flows on container resize. Returns the
 * observer teardown (a `ChartTeardown`) for the engine to call before the
 * next render and on dispose — or `undefined` when there's nothing to clean
 * up (SSR / no `ResizeObserver` / detached DOM).
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
  ringCount = 1,
  seriesCount = 1,
): (() => void) | void {
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
    const layout =
      ringCount > 1
        ? computeConcentricLayout(W, H, reserves, variant, options, ringCount)
        : computePieLayout(W, H, reserves, variant, options);

    // One `{ center, radius }` entry per series. A caller that pinned an
    // explicit `center` / `radius` on a series (via `options.echarts.series`)
    // keeps it — we only fill in the fields they left empty.
    const series: Record<string, unknown>[] = [];
    const count = Math.min(ringCount, seriesCount);
    for (let i = 0; i < count; i += 1) {
      const explicit = explicitSeriesEntry(options, i);
      const radius =
        ringCount > 1 ? (layout.radii as Array<[number, number]>)[i] : layout.radius;
      const entry: Record<string, unknown> = {};
      if (!explicit || explicit.center === undefined) entry.center = layout.center;
      if (!explicit || explicit.radius === undefined) entry.radius = radius;
      if (Object.keys(entry).length > 0) series.push(entry);
    }
    const payload: Record<string, unknown> = { series };
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
    applyConfiguredFontFamilyToOption(payload, getConfig().fontFamily);
    chart.setOption(
      payload,
      // Merge, not replace — we only want to overwrite center/radius and
      // leave the data / colors / labels / etc. that the static option
      // already set up.
      false,
    );
  };

  recompute();
  return attachResizeObserver(chart, recompute);
}

/**
 * Resolve the user's explicit per-series override for `center` / `radius`,
 * if any. `options.echarts.series` can be an array (index-addressed) or a
 * single object (applied to every series by ECharts).
 */
function explicitSeriesEntry(
  options: PieChartOptions,
  index: number,
): Record<string, unknown> | undefined {
  const series = options.echarts?.series;
  if (Array.isArray(series)) {
    const entry = series[index];
    return entry && typeof entry === 'object' && !Array.isArray(entry)
      ? (entry as Record<string, unknown>)
      : undefined;
  }
  if (series && typeof series === 'object' && !Array.isArray(series)) {
    return series as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Attach a ResizeObserver to the chart's container DOM that re-runs the
 * pixel-layout recompute whenever the container changes size. Returns a
 * teardown that disconnects the observer; the engine calls it before the
 * next render (so each `_apply()` gets a fresh observer bound to the latest
 * closure) and on `dispose()`. Returns `undefined` when there's no observer
 * to manage (SSR / older browsers / detached DOM).
 */
function attachResizeObserver(
  chart: echarts.ECharts,
  recompute: () => void,
): (() => void) | void {
  if (typeof ResizeObserver === 'undefined') return; // SSR / older browsers
  const dom = chart.getDom() as HTMLElement | undefined;
  if (!dom) return;

  const observer = new ResizeObserver(() => {
    // Belt-and-suspenders: the engine disconnects on dispose, but a queued
    // resize entry could still fire in the same tick — bail if disposed.
    if (chart.isDisposed()) {
      observer.disconnect();
      return;
    }
    recompute();
  });
  observer.observe(dom);
  return () => observer.disconnect();
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

  applySliceStyle(series, options, variant);

  // Slices are data items in one series → focus 'self' fades the other slices
  // when one is hovered / highlighted (opt-in).
  Object.assign(series, buildEmphasisBlur(options.emphasis, 'self'));

  return [series];
}

/** Ordered, de-duplicated category names across all rings (first appearance). */
function uniqueCategoryNames(seriesList: ReadonlyArray<PieSeriesEntry>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of seriesList) {
    for (const d of s.data) {
      if (!seen.has(d.name)) {
        seen.add(d.name);
        out.push(d.name);
      }
    }
  }
  return out;
}

/**
 * Map each category name to its per-ring values (in inner → outer ring
 * order). Consumed by {@link formatPieTooltipSyncHtml} to build the
 * concentric multi-row tooltip body.
 */
function buildRingsByCategory(
  seriesList: ReadonlyArray<PieSeriesEntry>,
): Map<string, PieRingTooltipValue[]> {
  const map = new Map<string, PieRingTooltipValue[]>();
  for (const s of seriesList) {
    for (const d of s.data) {
      const rows = map.get(d.name);
      const row: PieRingTooltipValue = { name: s.name, value: d.value };
      if (rows) rows.push(row);
      else map.set(d.name, [row]);
    }
  }
  return map;
}

/**
 * Stamp each slice with its resolved color by NAME (like `paintGraphNodes`
 * for graph types) so a category keeps the same color across rings even when
 * orders differ or it's missing from some datasets. Respects a caller's own
 * per-datum `itemStyle.color`.
 */
function paintPieSlices(
  option: Record<string, unknown>,
  nameToColor: ReadonlyMap<string, string>,
): void {
  let series = option.series;
  if (!Array.isArray(series)) {
    if (series && typeof series === 'object') series = [series];
    else return;
  }
  for (const s of series as Record<string, unknown>[]) {
    if (!s || typeof s !== 'object' || s.type !== 'pie') continue;
    const data = s.data;
    if (!Array.isArray(data)) continue;
    for (const datum of data as Record<string, unknown>[]) {
      if (!datum || typeof datum !== 'object') continue;
      const name = datum.name;
      if (typeof name !== 'string') continue;
      const existing = (datum.itemStyle as Record<string, unknown> | undefined)?.color;
      if (existing) continue;
      const color = nameToColor.get(name);
      if (color) {
        datum.itemStyle = {
          ...(datum.itemStyle as Record<string, unknown> | undefined),
          color,
        };
      }
    }
  }
}

function buildConcentricSeries(
  seriesList: ReadonlyArray<PieSeriesEntry>,
  options: PieChartOptions,
  variant: PieVariant,
  showSliceLabel: boolean,
): Record<string, unknown>[] {
  const count = seriesList.length;
  return seriesList.map((entry, index) => {
    const series: Record<string, unknown> = {
      type: 'pie',
      center: ['50%', '50%'],
      radius: staticConcentricRadius(index, count, variant, options),
      avoidLabelOverlap: true,
      data: entry.data.map((d) => ({ name: d.name, value: d.value })),
      // Outside labels only on the outermost ring — inner-ring leader lines
      // would collide with the outer bands.
      label: {
        show: showSliceLabel && index === count - 1,
        position: 'outside',
        formatter: '{b}: {d}%',
        fontSize: getLabelFontSize(options),
      },
    };

    if (entry.name) series.name = entry.name;
    if (variant === 'half-doughnut') {
      series.startAngle = 180;
      series.endAngle = 360;
      series.center = ['50%', '75%'];
    }
    if (variant === 'nightingale') {
      series.roseType = 'radius';
    }

    applySliceStyle(series, options, variant);
    Object.assign(series, buildEmphasisBlur(options.emphasis, 'self'));

    return series;
  });
}

/** Percent/px fallback radii for the very first paint (onInit refines to px). */
function staticConcentricRadius(
  index: number,
  count: number,
  variant: PieVariant,
  options: PieChartOptions,
): [number | string, number | string] {
  const outer = options.outerRadius ?? defaultStaticOuter(variant);

  // px-space: outer is a number → distribute `[inner, outer]` in pixels.
  if (typeof outer === 'number') {
    const innerBase =
      typeof options.innerRadius === 'number'
        ? options.innerRadius
        : Math.max(0, outer - count * PIE_AUTO_RING_FALLBACK - (count - 1) * 3);
    return splitStaticSpan(innerBase, outer, count, index);
  }

  // percent-space (outer is `"NN%"` or a fallback string).
  const outerPct = parsePct(outer);
  if (typeof options.innerRadius === 'string') {
    const span = Math.max(0, outerPct - parsePct(options.innerRadius));
    const gap = Math.max(0.5, span * 0.04);
    const thickness = Math.max(0.5, (span - gap * (count - 1)) / count);
    const r0 = parsePct(options.innerRadius) + index * (thickness + gap);
    return [`${r0}%`, `${r0 + thickness}%`];
  }
  // Auto: mirror PIE_AUTO_RING_RATIO (0.075 × 2 = 15% of the radius ref).
  const ring = 15;
  const gap = 3;
  const innerStart = Math.max(0, outerPct - count * ring - (count - 1) * gap);
  const r0 = innerStart + index * (ring + gap);
  return [`${r0}%`, `${r0 + ring}%`];
}

function defaultStaticOuter(variant: PieVariant): string {
  return variant === 'half-doughnut' ? '90%' : '70%';
}

function parsePct(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function splitStaticSpan(
  innerBase: number,
  outer: number,
  count: number,
  index: number,
): [number, number] {
  const span = Math.max(0, outer - innerBase);
  const gap = clampRound(span * 0.04, 1, 8);
  const thickness = Math.max(1, (span - gap * (count - 1)) / count);
  const r0 = innerBase + index * (thickness + gap);
  return [r0, r0 + thickness];
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

function applySliceStyle(
  series: Record<string, unknown>,
  options: PieChartOptions,
  variant: PieVariant,
): void {
  if (options.sliceGap !== undefined) {
    series.padAngle = options.sliceGap;
  }

  const itemStyle: Record<string, unknown> = {};
  if (options.sliceBorderRadius !== undefined) {
    itemStyle.borderRadius = variant === 'nightingale'
      ? [
          NIGHTINGALE_INNER_CORNER_RADIUS,
          NIGHTINGALE_INNER_CORNER_RADIUS,
          options.sliceBorderRadius,
          options.sliceBorderRadius,
        ]
      : options.sliceBorderRadius;
  }
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
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
  computeConcentricLayout,
};
