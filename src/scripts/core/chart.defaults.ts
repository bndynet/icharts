import { ChartOptions, Icon, Orient } from '../../types';

const defaultPadding = 32;
export const defaults: ChartOptions<any> = {
  tooltip: {
    padding: [6, 12],
    textStyle: {
      fontWeight: 'normal', // remove the default bold style
    },
    confine: true, // astrict tooltip shows in canvas area
  },
  textStyle: {
    fontSize: 13,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  legend: {
    icon: Icon.RoundRect,
    orient: Orient.Horizontal,
    itemGap: 10,
  },
  toolbox: {
    show: false,
  },
  grid: {
    top: defaultPadding,
    left: defaultPadding,
    right: defaultPadding,
    bottom: defaultPadding,
    borderWidth: 0,
    containLabel: true,
  },
};
