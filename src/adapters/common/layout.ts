import type { XYChartOptions, GridOptions } from '../../types.js';
import { deepMerge } from '../../utils.js';
import { getLegendReserve } from './legend.js';
import { getChartPadding } from './shared.js';
import { getTitleReserve } from './title.js';

export interface BuildGridOverrides {
  legendShow?: boolean;
  names?: ReadonlyArray<string>;
}

function getLegendGridAdjustment(
  options: XYChartOptions,
  legendShow?: boolean,
  names?: ReadonlyArray<string>,
): Record<string, unknown> {
  const show = legendShow ?? options.legend?.show ?? true;
  const reserves = getLegendReserve(options, show, 0, names);
  const p = getChartPadding(options);
  const titleTop = getTitleReserve(options).top;
  const out: Record<string, unknown> = {};
  const topReserve = titleTop + reserves.top;
  if (topReserve > 0) out.top = p + topReserve;
  if (reserves.bottom > 0) out.bottom = p + reserves.bottom;
  if (reserves.left > 0) out.left = p + reserves.left;
  if (reserves.right > 0) out.right = p + reserves.right;
  return out;
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
  const p = getChartPadding(options);
  return deepMerge(
    {
      top: p,
      left: p,
      right: p,
      bottom: p,
      borderWidth: 0,
      containLabel: true,
    },
    legendArea,
    grid as Record<string, unknown>,
  );
}
