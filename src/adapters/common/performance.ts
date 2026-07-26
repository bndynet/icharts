import type { AxisType, XYChartOptions, XYData } from '../../types.js';

/** Disable first-render animation for dense numeric XY data. */
export const AUTO_ANIMATION_POINT_THRESHOLD = 20_000;

/** Enable ECharts progressive rendering for a single very large series. */
export const AUTO_PROGRESSIVE_POINT_THRESHOLD = 100_000;

/** Keep each progressive render chunk bounded so a frame stays responsive. */
export const AUTO_PROGRESSIVE_CHUNK_SIZE = 20_000;

export interface AutoSeriesProgressiveOptions {
  progressive?: number;
  progressiveThreshold?: number;
}

/**
 * Return the safe animation default for an explicitly numeric x-axis.
 * Category/time charts intentionally return `undefined` to preserve their
 * existing ECharts animation behavior.
 */
export function getAutoXYAnimation(
  data: XYData,
  xAxisType: AxisType,
): boolean | undefined {
  if (xAxisType !== 'value') return undefined;
  const totalPoints = data.series.reduce((sum, series) => sum + series.data.length, 0);
  return totalPoints >= AUTO_ANIMATION_POINT_THRESHOLD ? false : undefined;
}

/**
 * Progressive rendering is decided per series because ECharts applies its
 * threshold to each series rather than to the combined chart payload.
 */
export function getAutoSeriesProgressive(
  pointCount: number,
  xAxisType: AxisType,
): AutoSeriesProgressiveOptions {
  if (xAxisType !== 'value' || pointCount < AUTO_PROGRESSIVE_POINT_THRESHOLD) {
    return {};
  }
  return {
    progressive: AUTO_PROGRESSIVE_CHUNK_SIZE,
    progressiveThreshold: AUTO_PROGRESSIVE_POINT_THRESHOLD,
  };
}

/** Apply automatic performance defaults without overriding explicit options. */
export function applyXYPerformanceDefaults(
  option: Record<string, unknown>,
  data: XYData,
  xAxisType: AxisType,
  options: XYChartOptions,
): void {
  if (options.animation !== undefined) return;
  const animation = getAutoXYAnimation(data, xAxisType);
  if (animation !== undefined) option.animation = animation;
}
