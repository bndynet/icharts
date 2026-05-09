import type { RadarData, RadarChartOptions, RadarVariant } from '../types.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  type EdgeReserves,
  buildTitle,
  buildLegend,
  getLegendReserve,
  getTitleReserve,
} from './common.js';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
//
// Radar is anchored by a percentage `center` (relative to the full canvas)
// and a percentage `radius` (relative to half of `min(width, height)`). The
// adapter doesn't know the runtime canvas size, so we convert pixel reserves
// (title height, legend slot) to percent offsets against a reference card
// size — the same chart-box dimensions used by every site demo. Charts
// shorter/wider than the reference still render correctly; the radar just
// occupies slightly more or less of the available space, which is fine for
// a typical 320–480 px card. Users who need exact pixel control can set
// `options.radius` and/or `options.echarts.radar.center` directly.

const RADAR_REFERENCE_HEIGHT = 320;
const RADAR_REFERENCE_WIDTH = 480;

/** Baseline radius when nothing else is competing for canvas space. */
const RADAR_BASE_RADIUS_PCT = 65;

/** Floor so the polygon never collapses to a postage stamp on cramped layouts. */
const RADAR_MIN_RADIUS_PCT = 45;

/**
 * Extra pixel gap reserved between the radar's axisName labels and the
 * legend (or title) on the same edge. `LEGEND_RESERVE` covers only the
 * legend's own height — without this padding the polygon's outer
 * indicator labels visually touch the legend row because they extend
 * ~15 px past the polygon radius. Tuned by eye on the default 320 px
 * chart-box height; adjust if you change `axisName.padding` defaults.
 */
const RADAR_EDGE_GAP = 24;

/**
 * Aggressiveness of the radius shrink as edge reserves grow. The product
 * `loss * RADAR_RADIUS_SHRINK_FACTOR` is the percentage points removed from
 * the baseline radius — picked so a single bottom legend (≈11% loss on a
 * 320 px card) shrinks from 65% → ≈61%, and a legend + title combined
 * (≈23% loss) shrinks to ≈57%. Lower values keep the polygon roomy at the
 * cost of pushing labels closer to the legend / title edges.
 */
const RADAR_RADIUS_SHRINK_FACTOR = 35;

export function resolveRadarOptions(
  data: RadarData,
  options: RadarChartOptions,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as RadarVariant;
  const names = data.series.map((s) => s.name);
  const showLegend = options.legend?.show ?? names.length > 1;

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    legend: buildLegend(names, {
      ...options,
      legend: { ...options.legend, show: showLegend },
    }),
    tooltip: buildRadarTooltip(options),
    radar: buildRadarComponent(data, options, variant, showLegend),
    series: buildRadarSeries(data, options),
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  merged.color = resolveColors(names, options);
  return merged;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Pixel reserves at each canvas edge driven by title + legend position.
 *
 * Delegates legend-slot math to the shared {@link getLegendReserve}
 * helper so a radar placed beside an XY chart agrees on how much space
 * the legend row needs (the XY grid path consumes the same helper via
 * {@link buildGrid}). Adds {@link RADAR_EDGE_GAP} as the `extraGap`
 * argument to account for radar.axisName labels overflowing the
 * polygon.
 */
function getEdgeReserves(
  options: RadarChartOptions,
  showLegend: boolean,
): EdgeReserves {
  const p = options.padding ?? 12;
  // Compose two EdgeReserves in the same edge math. Title contributes
  // `p + h` (title-only paths add chart padding above the widget); we
  // don't pre-add p inside getTitleReserve because percent-center math
  // expects padding-free reserves — see EdgeReserves docblock.
  const title = getTitleReserve(options);
  const legend = getLegendReserve(options, showLegend, RADAR_EDGE_GAP);
  return {
    top: (title.top > 0 ? p + title.top : 0) + legend.top,
    bottom: legend.bottom,
    left: legend.left,
    right: legend.right,
  };
}

function buildRadarLayout(
  options: RadarChartOptions,
  showLegend: boolean,
): { center: (string | number)[]; radius: string | number } {
  const reserves = getEdgeReserves(options, showLegend);

  // Center: shift toward the side with more remaining space.
  // shift_pct = (opposite_reserve - this_reserve) / (2 * REF) * 100
  //           = (top - bottom) / REF * 50
  const yShiftPct = ((reserves.top - reserves.bottom) / RADAR_REFERENCE_HEIGHT) * 50;
  const xShiftPct = ((reserves.left - reserves.right) / RADAR_REFERENCE_WIDTH) * 50;

  const centerX = Math.round(50 + xShiftPct);
  const centerY = Math.round(50 + yShiftPct);

  let radius: string | number;
  if (options.radius !== undefined) {
    radius = options.radius;
  } else {
    const verticalLoss = (reserves.top + reserves.bottom) / RADAR_REFERENCE_HEIGHT;
    const horizontalLoss = (reserves.left + reserves.right) / RADAR_REFERENCE_WIDTH;
    const loss = Math.max(verticalLoss, horizontalLoss);
    const radiusPct = Math.max(
      RADAR_MIN_RADIUS_PCT,
      Math.round(RADAR_BASE_RADIUS_PCT - loss * RADAR_RADIUS_SHRINK_FACTOR),
    );
    radius = `${radiusPct}%`;
  }

  return {
    center: [`${centerX}%`, `${centerY}%`],
    radius,
  };
}

function buildRadarComponent(
  data: RadarData,
  options: RadarChartOptions,
  variant: RadarVariant,
  showLegend: boolean,
): Record<string, unknown> {
  const { center, radius } = buildRadarLayout(options, showLegend);
  return {
    indicator: data.indicators.map((ind) => ({
      name: ind.name,
      ...(ind.max !== undefined ? { max: ind.max } : {}),
      ...(ind.min !== undefined ? { min: ind.min } : {}),
    })),
    shape: variant === 'circle' ? 'circle' : 'polygon',
    center,
    radius,
    splitNumber: 4,
  };
}

function buildRadarSeries(
  data: RadarData,
  options: RadarChartOptions,
): Record<string, unknown>[] {
  const filled = options.filled ?? true;
  return [
    {
      type: 'radar',
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2 },
      ...(filled ? { areaStyle: { opacity: 0.2 } } : {}),
      data: data.series.map((s) => ({ name: s.name, value: s.values })),
    },
  ];
}

function buildRadarTooltip(options: RadarChartOptions): Record<string, unknown> {
  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    padding: [6, 12],
    textStyle: { fontWeight: 'normal' },
  };

  if (options.tooltip?.enabled === false) {
    tooltip.show = false;
  }
  return tooltip;
}
