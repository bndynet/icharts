import { ThemeOptions } from '../types';

export function buildAxisTheme(options: ThemeOptions) {
  return {
    categoryAxis: {
      axisLine: {
        show: true,
        lineStyle: {
          color: options.axisLineColor,
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: options.axisLineColor,
        },
      },
      axisLabel: {
        show: true,
        color: options.textColor,
      },
      splitLine: {
        show: false,
        lineStyle: {
          color: ['rgba(155, 155, 155, 0.3)'],
        },
      },
      splitArea: {
        show: false,
        areaStyle: {
          color: ['#eeeeee'],
        },
      },
    },
    valueAxis: {
      axisLine: {
        show: true,
        lineStyle: {
          color: options.textColor,
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: options.axisLineColor,
        },
      },
      axisLabel: {
        show: true,
        color: options.textColor,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: ['rgba(155, 155, 155, 0.3)'],
        },
      },
      splitArea: {
        show: false,
        areaStyle: {
          color: ['#eeeeee'],
        },
      },
    },
    logAxis: {
      axisLine: {
        show: true,
        lineStyle: {
          color: options.axisLineColor,
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: options.axisLineColor,
        },
      },
      axisLabel: {
        show: true,
        color: options.textColor,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: ['#aaaaaa'],
        },
      },
      splitArea: {
        show: false,
        areaStyle: {
          color: ['#eeeeee'],
        },
      },
    },
    timeAxis: {
      axisLine: {
        show: true,
        lineStyle: {
          color: options.axisLineColor,
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: options.axisLineColor,
        },
      },
      axisLabel: {
        show: true,
        color: options.textColor,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: ['#aaaaaa'],
        },
      },
      splitArea: {
        show: false,
        areaStyle: {
          color: ['#eeeeee'],
        },
      },
    },
  };
}
