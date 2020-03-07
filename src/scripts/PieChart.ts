/* eslint-disable @typescript-eslint/no-explicit-any */
import { merge, omit } from 'lodash-es';
import { globalOptions } from './settings';
import * as echarts from 'echarts';
import { ChartOptions } from './types';
import { getColor } from './utils';

export interface PieChartOptions extends ChartOptions {
  radius?: string | string[];
}

export class PieChart {
  private chart: any;

  constructor(dom: HTMLDivElement | HTMLCanvasElement, public options: PieChartOptions) {
    this.chart = echarts.init(dom);

    this.options = {
      title: 'Pie',
      subtitle: 'description for pie chart',
      radius: ['60%', '70%'],
      legend: {
        show: true,
        fnLabels: (key: string, v: number, p: number) => {
          return [key, ` - ${v}(${p.toFixed(2)}%)`];
        },
        labelStyles: [
          {
            fontSize: 13,
          },
          {
            width: 50,
            textAlign: 'left',
          },
        ],
      },
      tooltip: {
        getContent: (d) => {
          return `<b>${d.name}</b>`;
        },
      },
      // colors: {
      //   Ireland: '#ff0000',
      // },
      colors: ['#ff0000', '#00ff00'],
    };

    const d = {
      'Czech Republic': 123,
      Ireland: 23,
      Germany: 2323,
    };
    this.options.data = [d, d];

    this.render();
  }

  render(): void {
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
                <span class="name">${params.value}</span>
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

  private getTitleOptions(): any {
    const result = {
      text: this.options.title,
      subtext: this.options.subtitle,
    };
    this.options = omit(this.options, 'title');
    return result;
  }

  protected getLegendOptions(): any {
    const result: any = {
      show: false,
      orient: 'horizontal',
      bottom: 5,
      data: Object.keys(this.options.data),
    };
    if (this.options.legend && this.options.legend.fnLabels) {
      result.formatter = (key: string) => {
        const total = (Object.values(this.options.data) as number[]).reduce((t: number, d: number) => t + d);
        const value = this.options.data[key];
        const percent = (value * 100) / total;
        if (this.options.legend?.fnLabels) {
          return this.options.legend
            .fnLabels(key, value, percent)
            .map((label: string | number, i: number) => `{${i}|${label}}`)
            .join('');
        }
      };
      if (this.options.legend.labelStyles) {
        const rich: any = {};
        this.options.legend.labelStyles.forEach((style, i) => {
          rich[`${i}`] = style;
        });
        result.textStyle = {
          rich,
        };
      }
    }
    return result;
  }

  private getToolboxOptions() {
    return {
      show: true,
      feature: {
        mark: { show: true },
        dataView: { show: true, readOnly: false },
        magicType: {
          show: true,
          type: ['pie', 'funnel'],
        },
        restore: { show: true },
        saveAsImage: { show: true },
      },
    };
  }
}
