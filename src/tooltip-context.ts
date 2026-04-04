import type {
  ChartOptions,
  TooltipContext,
  TooltipContextItem,
} from './types.js';

/**
 * Map ECharts pie `item` tooltip params to {@link TooltipContextItem}.
 */
export function pieParamsToTooltipContext(params: unknown): TooltipContextItem {
  const x = params as {
    name: string;
    value: number;
    percent?: number;
    dataIndex?: number;
    marker?: string;
  };
  return {
    kind: 'item',
    dataIndex: x.dataIndex ?? 0,
    name: x.name,
    value: x.value,
    percent: x.percent,
    marker: x.marker,
  };
}

/**
 * Default synchronous pie tooltip HTML (before `customHtml` append).
 */
export function formatPieTooltipSyncHtml(params: unknown, options: ChartOptions): string {
  const x = params as {
    marker?: string;
    name: string;
    value: number;
    percent?: number;
    seriesName?: string;
  };
  const fmt = options.tooltip?.formatValue;
  const valDisplay = fmt ? fmt(x.value, x.name) : String(x.value);
  const name = x.seriesName ?? x.name;
  if (x.percent != null && !Number.isNaN(x.percent)) {
    return `${x.marker ?? ''}${name}<br/>${valDisplay} (${x.percent.toFixed(1)}%)`;
  }
  return `${x.marker ?? ''}${name}<br/>${valDisplay}`;
}

/**
 * Map Sankey or Chord tooltip params to {@link TooltipContext}.
 */
export function sankeyChordParamsToTooltipContext(
  params: unknown,
): TooltipContext {
  const pr = params as Record<string, unknown>;
  if (pr.dataType === 'edge') {
    const d = pr.data as Record<string, unknown>;
    return {
      kind: 'edge',
      dataIndex: (pr.dataIndex as number) ?? 0,
      source: String(d.source),
      target: String(d.target),
      value: d.value as number | string,
    };
  }
  return {
    kind: 'item',
    dataIndex: (pr.dataIndex as number) ?? 0,
    name: String(pr.name ?? ''),
    value: (pr.value as number | string) ?? '',
    marker: pr.marker as string | undefined,
  };
}
