import type { ChartOptions } from '../../types.js';
import {
  EMPTY_EDGES,
  type EdgeReserves,
  TITLE_CHART_GAP,
  TITLE_DEFAULT_FONT_SIZE,
  TITLE_DEFAULT_PADDING,
  getChartPadding,
  normalizeTitleOptions,
} from './shared.js';

/**
 * Vertical space (px) consumed by the title widget itself, or 0 if no title.
 */
export function getTitleHeight(options: ChartOptions): number {
  if (!options.title) return 0;
  const t = normalizeTitleOptions(options.title);
  return (t.fontSize ?? TITLE_DEFAULT_FONT_SIZE) + (t.padding ?? TITLE_DEFAULT_PADDING) * 2 + TITLE_CHART_GAP;
}

export function buildTitle(options: ChartOptions): Record<string, unknown> | undefined {
  if (!options.title) return undefined;
  const t = normalizeTitleOptions(options.title);
  const fontSize = t.fontSize ?? TITLE_DEFAULT_FONT_SIZE;
  const titlePadding = t.padding ?? TITLE_DEFAULT_PADDING;
  const chartPadding = getChartPadding(options);

  return {
    text: t.text,
    left: t.align ?? 'center',
    top: chartPadding,
    padding: [titlePadding, 0],
    textStyle: { fontSize, fontWeight: 'normal' },
  };
}

export function getTitleReserve(options: ChartOptions): EdgeReserves {
  const h = getTitleHeight(options);
  if (h === 0) return { ...EMPTY_EDGES };
  return { ...EMPTY_EDGES, top: h };
}
