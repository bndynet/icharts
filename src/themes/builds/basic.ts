import { ThemeOptions } from '../types';

export function buildBasicTheme(options: ThemeOptions) {
  return {
    color: options.color,
    backgroundColor: options.backgroundColor,
    title: {
      textStyle: {
        color: options.textColor,
      },
      subtextStyle: {
        color: options.textColorMuted,
      },
    },
    toolbox: {
      iconStyle: {},
      emphasis: {
        iconStyle: {},
      },
    },
    legend: {
      textStyle: {
        color: options.textColor,
      },
    },
    tooltip: {
      axisPointer: {
        lineStyle: {
          color: options.cursorLineColor,
          width: '1',
        },
        crossStyle: {
          color: options.cursorLineColor,
          width: '1',
        },
        label: {
          backgroundColor: '#6a7985',
        },
      },
    },
  };
}
