import { globalOptions } from './settings';
import { ChartOptions } from './types';

export function getColor(key: string, index: number, chartOptions: ChartOptions): string | null {
  let color: string | null = null;
  if (chartOptions.colors) {
    if (Array.isArray(chartOptions.colors)) {
      if (chartOptions.colors.length > index) {
        color = chartOptions.colors[index];
      }
    } else {
      color = chartOptions.colors[key];
    }
  }
  if (!color) {
    if (globalOptions.color.length > index) {
      color = globalOptions.color[index];
    }
  }
  return color;
}
