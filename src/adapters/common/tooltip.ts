import type {
  ChartOptions,
  TooltipContext,
  TooltipContextAxis,
  TooltipOptions,
} from '../../types.js';
import { createAsyncTooltipFormatter } from '../../async-tooltip.js';
import type { AsyncTooltipFormatter } from '../../async-tooltip.js';
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
    const item = p as {
      marker?: string;
      seriesName?: string;
      value?: unknown;
      color?: string;
    };
    const val = Array.isArray(item.value) ? (item.value as [unknown, unknown])[1] : item.value;
    return {
      name: item.seriesName ?? '',
      value: val as number | string,
      marker: item.marker,
      color: typeof item.color === 'string' ? item.color : undefined,
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

  if ((tooltip.customHtml || tooltip.appendHtml) && trigger === 'axis') {
    const formatter = buildAsyncTooltipFormatter({
      options,
      defaultSync: (params) => formatAxisTooltipSyncHtml(params, tooltip, isTimeAxis),
      toContext: (params) => buildAxisTooltipContext(params, tooltip, isTimeAxis),
    });
    if (formatter) {
      result.formatter = formatter;
      return result;
    }
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

/**
 * Compose `tooltip.customHtml` + `tooltip.appendHtml` into a single ECharts
 * tooltip formatter. Returns `undefined` when neither hook is set, so the
 * caller can fall back to its existing default-sync path (or let ECharts'
 * built-in tooltip render).
 *
 * Semantics (matches the doc on {@link TooltipOptions.customHtml} /
 * {@link TooltipOptions.appendHtml}):
 *
 *   - `customHtml` only — replaces the synchronous body. The default sync
 *     row is **not** rendered.
 *   - `appendHtml` only — keeps the default synchronous body and appends
 *     the user HTML below it (separator already supplied by
 *     {@link createAsyncTooltipFormatter}'s `wrap`).
 *   - both — `customHtml` provides the sync body (the built-in default is
 *     skipped), and `appendHtml`'s output is rendered below it inside the
 *     wrapper's `extra` slot, separated by a thin dashed rule.
 */
export function buildAsyncTooltipFormatter(opts: {
  options: ChartOptions;
  defaultSync: (params: unknown) => string;
  toContext: (params: unknown) => TooltipContext;
}): AsyncTooltipFormatter | undefined {
  const tooltip = opts.options.tooltip ?? {};
  const replaceFn = tooltip.customHtml;
  const appendFn = tooltip.appendHtml;
  if (!replaceFn && !appendFn) return undefined;

  const APPEND_SEPARATOR =
    '<div class="icharts-tooltip-append" style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(128,128,128,.3)">';

  return createAsyncTooltipFormatter({
    formatSync: replaceFn ? () => '' : opts.defaultSync,
    customHtml: async (params) => {
      const context = opts.toContext(params);
      const replaceHtml = replaceFn ? await replaceFn(context) : '';
      const appendHtml = appendFn ? await appendFn(context) : '';
      const a = (replaceHtml ?? '').toString();
      const b = (appendHtml ?? '').toString();
      if (a && b) return `${a}${APPEND_SEPARATOR}${b}</div>`;
      return a || b;
    },
    placeholder: tooltip.placeholder,
  });
}
