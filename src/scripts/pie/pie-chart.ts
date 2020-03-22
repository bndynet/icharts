/* eslint-disable @typescript-eslint/no-explicit-any */
import merge from 'lodash-es/merge';
import { BaseChart } from '../core/base-chart';
import { globalOptions } from '../settings';
import { getColor } from '../utils';
import { PieChartOptions } from './pie-chart-options';

export class PieChart extends BaseChart<PieChartOptions> {
  constructor(dom: HTMLDivElement | HTMLCanvasElement, public options: PieChartOptions) {
    super(dom, options);
    this.render();
  }

  protected render(): void {
    const series: any[] = [];
    const seriesData = Array.isArray(this.options.data) ? this.options.data : [this.options.data];
    const seriesWidthWithSpace = 40 / (seriesData.length - 1);
    seriesData.forEach((d: any, index: number) => {
      const isInnerSeries = index < seriesData.length - 1;
      let radius = index === 0 ? [0, seriesData.length === 1 ? '80%' : '40%'] : [`${40 + seriesWidthWithSpace * index - seriesWidthWithSpace / 2}%`, `${40 + seriesWidthWithSpace * index}%`];
      if (index === seriesData.length - 1 && this.options.radius) {
        radius = Array.isArray(this.options.radius) ? this.options.radius : [this.options.radius, '80%'];
      }
      const s = {
        type: 'pie',
        radius,
        label: {
          position: isInnerSeries ? 'inner' : 'outside',
          formatter: isInnerSeries ? '{b}' : '{b}: {d}%',
          color: isInnerSeries ? '#ffffff' : null,
          textShadowColor: isInnerSeries ? '#000' : null,
          textShadowOffsetX: isInnerSeries ? 1 : 0,
          textShadowOffsetY: isInnerSeries ? 1 : 0,
        },
        data: Object.keys(d).map((key: string) => {
          return {
            name: key,
            value: d[key],
            selected: false,
          };
        }),
        tooltip: {
          formatter: (params: any): string => {
            if (this.options.tooltip && this.options.tooltip.getContent) {
              return this.options.tooltip.getContent(params);
            }

            return `<div class="ichart-tooltip">
              <div class="category">
                <span class="flag" style="background-color: ${params.color}"></span>
                <span class="name">${params.name}</span>
              </div>
              <div class="item">
                <span class="name">${params.value.toLocaleString()}</span>
                <span class="value">${params.percent}%</span>
              </div>
            </div>`;
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        itemStyle: {
          normal: {
            color: (params: any): string | null => {
              return getColor(params.data.name, params.dataIndex, this.options);
            },
          },
        },
      };
      series.push(s);
    });

    const options = merge(
      {},
      globalOptions,
      {
        legend: this.getLegendOptions(),
        title: this.getTitleOptions(),
        series: series,
        color: this.options.colors,
        toolbox: this.getToolboxOptions(),
      },
      this.options,
    );
    console.log(options);
    this.chart && this.chart.setOption(options);
  }

  protected getLegendOptions(): any {
    return merge({}, super.getLegendOptions(), {
      data: (Array.isArray(this.options.data) ? this.options.data : [this.options.data]).map((d) => Object.keys(d)).reduce((merged: any[], array: any[]) => (merged || []).concat(array)),
    });
  }
}
