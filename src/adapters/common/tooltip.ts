import type {
  ChartOptions,
  TooltipContextAxis,
  TooltipOptions,
} from '../../types.js';
import { createAsyncTooltipFormatter } from '../../async-tooltip.js';
import type { RenderContext } from '../index.js';
import { formatDateByPattern } from './date-utils.js';

export function formatAxisTooltipSyncHtml(
  params: unknown,
  tooltip: TooltipOptions,
  isTimeAxis: boolean,
): string {
  const items = Array.isArray(params) ? params : [params];
  if (!items.length) return '';
  const firstItem = items[0] as {
    axisValue?: number | string;
    value?: unknown;
    seriesName?: string;
    marker?: string;
  };
  const rawTs =
    firstItem.axisValue ??
    (Array.isArray(firstItem.value) ? (firstItem.value as [unknown, unknown])[0] : undefined);

  let header: string;
  if (isTimeAxis && tooltip.dateFormat && rawTs !== undefined) {
    const ts = typeof rawTs === 'number' ? rawTs : Date.parse(String(rawTs));
    header = !isNaN(ts) ? formatDateByPattern(new Date(ts), tooltip.dateFormat) : String(rawTs ?? '');
  } else {
    header = String(firstItem.axisValue ?? '');
  }

  const rows = items
    .map((p: unknown) => {
      const item = p as { marker?: string; seriesName?: string; value?: unknown };
      const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
      const displayVal = tooltip.formatValue
        ? tooltip.formatValue(val as number, item.seriesName ?? '')
        : val;
      return `${item.marker ?? ''}${item.seriesName ?? ''}: ${displayVal}`;
    })
    .join('<br/>');
  return `${header}<br/>${rows}`;
}

export function buildAxisTooltipContext(
  params: unknown,
  tooltip: TooltipOptions,
  isTimeAxis: boolean,
): TooltipContextAxis {
  const items = Array.isArray(params) ? params : [params];
  const first = items[0] as {
    axisValue?: number | string;
    value?: unknown;
    dataIndex?: number;
  };
  const rawTs =
    first.axisValue ??
    (Array.isArray(first.value) ? (first.value as [unknown, unknown])[0] : undefined);

  let axisValueLabel: string;
  if (isTimeAxis && tooltip.dateFormat && rawTs !== undefined) {
    const ts = typeof rawTs === 'number' ? rawTs : Date.parse(String(rawTs));
    axisValueLabel = !isNaN(ts)
      ? formatDateByPattern(new Date(ts), tooltip.dateFormat)
      : String(rawTs ?? '');
  } else {
    axisValueLabel = String(first.axisValue ?? '');
  }

  const series = items.map((p: unknown) => {
    const item = p as { marker?: string; seriesName?: string; value?: unknown };
    const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
    return {
      name: item.seriesName ?? '',
      value: val as number | string,
      marker: item.marker,
    };
  });

  return {
    kind: 'axis',
    axisValueLabel,
    dataIndex: first.dataIndex ?? 0,
    rawAxisValue: first.axisValue,
    series,
  };
}

interface TooltipPositionSize {
  contentSize: [number, number];
  viewSize: [number, number];
}

type TooltipPositionFn = (
  point: [number, number],
  params: unknown,
  dom: unknown,
  rect: unknown,
  size: TooltipPositionSize,
) => [number, number];

export function resolveTooltipPosition(
  options: ChartOptions,
): TooltipPositionFn | undefined {
  const gap = options.tooltip?.cursorGap;
  if (gap === undefined) return undefined;
  return (point, _params, _dom, _rect, size) => {
    const [px, py] = point;
    const [w, h] = size.contentSize;
    const [vw, vh] = size.viewSize;
    let x = px + gap;
    let y = py + gap;
    if (x + w + 2 > vw) x = px - w - gap;
    if (y + h > vh) y = py - h - gap;
    return [x, y];
  };
}

export function resolveAppendToBody(
  options: ChartOptions,
  ctx?: RenderContext,
): boolean {
  const explicit = options.tooltip?.appendToBody;
  if (explicit !== undefined) return explicit;
  return !ctx?.inShadowDom;
}

const SPARK_DEFAULT_CURSOR_GAP_PX = 6;

export function buildSparkTooltip(
  options: ChartOptions = {},
  ctx?: RenderContext,
): Record<string, unknown> {
  const sparkOptions: ChartOptions = {
    ...options,
    tooltip: {
      cursorGap: SPARK_DEFAULT_CURSOR_GAP_PX,
      ...options.tooltip,
    },
  };
  return {
    show: true,
    trigger: 'axis',
    axisPointer: { type: 'none' },
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(sparkOptions),
  };
}

export function buildTooltip(
  options: ChartOptions,
  trigger: 'axis' | 'item' = 'axis',
  pointerType?: 'cross' | 'shadow' | 'line' | 'none',
  isTimeAxis = false,
  ctx?: RenderContext,
): Record<string, unknown> {
  const tooltip = options.tooltip ?? {};
  const result: Record<string, unknown> = {
    trigger,
    padding: [6, 12],
    textStyle: { fontWeight: 'normal' },
    confine: true,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };

  if (pointerType) {
    result.axisPointer = { type: pointerType };
  }

  if (tooltip.enabled === false) {
    result.show = false;
  }

  if (tooltip.customHtml && trigger === 'axis') {
    const customHtml = tooltip.customHtml;
    result.formatter = createAsyncTooltipFormatter({
      formatSync: (params) => formatAxisTooltipSyncHtml(params, tooltip, isTimeAxis),
      customHtml: (params) =>
        Promise.resolve(customHtml(buildAxisTooltipContext(params, tooltip, isTimeAxis))),
      placeholder: tooltip.placeholder,
    });
    return result;
  }

  if (tooltip.formatValue) {
    const fn = tooltip.formatValue;
    result.valueFormatter = (value: number | string) =>
      fn(value as number, '');
  }

  if (isTimeAxis && tooltip.dateFormat) {
    result.formatter = (params: unknown) => formatAxisTooltipSyncHtml(params, tooltip, true);
  }

  return result;
}
