import type { DataZoomConfig, DataZoomOptions, XYChartOptions } from '../../types.js';
import { getChartPadding } from './shared.js';

const STANDARD_XY_DATA_ZOOM: DataZoomOptions[] = [
  { type: 'inside', xAxisIndex: 0, filterMode: 'filter' },
  { type: 'slider', xAxisIndex: 0, filterMode: 'filter' },
  { type: 'slider', yAxisIndex: 0, filterMode: 'filter' },
];

/** Pixel height occupied by an ECharts horizontal dataZoom slider. */
export const DATA_ZOOM_SLIDER_RESERVE = 40;
/** Gap between an XY axis / legend row and the dataZoom slider. */
export const DATA_ZOOM_X_AXIS_GAP = 4;

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
  legendShow = options.legend?.show ?? true,
): void {
  if (options.animation !== undefined) option.animation = options.animation;
  if (options.dataZoom !== undefined) {
    const dataZoom = resolveDataZoomOptions(options.dataZoom);
    if (dataZoom !== undefined) {
      option.dataZoom = positionXYDataZoom(dataZoom, options, legendShow, option);
    }
    else delete option.dataZoom;
  }
  if (options.toolbox !== undefined) option.toolbox = options.toolbox;
}

function isXAxisSlider(zoom: DataZoomOptions): boolean {
  return zoom.type === 'slider' &&
    (zoom.xAxisIndex !== undefined || zoom.yAxisIndex === undefined);
}

/**
 * Keep the default horizontal slider, x-axis labels, and bottom legend in
 * separate rows. ECharts positions both legend and dataZoom from the canvas
 * bottom by default, so increasing `grid.bottom` alone does not prevent the
 * two components from painting on top of each other.
 *
 * Explicit `top` / `bottom` on a slider remains authoritative. The automatic
 * placement only applies to the new typed/default dataZoom path.
 */
function positionXYDataZoom(
  configured: DataZoomOptions | DataZoomOptions[],
  options: XYChartOptions,
  legendShow: boolean,
  option: Record<string, unknown>,
): DataZoomOptions | DataZoomOptions[] {
  const zooms = Array.isArray(configured) ? configured : [configured];
  const padding = getChartPadding(options);
  const hasAutoXSlider = zooms.some((zoom) =>
    isXAxisSlider(zoom) && zoom.top === undefined && zoom.bottom === undefined,
  );
  if (!hasAutoXSlider) return configured;

  const hasBottomLegend = legendShow &&
    (options.legend?.position ?? 'bottom') === 'bottom';
  if (hasBottomLegend) {
    const legend = option.legend as Record<string, unknown> | undefined;
    if (legend && legend.bottom === padding) {
      legend.bottom = padding + DATA_ZOOM_SLIDER_RESERVE + DATA_ZOOM_X_AXIS_GAP;
    }
  }

  const positioned = zooms.map((zoom) => {
    if (!isXAxisSlider(zoom) || zoom.top !== undefined || zoom.bottom !== undefined) {
      return zoom;
    }
    return { ...zoom, bottom: padding };
  });
  return Array.isArray(configured) ? positioned : positioned[0];
}
