import { hexToRgb } from '../../utils.js';

/**
 * Parse a CSS color string (`#rgb` / `#rrggbb` / `rgb(...)` / `rgba(...)`)
 * into an `[r, g, b]` tuple. Returns `undefined` for colors it cannot parse
 * (named colors, `hsl(...)`, gradients, …).
 *
 * Shared by the visualMap ramp builders (map + heatmap) so both derive
 * their low/high stops the same way.
 */
export function parseRgbTuple(color: string): [number, number, number] | undefined {
  if (color.startsWith('#')) {
    const rgb = hexToRgb(color).split(',').map((x) => Number(x.trim()));
    if (rgb.length === 3 && rgb.every((n) => Number.isFinite(n))) {
      return [rgb[0], rgb[1], rgb[2]];
    }
    return undefined;
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Blend `foreground` over `background` with the given foreground ratio
 * (1.0 → pure foreground, 0.0 → pure background). Returns rounded integers.
 */
export function blendRgb(
  foreground: [number, number, number],
  background: [number, number, number],
  foregroundRatio: number,
): [number, number, number] {
  const r = Math.round(foreground[0] * foregroundRatio + background[0] * (1 - foregroundRatio));
  const g = Math.round(foreground[1] * foregroundRatio + background[1] * (1 - foregroundRatio));
  const b = Math.round(foreground[2] * foregroundRatio + background[2] * (1 - foregroundRatio));
  return [r, g, b];
}
