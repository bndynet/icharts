import { ChartData, ChartOptions } from '../types';
import { Chart } from './core/chart';
import { GaugeChart } from './gauge';
import { PieChart } from './pie';
import { XYChart } from './xy';

export enum ChartType {
  Pie = 'pie',
  Line = 'line',
  Gauge = 'gauge',
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
  [ChartType.Gauge]: GaugeChart,
};

export function chart(
  element: HTMLDivElement | HTMLCanvasElement,
  type: ChartType,
  data: ChartData,
  options?: ChartOptions<ChartData>,
): Chart {
  const ctor = componentMap[type];
  if (!ctor) {
    throw Error(`Chart "${type}" does not support.`);
  }
  const chart = new ctor(element, data, options as ChartOptions<ChartData>);
  chart.render();
  return chart;
}
