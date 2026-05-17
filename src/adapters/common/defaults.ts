import type { ChartOptions } from '../../types.js';
import { DEFAULT_LABEL_FONT_SIZE } from './text-measure.js';

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", ' +
  '"Microsoft YaHei", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif';

export { DEFAULT_LABEL_FONT_SIZE } from './text-measure.js';

export function getLabelFontSize(options: ChartOptions): number {
  return options.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;
}

export function getCommonDefaults(): Record<string, unknown> {
  return {
    textStyle: {
      fontSize: 13,
      fontFamily: FONT_FAMILY,
    },
    tooltip: {
      padding: [6, 12],
      textStyle: { fontWeight: 'normal' },
      confine: true,
    },
    toolbox: { show: false },
  };
}
