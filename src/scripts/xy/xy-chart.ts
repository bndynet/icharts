/* eslint-disable @typescript-eslint/no-explicit-any */
import * as echarts from 'echarts';
import { globalOptions } from '../settings';
import { merge, find, get } from 'lodash-es';
import { XYChartOptions } from './xy-chart-options';
import { BaseChart } from '../core/base-chart';

export class XYChart extends BaseChart<XYChartOptions> {
  private styles: any;
  private categoryValues: any[] = [];
  private xAxisStartWithZero = true;

  constructor(domElement: HTMLDivElement, public options: XYChartOptions) {
    super(domElement, options);
    this.render();
  }

  protected render(): void {
    this.categoryValues = this.options.data.map((item: any) => item[this.options.xKey]);
    const series: echarts.EChartOption.Series[] | any[] = [];
    const legend = this.getLegendOptions();
    legend.data = [];
    this.options.data.forEach((dataItem: any, index: number) => {
      Object.keys(dataItem).forEach((key: string) => {
        if (key !== this.options.xKey) {
          let curSeries = series.find((s: any) => s.name === key);
          const curSeriesStyles = get(this.styles, `series[${key}]`);
          if (!curSeries) {
            legend.data.push(key);
            curSeries = {
              name: key,
              type: get(curSeriesStyles, 'type') || 'line',
              color: get(curSeriesStyles, 'color'),
              smooth: this.options.smooth,
              tooltip: {
                formatter: (params: any): string => {
                  return `<div class="ichart-tooltip">
                    <div class="category">${params.name}</div>
                    <div class="item">
                      <span class="flag" style="background-color: ${params.color}"></span>
                      <span class="name">${params.seriesName}</span>
                      <span class="value">${params.value}</span>
                    </div>
                  </div>`;
                },
              },
              data: [],
            };
            curSeries.stack = this.options.stacked;
            if (this.options.type) {
              curSeries.type = this.options.type;
            }
            if (this.options.type === 'area' || get(curSeriesStyles, 'type') === 'area') {
              curSeries.type = 'line';
              curSeries.areaStyle = {};
            }
            series.push(curSeries);
          }
          curSeries.data[index] = dataItem[key];
        }
      });
    });
    this.xAxisStartWithZero = !find(series, (serie: any) => serie.type === 'bar');
    let option: echarts.EChartOption = {
      title: this.getTitleOptions(),
      xAxis: this.getXAxisOptions(),
      yAxis: {
        name: get(this.styles, 'axes[1].name'),
        type: 'value',
        axisLabel: {
          formatter: get(this.styles, 'axes[1].formatter'),
        },
        splitLine: {
          show: this.options.gridLine === 'all' || this.options.gridLine === 'horizontal',
        },
        // ...axisStyle,
      },
      legend,
      series,
      // color: this._colors,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
      },
      toolbox: this.getToolboxOptions(),
    };
    option = merge({}, globalOptions, option, this.options);
    console.log(option);
    this.chart && this.chart.setOption(option);
  }

  private getXAxisOptions(): any {
    const options: any = {
      name: get(this.styles, 'axes[0].name'),
      type: 'category',
      boundaryGap: !this.xAxisStartWithZero,
      data: this.categoryValues,
      splitLine: {
        show: this.options.gridLine === 'all' || this.options.gridLine === 'vertial',
      },
      // ...axisStyle,
    };
    if (this.options.styles && this.options.styles.xAxis && this.options.styles.xAxis.labelFormatter) {
      options.axisLabel = {
        formatter: this.options.styles.xAxis.labelFormatter,
      };
    }
    return options;
  }
}
