import type { EmphasisOptions } from '../../types.js';

/** Opacity applied to blurred (non-highlighted) items when none is given. */
export const DEFAULT_BLUR_OPACITY = 0.12;

/** The per-series `emphasis` + `blur` blocks the helper emits. */
export interface EmphasisBlurBlocks {
  emphasis?: Record<string, unknown>;
  blur?: Record<string, unknown>;
}

/**
 * Translate the cross-cutting {@link EmphasisOptions} into the per-series
 * `emphasis` + `blur` blocks that make ECharts fade every non-highlighted
 * item when one is hovered or programmatically highlighted (via
 * `IChartInstance.highlight`). Returns an empty object when the feature is
 * off, so callers can spread / `Object.assign` the result unconditionally.
 *
 * ECharts only blurs siblings when the series declares `emphasis.focus`, and
 * the right focus mode depends on the chart's series shape:
 *   - `'series'` — each legend entry is its own series (line / area / bar).
 *   - `'self'`   — legend entries are data items in a single series
 *                  (pie / radar).
 *
 * The adapter passes the correct mode so users only flip `blurOthers` and
 * don't have to know ECharts' focus semantics.
 */
export function buildEmphasisBlur(
  emphasis: EmphasisOptions | undefined,
  focus: 'self' | 'series',
): EmphasisBlurBlocks {
  if (!emphasis?.blurOthers) return {};
  const opacity = clampOpacity(emphasis.blurOpacity);
  return {
    emphasis: { focus, blurScope: 'coordinateSystem' },
    blur: {
      itemStyle: { opacity },
      lineStyle: { opacity },
      areaStyle: { opacity },
      label: { opacity },
    },
  };
}

function clampOpacity(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_BLUR_OPACITY;
  return Math.min(1, Math.max(0, value));
}
