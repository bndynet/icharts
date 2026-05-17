import type { ChartOptions, LegendOptions, TitleOptions } from '../../types.js';

/**
 * Structural shape consumed by legend helpers.
 *
 * `legend` sits on chart-option subtypes that render a legend; this keeps
 * helper signatures concise without adding `legend` back to base ChartOptions.
 */
export type WithLegend = ChartOptions & { legend?: LegendOptions };

export interface EdgeReserves {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const EMPTY_EDGES: EdgeReserves = Object.freeze({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

export const CHART_DEFAULT_PADDING = 12;
export const LEGEND_ICON_WIDTH = 10;
export const LEGEND_ICON_HEIGHT = 10;

export const TITLE_DEFAULT_FONT_SIZE = 14;
export const TITLE_DEFAULT_PADDING = 8;
/** Extra gap between the bottom of the title and the top of the plot area. */
export const TITLE_CHART_GAP = 8;

export function normalizeTitleOptions(title: string | TitleOptions): TitleOptions {
  return typeof title === 'string' ? { text: title } : title;
}

export function getChartPadding(options: ChartOptions): number {
  return options.padding ?? CHART_DEFAULT_PADDING;
}

export function getPositiveLegendSize(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/**
 * Treat NaN/undefined as "not set" for axis min/max.
 */
export function isAxisBound(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.length > 0;
}
