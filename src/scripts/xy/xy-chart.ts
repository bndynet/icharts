/* eslint-disable @typescript-eslint/no-explicit-any */
import find from 'lodash-es/find';
import get from 'lodash-es/get';
import merge from 'lodash-es/merge';
import { BaseChart } from '../core/base-chart';
import { globalOptions } from '../settings';
import { XYChartOptions } from './xy-chart-options';

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
            const curSeriesColor = this.getColor(key, series.length);
            curSeries = {
              name: key,
              type: get(curSeriesStyles, 'type') || 'line',
              color: curSeriesColor,
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
            if (this.options.type === 'area' || this.options.type === 'sparkline' || get(curSeriesStyles, 'type') === 'area') {
              curSeries.type = 'line';
              curSeries.areaStyle = {};
              if (this.options.type === 'sparkline') {
                curSeries.areaStyle.opacity = 0.1;
                curSeries.symbol = 'none';
                curSeries.smooth = 0.6;
                if (curSeriesColor) {
                  curSeries.areaStyle.normal = {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      {
                        offset: 0,
                        color: curSeriesColor,
                      },
                      {
                        offset: 1,
                        color: `${curSeriesColor}00`,
                      },
                    ]),
                  };
                }
              }
            }
            series.push(curSeries);
          }
          curSeries.data[index] = dataItem[key];
        }
      });
    });
    this.xAxisStartWithZero = !find(series, (serie: any) => serie.type === 'bar');
    let option: any = {
      title: this.getTitleOptions(),
      xAxis: this.getXAxisOptions(),
      yAxis: this.getYAxisOptions(),
      legend: this.getLegendOptions(),
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
    option = merge({}, globalOptions, option);
    if (this.options.type === 'sparkline') {
      option = merge(option, {
        grid: {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        xAxis: {
          show: false,
        },
        yAxis: {
          show: false,
        },
        legend: null,
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'line',
          },
        },
      });
    }
    console.debug('echarts options:');
    console.debug(option);
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
        lineStyle: {
          color: '#888888',
          opacity: 0.4,
        },
      },
      axisLine: {
        lineStyle: {
          color: '#888888',
          opacity: 0.6,
        },
      },
      axisLabel: {},
      // ...axisStyle,
    };
    if (this.options.styles && this.options.styles.xAxis && this.options.styles.xAxis.labelFormatter) {
      options.axisLabel.formatter = this.options.styles.xAxis.labelFormatter;
    }
    if (this.textColors.primary) {
      options.axisLabel.color = this.textColors.primary;
    }
    return options;
  }

  private getYAxisOptions(): any {
    const options: any = {
      type: 'value',
      splitLine: {
        show: this.options.gridLine === 'all' || this.options.gridLine === 'horizontal',
        lineStyle: {
          color: '#888888',
          opacity: 0.4,
        },
      },
      axisLine: {
        lineStyle: {
          color: '#888888',
          opacity: 0.6,
        },
      },
      axisLabel: {},
    };
    if (this.textColors.primary) {
      options.axisLabel.color = this.textColors.primary;
    }
    return options;
  }
}
