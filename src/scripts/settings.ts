// Overview of Style Customization:https://www.echartsjs.com/en/tutorial.html#Overview%20of%20Style%20Customization

export const colorSet: { [key: string]: string[] } = {
  default: ['#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#749f83', '#ca8622', '#bda29a', '#6e7074', '#546570', '#c4ccd3'],
  material: ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'],
  dark: ['#67b7dc', '#6794dc', '#6771dc', '#8067dc', '#a367dc', '#c767dc', '#dc67ce', '#dc67ab', '#dc6788', '#dc6967', '#dc8c67', '#dcaf67', '#dcd267', '#c3dc67', '#a0dc67', '#7ddc67', '#67dc75', '#67dc98', '#67dcbb', '#67dadc'],
};

export const globalOptions = {
  textStyle: {
    color: '#333333', // does not work for legend text, tooltip, chart title
    fontSize: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  title: {
    left: 'center',
    textStyle: {
      fontSize: 14,
    },
  },
  legend: {
    bottom: 10,
  },
  grid: {
    borderWidth: 1,
    borderColor: '#ff0000',
    left: 80,
    right: 80,
  },
  tooltip: {
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: [5, 10],
    textStyle: {
      fontSize: 13,
    },
  },
  color: colorSet.dark,
};

export function registerColorSet(name: string, colors: string[]): void {
  colorSet[name] = colors;
}

export function useColorSet(key: string): void {
  globalOptions.color = colorSet[key] || colorSet['default'];
}
