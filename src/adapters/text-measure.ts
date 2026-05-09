/**
 * Shared canvas-based text measurement primitive.
 *
 * Several layout decisions need to know "how wide will this string be when
 * painted by ECharts" before the chart is mounted:
 *
 *   - {@link race-utils.resolveRaceLabelHeadroom} sizes `grid.right` so the
 *     bar/line race value labels never get clipped.
 *   - {@link common.getLegendReserve} sizes the left/right legend slot so
 *     a side legend never lands on top of the chart body.
 *
 * Both reach for the same browser primitive — a 2D canvas's `measureText`
 * — so we centralise the lazy context cache and the SSR fallback here.
 *
 * The canvas context is module-level and reused across calls; creating a
 * fresh element on every measurement showed up as visible jank in the
 * race-frame profile, and most consumers measure dozens of strings per
 * resolve(). Outside a browser (Node tests, SSR builds) `document` is
 * undefined, so we fall back to a char-count estimate; tests that exercise
 * these helpers assert magnitudes (`>`, `>=`) rather than exact pixel
 * values so the two paths stay interchangeable.
 */

/** ECharts default for label-style text — see notes on consumer constants. */
export const DEFAULT_LABEL_FONT = '12px sans-serif';

/** Rough px-per-char fallback at 12px sans-serif (no canvas available). */
const FALLBACK_CHAR_PX = 7;

let measureCtx: CanvasRenderingContext2D | null | undefined;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  if (typeof document === 'undefined') {
    measureCtx = null;
    return null;
  }
  try {
    measureCtx = document.createElement('canvas').getContext('2d');
  } catch {
    // Sandboxed environments (e.g. service workers) can throw on `createElement`.
    measureCtx = null;
  }
  return measureCtx ?? null;
}

/**
 * Measure the rendered pixel width of `text` at `font`. Returns 0 for
 * empty strings so callers can `max()` over a list without special-casing.
 *
 * @param text  The string to measure.
 * @param font  A CSS shorthand font string (e.g. `'12px sans-serif'`).
 *              Pass {@link DEFAULT_LABEL_FONT} when targeting ECharts'
 *              default `textStyle`.
 */
export function measureTextWidth(text: string, font: string = DEFAULT_LABEL_FONT): number {
  if (!text) return 0;
  const ctx = getMeasureCtx();
  if (ctx) {
    ctx.font = font;
    return Math.ceil(ctx.measureText(text).width);
  }
  return text.length * FALLBACK_CHAR_PX;
}

/**
 * Measure the widest string in `texts`. Convenience for layout helpers
 * (legend slot, race headroom) that only care about the longest label.
 */
export function measureMaxTextWidth(
  texts: ReadonlyArray<string>,
  font: string = DEFAULT_LABEL_FONT,
): number {
  let widest = 0;
  for (const text of texts) {
    const w = measureTextWidth(text, font);
    if (w > widest) widest = w;
  }
  return widest;
}
