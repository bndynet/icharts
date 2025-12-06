import type { ColorMode, ColorTheme } from '@bndynet/color-hub';

/**
 * Semantic UI color tokens for chart rendering.
 *
 * These tokens cover every non-series visual element in a chart.
 * Series / palette colors are intentionally excluded — those are managed
 * exclusively by ColorHub's `palette` field.
 *
 * Design rules:
 *  - Each token has one clear responsibility; no two tokens describe the same thing.
 *  - Tokens that share a visual role share the same value in presets (DRY).
 *  - Names are semantic ("what it is used for"), not literal ("what color it is").
 */
export interface ChartThemeColors {
  // ── Surfaces ──────────────────────────────────────────────────────────────

  /** Chart canvas / container background. */
  background: string;

  /**
   * Floating surface background — tooltip, popover, and axis-pointer
   * callout label.  Typically contrasts with `background` for legibility.
   */
  surface: string;

  /** Foreground text rendered on `surface` (tooltip text, callout text). */
  surfaceText: string;

  // ── Text hierarchy ─────────────────────────────────────────────────────────

  /**
   * Primary label color.
   * Used for: chart title, legend text, pie/gauge/data labels, markPoint labels.
   */
  textPrimary: string;

  /**
   * Secondary label color — visually quieter than `textPrimary`.
   * Used for: axis tick labels.
   */
  textSecondary: string;

  // ── Structural lines ───────────────────────────────────────────────────────

  /**
   * Grid lines (splitLine).
   * Should be subtle — barely visible rules that aid reading without
   * competing with the data.
   */
  gridLine: string;

  /**
   * Axis spine, tick marks, and cursor crosshair / axis-pointer line.
   * Slightly more prominent than `gridLine` to frame the plot area.
   */
  axisLine: string;

  // ── Semantic / status ─────────────────────────────────────────────────────

  /** Positive / healthy state indicator. */
  success: string;
  /** Cautionary / threshold-approaching state indicator. */
  warning: string;
  /** Critical / error state indicator. */
  danger: string;
  /** Informational / neutral highlight. */
  info: string;
}

/**
 * A complete chart theme: semantic UI tokens (`colors`) + series palette,
 * stored as a `ColorTheme<ChartThemeColors>` so ColorHub can manage
 * palette assignment for series colors.
 */
export type ChartTheme = ColorTheme<ChartThemeColors>;

/**
 * User-facing config for registering a custom chart theme.
 *
 * Only specify the color tokens you want to override — the rest are
 * automatically inherited from the built-in `light` or `dark` base theme
 * based on `colorMode` (defaults to `'light'` when omitted).
 *
 * @example
 * ```ts
 * registerTheme({
 *   name: 'ocean',
 *   colorMode: 'dark',
 *   colors: { background: '#001f3f', textPrimary: '#e0f2fe' },
 *   palette: ['#0ea5e9', '#06b6d4', '#14b8a6'],
 * });
 * ```
 */
export type ChartThemeConfig = {
  name: string;
  colorMode?: ColorMode;
  colors?: Partial<ChartThemeColors>;
  palette?: string[];
};
