/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { merge } from 'lodash-es';
import { ChartOptions } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export abstract class BaseChart<TOptions extends ChartOptions> {
  protected chart: any;
  protected options: TOptions;

  constructor(dom: HTMLDivElement | HTMLCanvasElement, options: TOptions) {
    this.chart = echarts.init(dom);
    this.options = options;
  }

  protected abstract render(): void;

  protected getTitleOptions(): any {
    const result: any = {};
    if (this.options.textColor) {
      result.textStyle = {
        color: this.options.textColor,
      };
    }
    if (this.options.mutedTextColor) {
      result.subtextStyle = {
        color: this.options.mutedTextColor,
      };
    }
    if (this.options.title) {
      if (this.options.title.text) {
        result.text = this.options.title.text;
      }
      if (this.options.title.description) {
        result.subtext = this.options.title.description;
      }
      if (this.options.title.color) {
        result.textStyle = {
          color: this.options.title.color,
        };
      }
    }
    return result;
  }

  protected getLegendOptions(): any {
    const result: any = merge({
      show: true,
      padding: [10, 10, 10, 10],
      textStyle: this.getTextStyle(this.options.legend),
    });
    const locationMap = {
      left: { top: 'center', left: 0, orient: 'vertical' },
      right: { top: 'center', right: 0, orient: 'vertical' },
      top: { top: 0, left: 'center', orient: 'horizontal' },
      'top-left': { top: 0, left: 0, orient: 'horizontal' },
      'top-right': { top: 0, right: 0, orient: 'horizontal' },
      bottom: { bottom: 0, left: 'center', orient: 'horizontal' },
      'bottom-left': { bottom: 0, left: 0, orient: 'horizontal' },
      'bottom-right': { bottom: 0, right: 0, orient: 'horizontal' },
    };

    if (this.options.legend && this.options.legend.location) {
      merge(result, locationMap[this.options.legend.location]);
    } else {
      merge(result, locationMap['bottom']);
    }

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
    return merge({}, result, this.options.legend);
  }

  protected getToolboxOptions(): any {
    return merge(
      {},
      {
        show: false,
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
      },
      this.options.toolbox,
    );
  }

  protected getTextStyle(currentNodeOptions: any): any {
    const result: any = {};
    if (this.options.textColor) {
      result.color = this.options.textColor;
    }
    if (currentNodeOptions && currentNodeOptions.color) {
      result.color = currentNodeOptions.color;
    }
    return result;
  }
}
