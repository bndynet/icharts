import type { RenderContext } from './index.js';

// ---------------------------------------------------------------------------
// Frame duration
// ---------------------------------------------------------------------------

/**
 * Fallback when neither the consumer nor the engine has anything better:
 * a single frame's worth of animation for race-style charts. 500ms is the
 * sweet spot — fast enough that updates feel responsive, slow enough that
 * the morph between values is readable.
 */
const RACE_FRAME_FALLBACK_MS = 500;

/**
 * Reasonable bounds for the auto-measured tick interval. Without these:
 *
 *   - A burst of rapid `chart.update()` calls (e.g. user replaying frames
 *     synchronously in a tight loop) would shrink the animation duration
 *     toward 0 and freeze the chart on the latest value.
 *   - A long idle period followed by a single update would inflate it to
 *     several seconds and lock subsequent ticks behind a slow animation
 *     they can never catch up with.
 *
 * The clamp keeps "auto" within the range that looks like a real race.
 */
const RACE_FRAME_MIN_MS = 80;
const RACE_FRAME_MAX_MS = 3000;

/**
 * Resolve the per-frame animation duration for a race-style chart in this
 * priority order:
 *
 *   1. Explicit `race.frameDuration` set by the caller — always wins.
 *   2. The observed interval between the last two `chart.update()` calls,
 *      threaded through {@link RenderContext}. Clamped to a sane range so
 *      pathological cadences don't produce unwatchable animations.
 *   3. {@link RACE_FRAME_FALLBACK_MS} for the very first update (no prior
 *      tick to measure against) and for callers who never tick.
 *
 * This is the small bit of magic that lets consumers omit `frameDuration`
 * entirely — drop in a `setInterval(..., 200)` and the chart animation
 * silently rates itself to 200ms after the first transition.
 */
export function resolveRaceFrameDuration(
  explicit: number | undefined,
  ctx: RenderContext | undefined,
): number {
  if (explicit !== undefined) return explicit;
  const observed = ctx?.observedFrameMs;
  if (observed !== undefined && Number.isFinite(observed)) {
    return Math.max(RACE_FRAME_MIN_MS, Math.min(RACE_FRAME_MAX_MS, observed));
  }
  return RACE_FRAME_FALLBACK_MS;
}

// ---------------------------------------------------------------------------
// Label headroom (grid.right for race value/end labels)
// ---------------------------------------------------------------------------

/**
 * ECharts' default label font. Series `label` / `endLabel` inherit from
 * `textStyle` which defaults to 12px `sans-serif` unless a theme overrides
 * it. We match that so canvas measurement lines up with what gets painted.
 */
const RACE_LABEL_FONT = '12px sans-serif';
/** Distance between the bar/line right edge and the label's left edge. */
const RACE_LABEL_GAP_PX = 8;
/** Distance between the label's right edge and the chart's right edge. */
const RACE_LABEL_PAD_PX = 8;
/** Floor: don't shrink below the old fixed reserve for very short labels. */
const RACE_LABEL_MIN_PX = 32;
/** SSR / no-DOM rough estimate (px per char at 12px sans-serif). */
const RACE_LABEL_FALLBACK_CHAR_PX = 7;

let measureCtx: CanvasRenderingContext2D | null | undefined;

/**
 * Lazy module-level canvas context for `measureText`. Cached so we don't
 * attach a fresh DOM element on every frame. Returns `null` outside a
 * browser (SSR, Node tests) so callers can fall back to a char-count
 * estimate.
 */
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  if (typeof document === 'undefined') {
    measureCtx = null;
    return null;
  }
  try {
    measureCtx = document.createElement('canvas').getContext('2d');
  } catch {
    measureCtx = null;
  }
  return measureCtx ?? null;
}

function measureLabelWidth(text: string): number {
  if (!text) return 0;
  const ctx = getMeasureCtx();
  if (ctx) {
    ctx.font = RACE_LABEL_FONT;
    return Math.ceil(ctx.measureText(text).width);
  }
  return text.length * RACE_LABEL_FALLBACK_CHAR_PX;
}

/**
 * Compute the pixel headroom needed on the right side of a race chart's
 * plot area so that value / end labels don't get clipped, replacing the
 * old fixed `80` reserve.
 *
 * The returned value is:
 *
 *   max( widestLabel(px) + gap + padding ,
 *        RACE_LABEL_MIN_PX ,
 *        ctx.maxRaceGridRight )
 *
 * The `ctx.maxRaceGridRight` term is the high-water mark the engine has
 * seen across previous frames (see {@link RenderContext.maxRaceGridRight}
 * and `core.ts`). Mixing it in here makes the reserved space **monotonic
 * across frames** — once the chart has had to make room for a wide label,
 * it never gives that room back, even if subsequent frames carry narrower
 * labels. Without this, every tick that grew or shrank a digit would
 * re-lay out the plot area and pump visible jitter.
 *
 * Pass an empty `labels` array (or set the relevant series label flag to
 * `false` in the adapter) to skip headroom entirely.
 */
export function resolveRaceLabelHeadroom(
  labels: ReadonlyArray<string>,
  ctx: RenderContext | undefined,
): number {
  let widest = 0;
  for (const label of labels) {
    const w = measureLabelWidth(label);
    if (w > widest) widest = w;
  }
  const suggested = Math.max(
    RACE_LABEL_MIN_PX,
    widest + RACE_LABEL_GAP_PX + RACE_LABEL_PAD_PX,
  );
  return Math.max(suggested, ctx?.maxRaceGridRight ?? 0);
}
