import { ChartData, ChartOptions } from '../types';
import { Chart } from './core/chart';
import { PieChart } from './pie';
import { XYChart } from './xy';

export enum ChartType {
  Pie = 'pie',
  Line = 'line',
}

const componentMap: Record<
  ChartType,
  {
    new (
      dom: HTMLDivElement | HTMLCanvasElement,
      data: ChartData,
      option: ChartOptions<ChartData>,
    ): Chart;
  }
> = {
  [ChartType.Line]: XYChart,
  [ChartType.Pie]: PieChart,
};

export function chart<TData, TOptions>(
  element: HTMLDivElement | HTMLCanvasElement,
  type: ChartType,
  data: ChartData,
  options?: ChartOptions<ChartData>,
): Chart {
  debugger;
  const ctor = componentMap[type];
  if (!ctor) {
    throw Error(`Chart "${type}" does not support.`);
  }
  const chart = new ctor(element, data, options as ChartOptions<ChartData>);
  chart.render();
  return chart;
}
