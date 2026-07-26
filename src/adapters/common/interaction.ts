import type { DataZoomConfig, DataZoomOptions, XYChartOptions } from '../../types.js';

const STANDARD_XY_DATA_ZOOM: DataZoomOptions[] = [
  { type: 'inside', xAxisIndex: 0, filterMode: 'filter' },
  { type: 'slider', xAxisIndex: 0, filterMode: 'filter' },
  { type: 'slider', yAxisIndex: 0, filterMode: 'filter' },
];

/** Resolve the easy `dataZoom: true` shorthand to the standard XY controls. */
export function resolveDataZoomOptions(
  configured: DataZoomConfig | undefined,
): DataZoomOptions | DataZoomOptions[] | undefined {
  if (configured === undefined || configured === false) return undefined;
  if (configured === true) {
    // Return fresh objects so callers/ECharts cannot mutate a shared default.
    return STANDARD_XY_DATA_ZOOM.map((zoom) => ({ ...zoom }));
  }
  return configured;
}

/**
 * Apply typed XY interaction options without changing the default option
 * shape. The raw `options.echarts` escape hatch is still merged afterwards,
 * so existing advanced overrides retain their established precedence.
 */
export function applyXYInteractionOptions(
  option: Record<string, unknown>,
  options: XYChartOptions,
): void {
  if (options.animation !== undefined) option.animation = options.animation;
  if (options.dataZoom !== undefined) {
    const dataZoom = resolveDataZoomOptions(options.dataZoom);
    if (dataZoom !== undefined) option.dataZoom = dataZoom;
    else delete option.dataZoom;
  }
  if (options.toolbox !== undefined) option.toolbox = options.toolbox;
}
