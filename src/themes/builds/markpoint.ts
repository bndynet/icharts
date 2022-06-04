import { ThemeOptions } from '../types';

export function buildMarkPoint(options: ThemeOptions) {
  return {
    markPoint: {
      label: {
        color: options.textColor,
      },
      emphasis: {
        label: {
          color: options.textColor,
        },
      },
    },
  };
}
