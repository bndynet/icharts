import type { ChartData, ChartOptions, XYData, PieData } from './types.js';
import { ChartType, isXYData, isPieData } from './types.js';
import { resolveSeriesColors, colorHub, resolveThemeName } from './themes/index.js';

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

export function formatNumber(value?: number | string): string {
  if (value === undefined || value === null) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
// Chart data helpers
// ---------------------------------------------------------------------------

/**
 * Extract the ordered list of series names from any ChartData shape.
 * Returns an empty array for data types that have no named series (e.g. GaugeData).
 */
export function getSeriesNames(data: ChartData): string[] {
  if (isXYData(data)) return (data as XYData).series.map((s) => s.name);
  if (isPieData(data)) return (data as PieData).map((d) => d.name);
  return [];
}

// ---------------------------------------------------------------------------
// ECharts option post-processing
// ---------------------------------------------------------------------------

/**
 * Resolve and apply series colors to a built ECharts option object.
 * Automatically syncs ColorHub to the active theme so callers never need
 * to call switchTheme() manually.
 * For spark area charts, also injects a vertical opacity gradient into each
 * series' areaStyle so the fill adapts to the assigned series color automatically.
 */
export function applyChartColors(
  type: string,
  eOption: Record<string, unknown>,
  data: ChartData,
  options: ChartOptions,
): void {
  colorHub.switchTheme(resolveThemeName(options.theme));

  const names = getSeriesNames(data);
  if (names.length === 0) return;

  const colors = resolveSeriesColors(names, options.colors, options.colorMap);
  eOption.color = colors;

  if (type === ChartType.Area && options.variant === 'spark') {
    const series = eOption.series as Record<string, unknown>[] | undefined;
    if (Array.isArray(series)) {
      series.forEach((s, i) => {
        const hex = colors[i] ?? colors[0];
        if (hex) s.areaStyle = { color: buildSparkAreaGradient(hex) };
      });
    }
  }
}
