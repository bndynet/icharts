import type {
  AxisOptions,
  HeatmapData,
  HeatmapChartOptions,
  TooltipContextItem,
} from '../types.js';
import type { RenderContext } from './index.js';
import { deepMerge, resolveColors } from '../utils.js';
import {
  buildTitle,
  buildGrid,
  buildAsyncTooltipFormatter,
  getLabelFontSize,
  resolveAppendToBody,
  resolveTooltipPosition,
  applyAxisLabel,
  buildVisualMap,
} from './common/index.js';

/** Extra grid inset (px) reserved for the vertical visualMap bar + labels. */
const HEATMAP_VISUALMAP_RESERVE_V = 100;
/** Extra grid inset (px) reserved for the horizontal visualMap bar + labels. */
const HEATMAP_VISUALMAP_RESERVE_H = 40;

/**
 * Resolve a cell's `x` / `y` value to a zero-based axis index.
 *
 * A number that already looks like an index (non-negative integer within
 * range) is used as-is; everything else is looked up as a category label.
 * This keeps numeric category labels (e.g. years `[1990, 1991]`) working:
 * `cell.x = 1990` is not a valid index for a 2-long axis, so it falls
 * through to `indexOf(1990)`.
 */
function resolveCategoryIndex(
  categories: ReadonlyArray<string | number>,
  value: number | string,
): number {
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0 && value < categories.length) {
      return value;
    }
  }
  return categories.indexOf(value);
}

/**
 * Build a heatmap category axis. Both axes are `type: 'category'`; the
 * y-axis is inverted so `yCategories[0]` renders at the top (natural
 * reading order).
 */
function buildCategoryAxis(
  axisOptions: AxisOptions | undefined,
  categories: ReadonlyArray<string | number>,
  keyPrefix: string,
  nameGap: number,
  inverse: boolean,
): Record<string, unknown> {
  const axis: Record<string, unknown> = {
    type: 'category',
    data: [...categories],
    splitArea: { show: false },
    splitLine: { show: false },
  };
  if (inverse) axis.inverse = true;
  if (axisOptions?.show !== undefined) axis.show = axisOptions.show;
  if (axisOptions?.name) {
    axis.name = axisOptions.name;
    axis.nameLocation = 'center';
    axis.nameGap = nameGap;
  }
  applyAxisLabel(axis, axisOptions ?? {}, false, categories, keyPrefix);
  return axis;
}

interface HeatmapCellCoords {
  xi?: number;
  yi?: number;
  value: number | string;
}

/** Unpack ECharts heatmap `params.value` (`[xIndex, yIndex, value]`). */
function heatmapCellCoords(params: unknown): HeatmapCellCoords {
  const pr = params as Record<string, unknown>;
  const raw = Array.isArray(pr.value) ? (pr.value as unknown[]) : undefined;
  return {
    xi: typeof raw?.[0] === 'number' ? (raw[0] as number) : undefined,
    yi: typeof raw?.[1] === 'number' ? (raw[1] as number) : undefined,
    value: (raw?.[2] ?? pr.value) as number | string,
  };
}

/** Compose a readable "x × y" cell name from the category labels. */
function heatmapCellName(
  coords: { xi?: number; yi?: number },
  data: HeatmapData,
  fallback: string,
): string {
  const xName = coords.xi !== undefined ? String(data.xCategories[coords.xi] ?? '') : '';
  const yName = coords.yi !== undefined ? String(data.yCategories[coords.yi] ?? '') : '';
  if (xName && yName) return `${xName} × ${yName}`;
  return fallback || xName || yName;
}

/**
 * Map ECharts heatmap tooltip params → unified {@link TooltipContextItem}.
 * `params.color` is a real resolved hex on the cell side (ECharts surfaces
 * the visualMap-painted fill), so no `nameToColor` map is needed here.
 */
function heatmapParamsToTooltipContext(
  params: unknown,
  data: HeatmapData,
): TooltipContextItem {
  const pr = params as Record<string, unknown>;
  const coords = heatmapCellCoords(params);
  return {
    kind: 'item',
    dataIndex: typeof pr.dataIndex === 'number' ? pr.dataIndex : 0,
    name: heatmapCellName(coords, data, String(pr.name ?? '')),
    value: coords.value,
    marker: typeof pr.marker === 'string' ? pr.marker : undefined,
    color: typeof pr.color === 'string' ? pr.color : undefined,
  };
}

/** Default synchronous tooltip body: marker + "x × y" + formatted value. */
function heatmapTooltipSyncHtml(
  params: unknown,
  options: HeatmapChartOptions,
  data: HeatmapData,
): string {
  const pr = params as Record<string, unknown>;
  const coords = heatmapCellCoords(params);
  const marker = (pr.marker as string) ?? '';
  const name = heatmapCellName(coords, data, String(pr.name ?? ''));
  const fmt = options.tooltip?.formatValue;
  const display = fmt ? fmt(Number(coords.value), name) : String(coords.value);
  return `${marker}${name}: ${display}`;
}

/**
 * Resolve a {@link HeatmapData} + {@link HeatmapChartOptions} pair into an
 * ECharts option object. Single-series chart — emits one `{ type: 'heatmap' }`
 * series over two category axes, colored by a continuous visualMap.
 *
 * Colors flow through {@link resolveColors} into `visualMap.inRange.color`
 * (the same ramp the map adapter builds); the resolved base color is also
 * published on `merged.color` as the no-visualMap fallback.
 */
export function resolveHeatmapOptions(
  data: HeatmapData,
  options: HeatmapChartOptions,
  ctx?: RenderContext,
): Record<string, unknown> {
  const baseColor = resolveColors(['__heatmap__'], options)[0];

  const xAxis = buildCategoryAxis(options.xAxis, data.xCategories, 'xaxis_heatmap', 30, false);
  const yAxis = buildCategoryAxis(options.yAxis, data.yCategories, 'yaxis_heatmap', 60, true);

  const cells = data.data.map((cell) => {
    const xi = resolveCategoryIndex(data.xCategories, cell.x);
    const yi = resolveCategoryIndex(data.yCategories, cell.y);
    return [xi, yi, cell.value] as [number, number, number];
  });

  const visualMap = buildVisualMap(
    data.data.map((c) => c.value),
    options.visualMap,
    baseColor,
    'vertical',
  );

  const tooltip: Record<string, unknown> = {
    trigger: 'item',
    confine: true,
    show: options.tooltip?.enabled !== false,
    appendToBody: resolveAppendToBody(options, ctx),
    position: resolveTooltipPosition(options),
  };
  const asyncFormatter = buildAsyncTooltipFormatter({
    options,
    defaultSync: (params) => heatmapTooltipSyncHtml(params, options, data),
    toContext: (params) => heatmapParamsToTooltipContext(params, data),
  });
  tooltip.formatter =
    asyncFormatter ??
    ((params: unknown) => heatmapTooltipSyncHtml(params, options, data));

  const series: Record<string, unknown> = {
    type: 'heatmap',
    data: cells,
    label: {
      show: options.showCellLabel ?? false,
      fontSize: getLabelFontSize(options),
    },
    itemStyle: {
      borderWidth: options.cellBorderWidth ?? 1,
      // Without visualMap every cell shares one fill — use the resolved
      // base palette color so the grid stays theme-aware.
      ...(visualMap === undefined ? { color: baseColor } : {}),
    },
  };

  // Heatmap has no legend, so the grid only reserves the title slot via
  // buildGrid — but it must also reserve space for the visualMap (a
  // vertical bar on the right, or a horizontal bar at the bottom) so the
  // color legend doesn't overlap the cells / axis labels.
  const grid = buildGrid(options, { legendShow: false });
  if (visualMap !== undefined) {
    const orient = (visualMap.orient as string | undefined) ?? 'vertical';
    if (orient === 'horizontal') {
      if (options.grid?.bottom === undefined) {
        grid.bottom = (grid.bottom as number) + HEATMAP_VISUALMAP_RESERVE_H;
      }
    } else if (options.grid?.right === undefined) {
      grid.right = (grid.right as number) + HEATMAP_VISUALMAP_RESERVE_V;
    }
  }

  const eOption: Record<string, unknown> = {
    title: buildTitle(options),
    grid,
    xAxis,
    yAxis,
    tooltip,
    visualMap,
    series: [series],
  };

  const merged = deepMerge(
    eOption,
    (options.echarts ?? {}) as Record<string, unknown>,
  );
  merged.color = [baseColor];
  return merged;
}
