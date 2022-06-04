import { ThemeOptions } from '../types';

export function buildLineTheme(options: ThemeOptions) {
  return {
    line: {
      itemStyle: {
        borderWidth: 1,
      },
      lineStyle: {
        width: 1,
      },
      symbolSize: 4,
      symbol: 'circle',
      smooth: true,
    },
  };
}

export function buildBarTheme(options: ThemeOptions) {
  return {
    bar: {
      itemStyle: {
        barBorderWidth: 0,
        barBorderColor: '#ccc',
      },
    },
  };
}

export function buildPieTheme(options: ThemeOptions) {
  return {
    pie: {
      itemStyle: {
        borderWidth: 0,
      },
      label: {
        color: options.textColor,
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: options.shadowColor,
        },
      },
    },
  };
}
