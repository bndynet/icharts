import type { GaugeData, GaugeChartOptions, GaugeVariant } from '../types.js';
import { deepMerge } from '../utils.js';
import {
  buildTitle,
  computeStackedTextOffsets,
  getTitleReserve,
} from './common.js';
import type { RenderContext } from './index.js';

/**
 * Reference chart height (px) used to convert the title area into a
 * percentage offset for `center`.  Matches the `.chart-box` height used in
 * the demo and is a common real-world card height.
 */
const GAUGE_REFERENCE_HEIGHT = 320;

// ---------------------------------------------------------------------------
// Percentage variant auto-sizing
// ---------------------------------------------------------------------------
//
// ECharts gauge accepts pixel numbers — not percentages — for
// `axisLine.lineStyle.width`, `progress.width`, and `detail.fontSize`. To
// produce something that looks balanced across small KPI tiles and large
// hero cards without forcing the consumer to specify `gaugeWidth`, we
// derive the sizes from the rendered container.
//
// `ref = min(containerWidth, containerHeight)` is the right reference
// because ECharts' default `radius: '75%'` is computed against the shorter
// side, so the visible ring tracks `ref`. Ratios are picked to:
//
//   - put the ring at ~10% of the visible diameter (Apple-Activity /
//     Material circular-progress feel), i.e. ~7.5% of `ref` since
//     diameter ≈ 0.75·ref.
//   - put the big % number at ~18% of the visible diameter (≈ 50% of the
//     inner diameter), so it never collides with the ring.
//   - keep the label below the number at 40% of the number's height,
//     matching the previous hard-coded 36→14 ratio.
//
// Clamps protect tiny embedded charts (legibility floor) and oversized
// canvases (a ring thicker than 36 px starts to look cartoonish).
const PERCENTAGE_RING_RATIO = 0.075;
const PERCENTAGE_DETAIL_RATIO = 0.135;
const PERCENTAGE_TITLE_RATIO = 0.4;

const PERCENTAGE_RING_MIN = 8;
const PERCENTAGE_RING_MAX = 36;
const PERCENTAGE_DETAIL_MIN = 18;
const PERCENTAGE_DETAIL_MAX = 72;
const PERCENTAGE_TITLE_MIN = 10;
const PERCENTAGE_TITLE_MAX = 28;

// Centering math for the (big number + label) two-line block lives in
// the shared `computeStackedTextOffsets` helper in `common.ts` so the
// donut hole / pie center label / future KPI custom adapters can reuse
// the same typographic compensation. Defaults (visible gap 12 px,
// glyph padding 0.15 em) cover the gauge `percentage` aesthetic; pass
// overrides at the call site below if a variant ever needs to tune
// them.

// Static fallback used when container dims are unavailable (SSR, jsdom
// without layout, `display:none` ancestor). Matches the values shipped
// before auto-sizing existed so snapshots stay stable in those
// environments.
const PERCENTAGE_FALLBACK_RING = 20;
const PERCENTAGE_FALLBACK_DETAIL = 36;
const PERCENTAGE_FALLBACK_TITLE = 14;

interface PercentageSizing {
  width: number;
  detailFontSize: number;
  titleFontSize: number;
}

function clampRound(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Derive ring thickness + inner font sizes from the rendered container
 * dimensions. When the engine can't supply usable dims (SSR, hidden
 * card), return the legacy static defaults so resolved options remain
 * deterministic and existing snapshots don't drift.
 */
function autoSizePercentage(ctx?: RenderContext): PercentageSizing {
  const w = ctx?.containerWidth;
  const h = ctx?.containerHeight;
  if (!w || !h) {
    return {
      width: PERCENTAGE_FALLBACK_RING,
      detailFontSize: PERCENTAGE_FALLBACK_DETAIL,
      titleFontSize: PERCENTAGE_FALLBACK_TITLE,
    };
  }
  const ref = Math.min(w, h);
  const width = clampRound(
    ref * PERCENTAGE_RING_RATIO,
    PERCENTAGE_RING_MIN,
    PERCENTAGE_RING_MAX,
  );
  const detailFontSize = clampRound(
    ref * PERCENTAGE_DETAIL_RATIO,
    PERCENTAGE_DETAIL_MIN,
    PERCENTAGE_DETAIL_MAX,
  );
  const titleFontSize = clampRound(
    detailFontSize * PERCENTAGE_TITLE_RATIO,
    PERCENTAGE_TITLE_MIN,
    PERCENTAGE_TITLE_MAX,
  );
  return { width, detailFontSize, titleFontSize };
}

/**
 * Returns the gauge `center` array.  When a title is present the y position
 * is shifted downward so the arc is visually centred in the space below the
 * title rather than in the full canvas.
 */
function buildGaugeCenter(options: GaugeChartOptions): (string | number)[] {
  const p = options.padding ?? 12;
  const titleOffset = getTitleReserve(options).top;
  if (titleOffset === 0) return ['50%', '50%'];

  // Compute how much of the chart height the title area occupies and shift
  // the center y by half that amount so the gauge sits in the middle of the
  // remaining space.
  const titleTop = p + titleOffset;
  const centerY = Math.round(50 + (titleTop / GAUGE_REFERENCE_HEIGHT) * 50);
  return ['50%', `${centerY}%`];
}

export function resolveGaugeOptions(
  data: GaugeData,
  options: GaugeChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const variant = (options.variant ?? 'default') as GaugeVariant;

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip: { show: false },
    series: variant === 'percentage'
      ? buildPercentageSeries(data, options, ctx)
      : buildDefaultSeries(data, options),
  };

  return deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Default gauge
// ---------------------------------------------------------------------------

function buildDefaultSeries(
  data: GaugeData,
  options: GaugeChartOptions,
): Record<string, unknown>[] {
  const max = data.max ?? 100;
  const width = options.gaugeWidth ?? 18;

  return [
    {
      type: 'gauge',
      center: buildGaugeCenter(options),
      min: 0,
      max,
      progress: { show: true, width },
      axisLine: { lineStyle: { width } },
      axisTick: { show: false },
      splitLine: { length: 12, lineStyle: { width: 2 } },
      // Labels sit comfortably beyond the 12 px tick marks
      axisLabel: {
        distance: 22,
        fontSize: 11,
      },
      pointer: { show: true },
      anchor: { show: true, size: 20, itemStyle: { borderWidth: 2 } },
      title: {
        show: !!data.label,
        // Raised from 70% → 60% to avoid crowding the 0/100 endpoint labels
        offsetCenter: [0, '60%'],
        fontSize: 16,
      },
      detail: {
        valueAnimation: true,
        fontSize: 28,
        // Raised from 40% → 32% to match the tighter title position
        offsetCenter: [0, '32%'],
        formatter: '{value}',
      },
      data: [{ value: data.value, name: data.label ?? '' }],
    },
  ];
}

// ---------------------------------------------------------------------------
// Percentage variant (simpler ring)
// ---------------------------------------------------------------------------

function buildPercentageSeries(
  data: GaugeData,
  options: GaugeChartOptions,
  ctx?: RenderContext,
): Record<string, unknown>[] {
  const max = data.max ?? 100;
  const percent = Math.round((data.value / max) * 100);
  const sizing = autoSizePercentage(ctx);
  // Explicit `gaugeWidth` always wins; inner font sizes are sourced from
  // the auto-sizer and can still be overridden through
  // `options.echarts.series[0].detail.fontSize` etc. via the top-level
  // `deepMerge` in `resolveGaugeOptions`.
  const width = options.gaugeWidth ?? sizing.width;

  // Stack the (big number + label) as a single px-anchored block
  // around the ring center. Offsets are emitted as pixel numbers
  // (ECharts `offsetCenter` accepts both numbers and percent strings
  // — numbers = px, fixed regardless of radius). See
  // `computeStackedTextOffsets` for the centering + typographic-
  // padding math.
  const hasLabel = !!data.label;
  const { primaryOffsetY: detailOffsetY, secondaryOffsetY: titleOffsetY } =
    computeStackedTextOffsets({
      primaryFontSize: sizing.detailFontSize,
      secondaryFontSize: sizing.titleFontSize,
      showSecondary: hasLabel,
    });

  return [
    {
      type: 'gauge',
      center: buildGaugeCenter(options),
      startAngle: 90,
      endAngle: -270,
      min: 0,
      max,
      pointer: { show: false },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        width,
      },
      axisLine: {
        lineStyle: { width },
      },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      title: {
        show: hasLabel,
        offsetCenter: [0, titleOffsetY],
        fontSize: sizing.titleFontSize,
      },
      detail: {
        fontSize: sizing.detailFontSize,
        fontWeight: 'bold',
        offsetCenter: [0, detailOffsetY],
        valueAnimation: true,
        formatter: `${percent}%`,
      },
      data: [{ value: data.value, name: data.label ?? '' }],
    },
  ];
}
