import type {
  LiquidProgressData,
  LiquidProgressChartOptions,
} from '../types.js';
import { getCurrentTheme } from '../themes/index.js';
import { deepMerge, hexToRgb, resolveColors } from '../utils.js';
import {
  buildTitle,
  getLabelFontSize,
  getTitleReserve,
} from './common/index.js';
import type { RenderContext } from './index.js';

/**
 * Reference chart height (px) used to convert the title area into a
 * percentage offset for `center`.
 */
const LIQUID_REFERENCE_HEIGHT = 320;
const LIQUID_LABEL_RATIO = 0.11;
const LIQUID_LABEL_MIN = 14;
const LIQUID_LABEL_MAX = 56;
const LIQUID_LABEL_FALLBACK = 24;
const LIQUID_BG_ALPHA_LIGHT = 0.14;
const LIQUID_BG_ALPHA_DARK = 0.24;
const MIN_SECONDARY_LABEL_CONTRAST = 2.6;

function buildLiquidCenter(
  options: LiquidProgressChartOptions,
): (string | number)[] {
  const p = options.padding ?? 12;
  const titleOffset = getTitleReserve(options).top;
  if (titleOffset === 0) return ['50%', '50%'];

  const titleTop = p + titleOffset;
  const centerY = Math.round(50 + (titleTop / LIQUID_REFERENCE_HEIGHT) * 50);
  return ['50%', `${centerY}%`];
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildWaveData(ratio: number, waveCount: number): number[][] {
  return Array.from({ length: waveCount }, (_unused, idx) =>
    [Math.round(clampRatio(ratio - idx * 0.03) * 10000) / 10000],
  );
}

function clampRound(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function resolveLiquidLabelFontSize(
  options: LiquidProgressChartOptions,
  ctx?: RenderContext,
): number {
  // Explicit `labelFontSize` always wins (shared cross-chart contract).
  if (options.labelFontSize !== undefined) {
    return getLabelFontSize(options);
  }
  const w = ctx?.containerWidth;
  const h = ctx?.containerHeight;
  if (!w || !h) return LIQUID_LABEL_FALLBACK;
  const ref = Math.min(w, h);
  return clampRound(ref * LIQUID_LABEL_RATIO, LIQUID_LABEL_MIN, LIQUID_LABEL_MAX);
}

function resolveLiquidBackgroundColor(seriesColor: string): string {
  if (!seriesColor.startsWith('#')) return seriesColor;
  const alpha =
    getCurrentTheme().colorMode === 'dark'
      ? LIQUID_BG_ALPHA_DARK
      : LIQUID_BG_ALPHA_LIGHT;
  return `rgba(${hexToRgb(seriesColor)}, ${alpha})`;
}

function hexToRgbTuple(hex: string): [number, number, number] | null {
  if (!hex.startsWith('#')) return null;
  const raw = hex.slice(1);
  if (raw.length === 3) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (raw.length === 6) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  return null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function resolveSecondaryLabelColor(
  textSecondary: string | undefined,
  textPrimary: string | undefined,
  seriesColor: string,
): string | undefined {
  if (!textSecondary) return textPrimary;
  if (!textPrimary) return textSecondary;

  const secondaryRgb = hexToRgbTuple(textSecondary);
  const primaryRgb = hexToRgbTuple(textPrimary);
  const seriesRgb = hexToRgbTuple(seriesColor);
  if (!secondaryRgb || !primaryRgb || !seriesRgb) return textSecondary;

  const secondaryContrast = contrastRatio(secondaryRgb, seriesRgb);
  if (secondaryContrast >= MIN_SECONDARY_LABEL_CONTRAST) return textSecondary;
  return textPrimary;
}

export function resolveLiquidProgressOptions(
  data: LiquidProgressData,
  options: LiquidProgressChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const max = data.max ?? 100;
  const ratio = max > 0 ? clampRatio(data.value / max) : 0;
  const percent = Math.round(ratio * 100);
  const waveCount = Math.max(1, options.waveCount ?? 3);
  const primaryLabelFontSize = resolveLiquidLabelFontSize(options, ctx);
  const secondaryLabelFontSize = getLabelFontSize(options);
  const names = [data.label ?? 'Progress'];
  const colors = resolveColors(names, options);
  const themeColors = getCurrentTheme().colors;
  const seriesColor = colors[0];
  const secondaryLabelColor = resolveSecondaryLabelColor(
    themeColors?.textSecondary,
    themeColors?.textPrimary,
    seriesColor,
  );
  const backgroundColor = resolveLiquidBackgroundColor(seriesColor);

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip: { show: false },
    series: [
      {
        type: 'custom',
        renderItem: 'liquidFill',
        coordinateSystem: 'none',
        data: buildWaveData(ratio, waveCount),
        itemStyle: {
          color: seriesColor,
          opacity: 0.95,
        },
        itemPayload: {
          center: buildLiquidCenter(options),
          radius: options.radius ?? '70%',
          waveAnimation: true,
          amplitude: 6,
          outline: {
            show: true,
            borderDistance: 3,
            itemStyle: {
              borderWidth: options.borderWidth ?? 2,
            },
          },
          backgroundStyle: { color: backgroundColor },
        },
        label: {
          show: true,
          formatter: data.label
            ? `{primary|${percent}%}\n{secondary|${data.label}}`
            : `{primary|${percent}%}`,
          fontSize: primaryLabelFontSize,
          rich: {
            primary: {
              fontSize: primaryLabelFontSize,
              fontWeight: 'bold',
            },
            secondary: {
              fontSize: secondaryLabelFontSize,
              fontWeight: 'normal',
              color: secondaryLabelColor,
            },
          },
        },
      },
    ],
  };

  const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
  merged.color = colors;
  return merged;
}
