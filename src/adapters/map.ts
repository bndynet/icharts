import type {
  MapChartOptions,
  MapData,
  TooltipContextItem,
} from '../types.js';
import type { RenderContext } from './index.js';
import { deepMerge, resolveColors, hexToRgb } from '../utils.js';
import { getThemeColors } from '../themes/index.js';
import {
  buildTitle,
  buildAsyncTooltipFormatter,
  getLabelFontSize,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common/index.js';

function normalizeMapValue(
  value: unknown,
): number | string | '' {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

function parseRgbTuple(color: string): [number, number, number] | undefined {
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

function blendRgb(
  foreground: [number, number, number],
  background: [number, number, number],
  foregroundRatio: number,
): [number, number, number] {
  const r = Math.round(foreground[0] * foregroundRatio + background[0] * (1 - foregroundRatio));
  const g = Math.round(foreground[1] * foregroundRatio + background[1] * (1 - foregroundRatio));
  const b = Math.round(foreground[2] * foregroundRatio + background[2] * (1 - foregroundRatio));
  return [r, g, b];
}

function mapParamsToTooltipContext(params: unknown): TooltipContextItem {
  const pr = params as Record<string, unknown>;
  const value = normalizeMapValue(pr.value);
  return {
    kind: 'item',
    dataIndex: typeof pr.dataIndex === 'number' ? pr.dataIndex : 0,
    name: String(pr.name ?? ''),
    value,
    marker: typeof pr.marker === 'string' ? pr.marker : undefined,
    color: typeof pr.color === 'string' ? pr.color : undefined,
  };
}

function mapTooltipSyncHtml(
  params: unknown,
  options: MapChartOptions,
): string {
  const pr = params as Record<string, unknown>;
  const marker = (pr.marker as string) ?? '';
  const name = String(pr.name ?? '');
  const value = normalizeMapValue(pr.value);
  if (value === '') {
    return `${marker}${name}`;
  }
  const fmt = options.tooltip?.formatValue;
  const display = fmt ? fmt(value, name) : String(value);
  return `${marker}${name}: ${display}`;
}

function resolveVisualMap(
  data: MapData,
  options: MapChartOptions,
): Record<string, unknown> | undefined {
  const cfg = options.visualMap;
  if (cfg?.show === false) return undefined;

  const numericValues = data
    .map((d) => d.value)
    .filter((v): v is number => Number.isFinite(v));
  // Auto-enable visualMap when the dataset has numeric values, even if the
  // caller only provides required map options (`mapName`).
  if (!cfg && numericValues.length === 0) return undefined;

  const minValue = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  const defaultBaseColor = resolveColors(['__map_visual__'], options)[0];
  const surface = getThemeColors()?.surface ?? '#ffffff';
  const baseRgb = parseRgbTuple(defaultBaseColor);
  const surfaceRgb = parseRgbTuple(surface);
  const lowColor = baseRgb && surfaceRgb
    ? (() => {
        const [r, g, b] = blendRgb(baseRgb, surfaceRgb, 0.2);
        return `rgb(${r}, ${g}, ${b})`;
      })()
    : `rgba(${hexToRgb(defaultBaseColor)}, 0.2)`;
  const highColor = baseRgb
    ? `rgb(${baseRgb[0]}, ${baseRgb[1]}, ${baseRgb[2]})`
    : defaultBaseColor;
  const inRangeColors = options.visualMap?.inRangeColors ?? [
    lowColor,
    highColor,
  ];

  const resolvedMin = cfg?.min ?? minValue;
  const resolvedMax = cfg?.max ?? maxValue;
  const out: Record<string, unknown> = {
    show: cfg?.show ?? true,
    min: resolvedMin,
    max: resolvedMax,
    orient: cfg?.orient ?? 'vertical',
    left: cfg?.left ?? 'right',
    bottom: cfg?.bottom ?? 12,
    // Keep the value legend compact so the map body gets more visual space.
    itemWidth: 10,
    itemHeight: 90,
    textStyle: { fontSize: 10 },
  };
  if (!cfg?.pieces) {
    out.inRange = { color: inRangeColors };
  }

  if (cfg?.top !== undefined) {
    out.top = cfg.top;
    delete out.bottom;
  }
  if (cfg?.formatter !== undefined) out.formatter = cfg.formatter;
  if (cfg?.precision !== undefined) out.precision = cfg.precision;
  if (cfg?.pieces !== undefined) out.pieces = cfg.pieces;

  // Explicitly show scale labels at both ends of the gradient bar (max at top,
  // min at bottom for vertical orientation). ECharts does not always surface
  // these reliably without an explicit `text` value, so we set them here as the
  // default. User-supplied `cfg.text` wins; `pieces` mode uses its own labels.
  if (!cfg?.pieces) {
    if (cfg?.text !== undefined) {
      out.text = cfg.text;
    } else {
      const precision = cfg?.precision;
      const formatEnd = (n: number): string => {
        if (precision !== undefined) return n.toFixed(precision);
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
      };
      out.text = [formatEnd(resolvedMax), formatEnd(resolvedMin)];
    }
  }

  return out;
}

function buildAutoHideOverflowLabelLayout(
  options: MapChartOptions,
): ((params: unknown) => Record<string, unknown>) | undefined {
  if (!options.autoHideOverflowLabel) return undefined;
  return (params: unknown): Record<string, unknown> => {
    const pr = params as {
      rect?: { width: number; height: number };
      labelRect?: { width: number; height: number };
    };
    const regionRect = pr.rect;
    const labelRect = pr.labelRect;
    if (!regionRect || !labelRect) return {};
    return {
      hide:
        labelRect.width > regionRect.width ||
        labelRect.height > regionRect.height,
    };
  };
}

function buildAutoHideOverflowLabelFormatter(
  options: MapChartOptions,
): ((params: unknown) => string) | undefined {
  if (!options.autoHideOverflowLabel) return undefined;
  return (params: unknown): string => {
    const pr = params as Record<string, unknown>;
    const value = normalizeMapValue(pr.value);
    // Hide labels for regions without usable values when auto-hide is enabled.
    if (value === '') return '';
    return String(pr.name ?? '');
  };
}

export function resolveMapOptions(
  data: MapData,
  options: MapChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const defaultAreaColor = resolveColors(['__map_default__'], options)[0];
  const seriesData = data.map((item) => ({
    name: item.name,
    value: item.value,
    itemStyle: (item.color ?? options.colorMap?.[item.name])
      ? {
          areaColor: item.color ?? options.colorMap?.[item.name],
          color: item.color ?? options.colorMap?.[item.name],
        }
      : undefined,
  }));

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  const mapFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync: (params) => mapTooltipSyncHtml(params, options),
    toContext: mapParamsToTooltipContext,
  });
  tooltip.formatter =
    mapFormatter ?? ((params: unknown) => mapTooltipSyncHtml(params, options));

  const visualMap = resolveVisualMap(data, options);
  const autoHideLabelLayout = buildAutoHideOverflowLabelLayout(options);
  const autoHideLabelFormatter = buildAutoHideOverflowLabelFormatter(options);
  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip,
    visualMap,
    series: [
      {
        type: 'map',
        map: options.mapName,
        nameProperty: options.nameProperty ?? 'name',
        roam: options.roam ?? false,
        center: options.center,
        // Slightly larger default viewport so regional shapes are easier to read.
        zoom: options.zoom ?? 1.08,
        data: seriesData,
        ...(visualMap === undefined
          ? { itemStyle: { areaColor: defaultAreaColor } }
          : {}),
        label: {
          show: options.showLabel ?? false,
          fontSize: getLabelFontSize(options),
          ...(autoHideLabelFormatter
            ? { formatter: autoHideLabelFormatter }
            : {}),
        },
        ...(autoHideLabelLayout
          ? { labelLayout: autoHideLabelLayout }
          : {}),
      },
    ],
  };

  const merged = deepMerge(
    eOption,
    (options.echarts ?? {}) as Record<string, unknown>,
  );
  merged.color = [defaultAreaColor];
  return merged;
}
