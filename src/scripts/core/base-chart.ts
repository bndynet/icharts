import { ChartOptions } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class BaseChart<TOptions extends ChartOptions> {
  protected chart: any;
  protected options: TOptions;

  constructor(dom: HTMLDivElement | HTMLCanvasElement, options: TOptions) {
    this.chart = echarts.init(dom);
    this.options = options;
  }

  protected getTitleOptions(): any {
    const result: any = {};
    if (this.options.title) {
      if (this.options.title.text) {
        result.text = this.options.title.text;
      }
      if (this.options.title.description) {
        result.subtext = this.options.title.description;
      }
    }
    return result;
  }
}
