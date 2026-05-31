import type {
  ChartOptions,
  TooltipContext,
  TooltipContextItem,
  TooltipContextEdge,
  ChartEventContext,
  ChartEventType,
} from './types.js';

/**
 * Map ECharts pie `item` tooltip params to {@link TooltipContextItem}.
 *
 * Reads `params.color` for the resolved slice color — ECharts populates
 * this with the same hex/rgb value it used to paint the slice, so it
 * already reflects `options.colors` / `options.colorMap` / theme palette
 * after our color pipeline has run.
 */
export function pieParamsToTooltipContext(params: unknown): TooltipContextItem {
  const x = params as {
    name: string;
    value: number;
    percent?: number;
    dataIndex?: number;
    marker?: string;
    color?: string;
  };
  return {
    kind: 'item',
    dataIndex: x.dataIndex ?? 0,
    name: x.name,
    value: x.value,
    percent: x.percent,
    marker: x.marker,
    color: typeof x.color === 'string' ? x.color : undefined,
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
 * Map Sankey / Chord / Network / Tree tooltip params to {@link TooltipContext}.
 *
 * `nameToColor` is optional but **required for color fields to populate**:
 *
 *   - node hover (`kind: 'item'`) → `color = nameToColor.get(name)`
 *     (falls back to `params.color` when the map doesn't have an entry —
 *     ECharts' own `params.color` is a real hex on the node side, never
 *     `"gradient"`).
 *   - edge hover (`kind: 'edge'`) → `sourceColor = nameToColor.get(source)`,
 *     `targetColor = nameToColor.get(target)`. There is no `params.color`
 *     fallback here because ECharts reports the literal string
 *     `"gradient"` for sankey/chord links by default.
 *
 * Without the map both color fields are `undefined` and the rest of the
 * context still works — this keeps the function callable from custom
 * adapters that don't have a name→color lookup handy.
 */
export function sankeyChordParamsToTooltipContext(
  params: unknown,
  nameToColor?: ReadonlyMap<string, string>,
): TooltipContext {
  const pr = params as Record<string, unknown>;
  if (pr.dataType === 'edge') {
    const d = pr.data as Record<string, unknown>;
    const source = String(d.source);
    const target = String(d.target);
    return {
      kind: 'edge',
      dataIndex: (pr.dataIndex as number) ?? 0,
      source,
      target,
      value: d.value as number | string,
      sourceColor: nameToColor?.get(source),
      targetColor: nameToColor?.get(target),
    };
  }
  const name = String(pr.name ?? '');
  const fallbackColor = typeof pr.color === 'string' ? pr.color : undefined;
  return {
    kind: 'item',
    dataIndex: (pr.dataIndex as number) ?? 0,
    name,
    value: (pr.value as number | string) ?? '',
    marker: pr.marker as string | undefined,
    color: nameToColor?.get(name) ?? fallbackColor,
  };
}

/**
 * Coerce an ECharts `params.value` into the scalar a `TooltipContext*` exposes.
 * Most series report a number / string; scatter & word-cloud report a tuple
 * (`[x, y]` / `[word, count]`), in which case the trailing element is the
 * meaningful magnitude.
 */
function scalarValue(value: unknown): number | string {
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    return typeof last === 'number' || typeof last === 'string' ? last : '';
  }
  return typeof value === 'number' || typeof value === 'string' ? value : '';
}

/**
 * Normalize a raw ECharts mouse-event `params` into a {@link ChartEventContext}
 * for `ChartOptions.events` handlers. Reuses the tooltip item/edge shapes:
 *
 *   - `params.dataType === 'edge'` (sankey / chord / network link) → `data`
 *     is a {@link TooltipContextEdge}.
 *   - a hit carrying `name` / `value` / `data` (any series data item) → `data`
 *     is a {@link TooltipContextItem}.
 *   - anything else (empty canvas, legend, title, axis label) → `data` is
 *     `undefined`; the caller still gets `componentType` / `seriesType` / `raw`.
 *
 * ECharts' literal `"gradient"` link color is dropped (it's not a usable hex);
 * node/item `params.color` is a real resolved color and passes through.
 */
export function buildChartEventContext(
  type: ChartEventType,
  params: unknown,
): ChartEventContext {
  const pr = (params ?? {}) as Record<string, unknown>;

  let data: TooltipContextItem | TooltipContextEdge | undefined;
  if (
    pr.dataType === 'edge' &&
    pr.data !== null &&
    typeof pr.data === 'object'
  ) {
    const d = pr.data as Record<string, unknown>;
    data = {
      kind: 'edge',
      dataIndex: (pr.dataIndex as number) ?? 0,
      source: String(d.source ?? ''),
      target: String(d.target ?? ''),
      value: scalarValue(d.value),
    };
  } else if (
    pr.componentType === 'series' &&
    (pr.name !== undefined || pr.value !== undefined || pr.data !== undefined)
  ) {
    const color =
      typeof pr.color === 'string' && pr.color !== 'gradient'
        ? pr.color
        : undefined;
    data = {
      kind: 'item',
      dataIndex: (pr.dataIndex as number) ?? 0,
      name: String(pr.name ?? ''),
      value: scalarValue(pr.value),
      percent: typeof pr.percent === 'number' ? pr.percent : undefined,
      marker: typeof pr.marker === 'string' ? pr.marker : undefined,
      color,
    };
  }

  return {
    type,
    data,
    componentType:
      typeof pr.componentType === 'string' ? pr.componentType : undefined,
    seriesType: typeof pr.seriesType === 'string' ? pr.seriesType : undefined,
    seriesIndex:
      typeof pr.seriesIndex === 'number' ? pr.seriesIndex : undefined,
    raw: params,
  };
}
