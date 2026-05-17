import type { LegendOptions } from '../../types.js';
import { DEFAULT_LABEL_FONT, measureMaxTextWidth } from './text-measure.js';
import { getTitleHeight } from './title.js';
import {
  EMPTY_EDGES,
  LEGEND_ICON_HEIGHT,
  LEGEND_ICON_WIDTH,
  type EdgeReserves,
  type WithLegend,
  getChartPadding,
  getPositiveLegendSize,
} from './shared.js';
import {
  type CompiledRichText,
  measureCompiledLabelWidth,
  mergeCompiledRichStyles,
  safeFormatLegendLabel,
} from './rich-text.js';

export const LEGEND_RESERVE = 36;

const SIDE_LEGEND_NON_TEXT_PX = 26;
const SIDE_LEGEND_BODY_GAP = 8;

export function buildLegend(
  names: string[],
  options: WithLegend,
): Record<string, unknown> {
  const legend: LegendOptions = options.legend ?? {};
  const show = legend.show ?? true;
  const position = legend.position ?? 'bottom';
  const p = getChartPadding(options);
  const titleHeight = getTitleHeight(options);

  const positionMap: Record<string, Record<string, unknown>> = {
    top: { top: p + titleHeight, left: 'center', orient: 'horizontal' },
    bottom: { bottom: p, left: 'center', orient: 'horizontal' },
    left: { top: 'center', left: p, orient: 'vertical' },
    right: { top: 'center', right: p, orient: 'vertical' },
  };

  const out: Record<string, unknown> = {
    show,
    type: legend.type ?? 'scroll',
    data: names,
    icon: 'roundRect',
    itemWidth: LEGEND_ICON_WIDTH,
    itemHeight: LEGEND_ICON_HEIGHT,
    itemGap: 10,
    pageButtonItemGap: 5,
    pageButtonGap: 10,
    pageIconSize: 12,
    ...positionMap[position],
  };
  const legendHeight = getPositiveLegendSize(legend.height);
  if (legendHeight !== undefined) out.height = legendHeight;
  const legendWidth = getPositiveLegendSize(legend.width);
  if (legendWidth !== undefined) out.width = legendWidth;

  if (legend.formatLabel) {
    const fn = legend.formatLabel;
    const indexOf = new Map(names.map((n, i) => [n, i]));
    const compiledByIndex = names.map((name, i) =>
      safeFormatLegendLabel(fn, name, i, `legend_${i}`),
    );
    const rich = mergeCompiledRichStyles(compiledByIndex);
    if (Object.keys(rich).length > 0) {
      out.textStyle = { rich };
    }
    out.formatter = (name: string): string => {
      const i = indexOf.get(name);
      if (i === undefined) {
        return safeFormatLegendLabel(fn, name, 0, 'legend_fallback').text;
      }
      return (compiledByIndex[i] as CompiledRichText).text;
    };
  }

  return out;
}

export function getLegendReserve(
  options: WithLegend,
  showLegend: boolean,
  extraGap = 0,
  names?: ReadonlyArray<string>,
): EdgeReserves {
  if (!showLegend) return { ...EMPTY_EDGES };
  const position = options.legend?.position ?? 'bottom';
  const isSide = position === 'left' || position === 'right';
  const explicitHeight = getPositiveLegendSize(options.legend?.height);
  const explicitWidth = getPositiveLegendSize(options.legend?.width);

  let slot: number;
  if (isSide && explicitWidth !== undefined) {
    slot = explicitWidth + extraGap;
  } else if (!isSide && explicitHeight !== undefined) {
    slot = explicitHeight + extraGap;
  } else if (isSide && names && names.length > 0) {
    const fn = options.legend?.formatLabel;
    const widest = fn
      ? Math.max(
        ...names.map((n, i) =>
          measureCompiledLabelWidth(
            safeFormatLegendLabel(fn, n, i, `legend_reserve_${i}`),
          )),
        0,
      )
      : measureMaxTextWidth(names, DEFAULT_LABEL_FONT);
    slot =
      Math.max(LEGEND_RESERVE, Math.ceil(widest) + SIDE_LEGEND_NON_TEXT_PX) + extraGap;
  } else {
    slot = LEGEND_RESERVE + extraGap;
  }
  if (isSide) slot += SIDE_LEGEND_BODY_GAP;

  switch (position) {
    case 'top':
      return { ...EMPTY_EDGES, top: slot };
    case 'bottom':
      return { ...EMPTY_EDGES, bottom: slot };
    case 'left':
      return { ...EMPTY_EDGES, left: slot };
    case 'right':
      return { ...EMPTY_EDGES, right: slot };
    default:
      return { ...EMPTY_EDGES };
  }
}
