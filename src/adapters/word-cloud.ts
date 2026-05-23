import type { TooltipContextItem, WordCloudChartOptions, WordCloudData } from '../types.js';
import type { RenderContext } from './index.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  buildTitle,
  buildAsyncTooltipFormatter,
  getTitleReserve,
  resolveAppendToBody,
  resolveTooltipPosition,
} from './common/index.js';

interface ResolvedWordCloudDefaults {
  sizeRange: [number, number];
  shape:
    | 'circle'
    | 'cardioid'
    | 'diamond'
    | 'triangle-forward'
    | 'triangle'
    | 'pentagon'
    | 'star';
  rotationRange: [number, number];
  rotationStep: number;
  gridSize: number;
}

function resolveWordCloudDefaults(
  options: WordCloudChartOptions,
): ResolvedWordCloudDefaults {
  const variant = options.variant ?? 'default';
  if (variant === 'diamond' || variant === 'compact-diamond') {
    return {
      sizeRange: options.sizeRange ?? [14, 48],
      shape: options.shape ?? 'diamond',
      rotationRange: options.rotationRange ?? [0, 0],
      rotationStep: options.rotationStep ?? 45,
      gridSize: options.gridSize ?? 10,
    };
  }
  if (variant === 'poster') {
    return {
      sizeRange: options.sizeRange ?? [16, 72],
      shape: options.shape ?? 'star',
      rotationRange: options.rotationRange ?? [-45, 45],
      rotationStep: options.rotationStep ?? 15,
      gridSize: options.gridSize ?? 12,
    };
  }
  return {
    sizeRange: options.sizeRange ?? [12, 60],
    shape: options.shape ?? 'circle',
    rotationRange: options.rotationRange ?? [-90, 90],
    rotationStep: options.rotationStep ?? 45,
    gridSize: options.gridSize ?? 8,
  };
}

function wordCloudParamsToTooltipContext(params: unknown): TooltipContextItem {
  const pr = params as Record<string, unknown>;
  const raw = pr.value;
  let name = String(pr.name ?? '');
  let value: number | string = '';
  if (Array.isArray(raw)) {
    name = String(raw[0] ?? name);
    value = (raw[1] ?? '') as number | string;
  } else if (typeof raw === 'number' || typeof raw === 'string') {
    value = raw;
  }
  return {
    kind: 'item',
    dataIndex: typeof pr.dataIndex === 'number' ? pr.dataIndex : -1,
    name,
    value,
    marker: typeof pr.marker === 'string' ? pr.marker : undefined,
    color: typeof pr.color === 'string' ? pr.color : undefined,
  };
}

function wordCloudTooltipSyncHtml(
  params: unknown,
  options: WordCloudChartOptions,
): string {
  const ctx = wordCloudParamsToTooltipContext(params);
  const marker = ctx.marker ?? '';
  const fmt = options.tooltip?.formatValue;
  const display = fmt ? fmt(ctx.value, ctx.name) : ctx.value;
  return `${marker}${ctx.name}: ${display}`;
}

export function resolveWordCloudOptions(
  data: WordCloudData,
  options: WordCloudChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const defaults = resolveWordCloudDefaults(options);
  const sorted = options.autoSort !== false
    ? [...data].sort((a, b) => b.value - a.value)
    : data;
  const names = sorted.map((d) => d.name);
  const colors = resolveColors(names, options);
  const padding = options.padding ?? 12;
  const topReserve = getTitleReserve(options).top;
  const wordData = sorted.map((item, idx) => ({
    name: item.name,
    value: [item.name, item.value],
    itemStyle: { color: item.color ?? colors[idx] },
  }));

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  const wordCloudFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync: (params) => wordCloudTooltipSyncHtml(params, options),
    toContext: wordCloudParamsToTooltipContext,
  });
  tooltip.formatter =
    wordCloudFormatter ?? ((params: unknown) => wordCloudTooltipSyncHtml(params, options));

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    tooltip,
    series: [
      {
        type: 'custom',
        renderItem: 'wordCloud',
        // Wordcloud custom renderer draws in canvas space directly and does
        // not use cartesian/polar coordinates.
        coordinateSystem: 'none',
        data: wordData,
        itemPayload: {
          left: padding,
          right: padding,
          bottom: padding,
          top: padding + topReserve,
          sizeRange: defaults.sizeRange,
          shape: defaults.shape,
          rotationRange: defaults.rotationRange,
          rotationStep: defaults.rotationStep,
          gridSize: defaults.gridSize,
          keepAspect: options.keepAspect ?? false,
          drawOutOfBound: options.drawOutOfBound ?? false,
          shrinkToFit: options.shrinkToFit ?? false,
          layoutAnimation: options.layoutAnimation ?? true,
          maskImage: options.maskImage,
        },
      },
    ],
  };

  const merged = deepMerge(
    eOption,
    (options.echarts ?? {}) as Record<string, unknown>,
  );
  merged.color = colors;
  return merged;
}
