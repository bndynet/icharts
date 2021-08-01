import { defaultTheme } from '../../themes';
import { ChartOptions, Icon, Orient } from '../../types';

export const defaults: ChartOptions<any> = {
  tooltip: {
    padding: [6, 12],
  },
  textStyle: {
    fontSize: 13,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  legend: {
    icon: Icon.RoundRect,
    orient: Orient.Horizontal,
    itemGap: 10,
  },
  // grid: {
  //   borderWidth: 1,
  //   left: 80,
  //   right: 80,
  // },
  toolbox: {
    show: false,
  },

  // icharts properties
  theme: defaultTheme,
};
