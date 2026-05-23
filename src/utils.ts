import type { ChartOptions } from './types.js';
import {
  resolveSeriesColors,
  resolveColorsByPosition,
  syncColorHubTheme,
  resolveThemeName,
} from './themes/index.js';
import { getConfig } from './config.js';

// ---------------------------------------------------------------------------
// Object helpers
// ---------------------------------------------------------------------------

/**
 * Type-aware deep merge. Later sources win. Arrays are replaced, not concatenated.
 * Handles plain objects recursively; non-objects overwrite.
 */
export function deepMerge<T extends Record<string, unknown>>(
  ...sources: (Partial<T> | undefined)[]
): T {
  const result: Record<string, unknown> = {};

  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const srcVal = (source as Record<string, unknown>)[key];
      const dstVal = result[key];

      if (isPlainObject(srcVal) && isPlainObject(dstVal)) {
        result[key] = deepMerge(
          dstVal as Record<string, unknown>,
          srcVal as Record<string, unknown>,
        );
      } else if (srcVal !== undefined) {
        result[key] = srcVal;
      }
    }
  }

  return result as T;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

// ---------------------------------------------------------------------------
// Number / string helpers
// ---------------------------------------------------------------------------

export function formatNumber(
  value?: number | string,
  options?: FormatNumberOptions,
): string {
  return formatNumberWithOptions(value, options);
}

export interface FormatNumberOptions extends Intl.NumberFormatOptions {
  compact?: boolean;
  locale?: string;
}

function formatNumberWithOptions(
  value?: number | string,
  options?: FormatNumberOptions,
): string {
  if (value === undefined || value === null) return '';
  if (!options) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const {
    compact = false,
    locale,
    ...numberFormatOptions
  } = options;

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return '';

  const formatter = new Intl.NumberFormat(locale, {
    ...(compact ? { notation: 'compact', compactDisplay: 'short' as const } : {}),
    useGrouping: true,
    ...numberFormatOptions,
  });
  return formatter.format(numericValue);
}

export function isTimestamp(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  const len = value.toString().length;
  return len === 10 || len === 13;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/**
 * Convert a CSS hex color (#rgb or #rrggbb) to an "r, g, b" string
 * suitable for use inside rgba(...).
 */
export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ].join(', ');
  }
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ].join(', ');
}

/**
 * Build a gradient offset array from a list of colors.
 * Returns `[{ offset: 0, color }, ..., { offset: 1, color }]`.
 */
export function buildGradientStops(
  colors: string[],
): { offset: number; color: string }[] {
  if (colors.length === 0) return [];
  if (colors.length === 1) return [{ offset: 0, color: colors[0] }];
  const step = 1 / (colors.length - 1);
  return colors.map((color, i) => ({
    offset: i === colors.length - 1 ? 1 : i * step,
    color,
  }));
}

/**
 * Build a vertical linear gradient for a spark area fill.
 * Top → series color at ~35% opacity; bottom → fully transparent.
 * Purely opacity-based, so it adapts automatically to any series color.
 */
export function buildSparkAreaGradient(hex: string): Record<string, unknown> {
  const rgb = hexToRgb(hex);
  return {
    type: 'linear',
    x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: `rgba(${rgb}, 0.35)` },
      { offset: 1, color: `rgba(${rgb}, 0)` },
    ],
  };
}

// ---------------------------------------------------------------------------
// Palette resolution
// ---------------------------------------------------------------------------
//
// Single, central entry point for "given a list of names + chart options,
// give me the colors to use".  Adapters call this to obtain colors; they
// are then free to attach the result to whichever ECharts option field
// makes sense for their chart type.
//
// Resolution priority (highest first):
//   1. options.colors[i]               -- positional override (must cover all names)
//   2. options.colorMap[name]          -- per-name override
//   3. configure({ consistentColors }) -- if true, ColorHub by name; else palette[i]
//   4. fallback '#888888'              -- only inside resolveColorsForNodes
//
// `resolveColorsForNodes` adds one extra rule above (1): a node-level
// `color` field always wins, so per-row data overrides can pin a single
// node without affecting the rest.
// ---------------------------------------------------------------------------

/**
 * Resolve a color for each name using the active theme, `options.colors`,
 * `options.colorMap`, and `configure({ consistentColors })`.
 *
 * Returns an array of the same length as `names`. Returns an empty array
 * when `names` is empty (used by chart types without named series, e.g. gauge).
 */
export function resolveColors(
  names: ReadonlyArray<string>,
  options: ChartOptions,
): string[] {
  if (names.length === 0) return [];
  syncColorHubTheme(resolveThemeName(options.theme));
  const resolve = getConfig().consistentColors
    ? resolveSeriesColors
    : resolveColorsByPosition;
  return resolve(names as string[], options.colors, options.colorMap);
}

/**
 * Resolve colors for graph nodes (sankey, chord, or any custom graph type).
 * Honors `node.color` first, then falls through to the same rules as
 * {@link resolveColors}. Always returns a non-empty hex string per node
 * (`'#888888'` as the final fallback when the palette is empty).
 */
export function resolveColorsForNodes(
  nodes: ReadonlyArray<{ name: string; color?: string }>,
  options: ChartOptions,
): string[] {
  const names = nodes.map((n) => n.name);
  const palette = resolveColors(names, options);
  return nodes.map(
    (node, i) => node.color ?? palette[i] ?? palette[0] ?? '#888888',
  );
}
