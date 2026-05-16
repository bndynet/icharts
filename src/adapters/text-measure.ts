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

/**
 * Default font size (px) for canvas-rendered data labels and edge labels
 * across every chart type. Defined here (and re-exported from
 * `common.ts`) because {@link DEFAULT_LABEL_FONT} below derives from it
 * at module init time — defining it in `common.ts` would force a
 * `text-measure` ⇄ `common` circular import that breaks the TDZ check
 * on this very `const`. See `common.ts` for the canonical adapter-facing
 * entry (`DEFAULT_LABEL_FONT_SIZE` re-export + `getLabelFontSize` helper).
 *
 * Single source of truth — touched by:
 *   - {@link DEFAULT_LABEL_FONT} (canvas measureText font string).
 *   - `common.getLabelFontSize(options)` (adapter-side override).
 *   - `src/themes/echarts-theme.ts` (theme-side fallback on each
 *     `<seriesType>.label.fontSize`).
 *
 * AGENTS.md "Layout rule #6" documents the two-sided contract.
 */
export const DEFAULT_LABEL_FONT_SIZE = 12;

/**
 * ECharts default for label-style text. Derived from
 * {@link DEFAULT_LABEL_FONT_SIZE} so a future tweak to the global label
 * size flows through the canvas measureText path automatically — keeps
 * the measure-vs-render contract (used by tree / network / race
 * headroom) accurate without two places to change.
 */
export const DEFAULT_LABEL_FONT = `${DEFAULT_LABEL_FONT_SIZE}px sans-serif`;

/**
 * Build a CSS shorthand font string at an arbitrary size, matching the
 * style {@link DEFAULT_LABEL_FONT} encodes. Used by adapters that allow
 * the user to override the label fontSize (`options.labelFontSize`) and
 * still need a matching font string for canvas `measureText` — e.g. the
 * tree adapter measures its longest leaf name before mounting so the
 * label can't overflow the body, and that measurement must use the same
 * size ECharts will actually render.
 *
 * The font family stays bare `sans-serif` because (1) ECharts'
 * built-in label style is the same, and (2) the underlying user-agent
 * font fallback chain is what canvas `measureText` evaluates against
 * the host browser anyway — adding the project's own font stack here
 * would diverge from what ECharts actually paints.
 */
export function buildLabelFont(fontSize: number): string {
  return `${fontSize}px sans-serif`;
}

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
