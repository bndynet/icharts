import { ThemeOptions } from '../types';

export function buildLegendTheme(options: ThemeOptions) {
  return {
    legend: {
      textStyle: {
        color: options.textColor,
      },
    },
  };
}
