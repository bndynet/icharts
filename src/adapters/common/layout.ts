import type { DataZoomOptions, XYChartOptions, GridOptions } from '../../types.js';
import { deepMerge } from '../../utils.js';
import { getLegendReserve } from './legend.js';
import { EMPTY_EDGES, getChartPadding, type EdgeReserves } from './shared.js';
import { getTitleReserve } from './title.js';
import { resolveDataZoomOptions } from './interaction.js';

export interface BuildGridOverrides {
  legendShow?: boolean;
  names?: ReadonlyArray<string>;
}

const DATA_ZOOM_SLIDER_RESERVE = 40;
const DATA_ZOOM_X_AXIS_GAP = 8;

function getDataZoomGridAdjustment(
  options: XYChartOptions,
): Partial<EdgeReserves> {
  const configured = resolveDataZoomOptions(options.dataZoom);
  if (configured === undefined) return {};
  const zooms: DataZoomOptions[] = Array.isArray(configured)
    ? configured
    : [configured];
  let bottom = 0;
  let right = 0;
  const p = getChartPadding(options);
  for (const zoom of zooms) {
    if (zoom.type !== 'slider') continue;
    const hasX = zoom.xAxisIndex !== undefined || zoom.yAxisIndex === undefined;
    const hasY = zoom.yAxisIndex !== undefined;
    if (hasX) {
      bottom = Math.max(bottom, p + DATA_ZOOM_SLIDER_RESERVE + DATA_ZOOM_X_AXIS_GAP);
    }
    if (hasY) right = Math.max(right, p + DATA_ZOOM_SLIDER_RESERVE);
  }
  return {
    ...(bottom > 0 ? { bottom } : {}),
    ...(right > 0 ? { right } : {}),
  };
}

function getLegendGridAdjustment(
  options: XYChartOptions,
  legendShow?: boolean,
  names?: ReadonlyArray<string>,
): EdgeReserves {
  const show = legendShow ?? options.legend?.show ?? true;
  const reserves = getLegendReserve(options, show, 0, names);
  const p = getChartPadding(options);
  const titleTop = getTitleReserve(options).top;
  const out: Partial<EdgeReserves> = {};
  const topReserve = titleTop + reserves.top;
  if (topReserve > 0) out.top = p + topReserve;
  if (reserves.bottom > 0) out.bottom = p + reserves.bottom;
  if (reserves.left > 0) out.left = p + reserves.left;
  if (reserves.right > 0) out.right = p + reserves.right;
  return { ...EMPTY_EDGES, ...out };
}

export function buildGrid(
  options: XYChartOptions,
  overrides?: BuildGridOverrides,
): Record<string, unknown> {
  const grid: GridOptions = options.grid ?? {};
  const legendArea = getLegendGridAdjustment(
    options,
    overrides?.legendShow,
    overrides?.names,
  );
  const dataZoomArea = getDataZoomGridAdjustment(options);
  const combinedWidgetArea: Partial<EdgeReserves> = {
    ...(legendArea.top || dataZoomArea.top
      ? { top: legendArea.top + (dataZoomArea.top ?? 0) }
      : {}),
    ...(legendArea.bottom || dataZoomArea.bottom
      ? { bottom: legendArea.bottom + (dataZoomArea.bottom ?? 0) }
      : {}),
    ...(legendArea.left || dataZoomArea.left
      ? { left: legendArea.left + (dataZoomArea.left ?? 0) }
      : {}),
    ...(legendArea.right || dataZoomArea.right
      ? { right: legendArea.right + (dataZoomArea.right ?? 0) }
      : {}),
  };
  const p = getChartPadding(options);
  return deepMerge(
    {
      show: true,
      top: p,
      left: p,
      right: p,
      bottom: p,
      borderWidth: 0,
      containLabel: true,
    },
    combinedWidgetArea as Record<string, unknown>,
    grid as Record<string, unknown>,
  );
}
