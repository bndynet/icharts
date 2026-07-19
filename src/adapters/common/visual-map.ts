import { hexToRgb } from '../../utils.js';
import { getThemeColors } from '../../themes/index.js';
import { parseRgbTuple, blendRgb } from './color-ramp.js';

/**
 * Generic visualMap option shape shared by the chart families that color
 * cells with a continuous visualMap (cartesian heatmap + calendar heatmap).
 * Kept structurally minimal so each chart's own `*VisualMapOptions` type
 * (or a re-use of `HeatmapVisualMapOptions`) satisfies it.
 */
export interface VisualMapOptions {
  /** Show the visualMap component. Default: auto (true when values exist). */
  show?: boolean;
  /** Explicit minimum for the visual domain. Default: data minimum. */
  min?: number;
  /** Explicit maximum for the visual domain. Default: data maximum. */
  max?: number;
  /** visualMap orientation. Default comes from the caller. */
  orient?: 'horizontal' | 'vertical';
  /**
   * The color bar's width in px.
   * - horizontal: the bar's length (screen width). Default: `120`.
   * - vertical: the bar's thickness. Default: `10`.
   */
  width?: number;
  /** visualMap x-position. Default: `'center'` (horizontal) / `'right'` (vertical). */
  left?: string | number;
  /** visualMap x-position (alternative to `left`). */
  right?: string | number;
  /** visualMap y-position (alternative to `bottom`). */
  top?: string | number;
  /** visualMap y-position. Default: `8` (horizontal) / `12` (vertical). */
  bottom?: string | number;
  /** Number formatter for visualMap labels. */
  formatter?: string | ((value: number) => string);
  /** Piecewise visualMap bins. Default is continuous mode. */
  pieces?: Array<{
    min?: number;
    max?: number;
    label?: string;
    color?: string;
  }>;
  /** Precision used by continuous visualMap labels. */
  precision?: number;
  /** Text labels shown at the two ends of the color bar (see ECharts `text`). */
  text?: [string | null, string | null];
  /** Explicit color ramp for continuous visualMap. */
  inRangeColors?: string[];
}

/**
 * Build a continuous visualMap option from a list of numeric values.
 *
 * Mirrors the map adapter's ramp: the base color (`baseColor`, already
 * resolved via {@link resolveColors}) is blended over the theme `surface`
 * at 20% for the low stop and used at full strength for the high stop.
 *
 * Returns `undefined` when the consumer disabled it (`show: false`) or when
 * there are no numeric values AND no explicit config — in which case the
 * caller should fall back to a single palette color.
 *
 * `defaultOrient` supplies the chart-appropriate default orientation
 * (cartesian heatmap → `'vertical'`, calendar heatmap → `'horizontal'`).
 * `defaultShow` supplies the default `show` value; the calendar heatmap
 * passes `false` so the color bar is hidden by default while the
 * value→color encoding still applies to the cells.
 */
export function buildVisualMap(
  values: ReadonlyArray<number>,
  cfg: VisualMapOptions | undefined,
  baseColor: string,
  defaultOrient: 'horizontal' | 'vertical',
  defaultShow = true,
): Record<string, unknown> | undefined {
  if (cfg?.show === false) return undefined;

  const numericValues = values.filter((v): v is number => Number.isFinite(v));
  if (!cfg && numericValues.length === 0) return undefined;

  const minValue = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 0;

  const surface = getThemeColors()?.surface ?? '#ffffff';
  const baseRgb = parseRgbTuple(baseColor);
  const surfaceRgb = parseRgbTuple(surface);
  const lowColor =
    baseRgb && surfaceRgb
      ? (() => {
          const [r, g, b] = blendRgb(baseRgb, surfaceRgb, 0.2);
          return `rgb(${r}, ${g}, ${b})`;
        })()
      : `rgba(${hexToRgb(baseColor)}, 0.2)`;
  const highColor = baseRgb
    ? `rgb(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]})`
    : baseColor;
  const inRangeColors = cfg?.inRangeColors ?? [lowColor, highColor];

  const resolvedMin = cfg?.min ?? minValue;
  const resolvedMax = cfg?.max ?? maxValue;
  const orient = cfg?.orient ?? defaultOrient;

  const out: Record<string, unknown> = {
    show: cfg?.show ?? defaultShow,
    min: resolvedMin,
    max: resolvedMax,
    orient,
    textStyle: { fontSize: 10 },
  };

  if (orient === 'horizontal') {
    out.left = cfg?.left ?? 'center';
    out.bottom = cfg?.bottom ?? 8;
    // ECharts renders a horizontal visualMap by rotating the bar group 90°,
    // so `itemWidth` is the bar THICKNESS (screen height) and `itemHeight`
    // is the bar LENGTH (screen width) — the opposite of the vertical case.
    out.itemWidth = 12;
    out.itemHeight = cfg?.width ?? 120;
  } else {
    out.left = cfg?.left ?? 'right';
    out.bottom = cfg?.bottom ?? 12;
    out.itemWidth = cfg?.width ?? 10;
    out.itemHeight = 90;
  }
  if (cfg?.right !== undefined) {
    delete out.left;
    out.right = cfg.right;
  }
  if (cfg?.top !== undefined) {
    delete out.bottom;
    out.top = cfg.top;
  }

  if (!cfg?.pieces) {
    out.inRange = { color: inRangeColors };
  }
  if (cfg?.formatter !== undefined) out.formatter = cfg.formatter;
  if (cfg?.precision !== undefined) out.precision = cfg.precision;
  if (cfg?.pieces !== undefined) out.pieces = cfg.pieces;

  // Surface scale labels at both ends of the gradient bar (ECharts does not
  // always show them reliably without an explicit `text`). User-supplied
  // `cfg.text` wins; `pieces` mode uses its own labels.
  if (!cfg?.pieces) {
    if (cfg?.text !== undefined) {
      out.text = cfg.text;
    } else if (orient === 'vertical') {
      // End labels render cleanly on the vertical bar (max at top, min at
      // bottom). On the horizontal bar ECharts' 90°-rotated label layout
      // pushes one label far past the bar end, so we omit them there — the
      // gradient bar reads clearly on its own and the tooltip shows values.
      const precision = cfg?.precision;
      const formatEnd = (n: number): string => {
        if (precision !== undefined) return n.toFixed(precision);
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
      };
      // ECharts convention: `text[0]` is the HIGH value and `text[1]` the
      // LOW value — for vertical that renders max at the top / min at the
      // bottom (matching the map adapter).
      out.text = [formatEnd(resolvedMax), formatEnd(resolvedMin)];
    }
  }

  return out;
}
