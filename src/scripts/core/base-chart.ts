/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import merge from 'lodash-es/merge';
import { ChartOptions, ChartTextColorOptions } from '../types';
export abstract class BaseChart<TOptions extends ChartOptions> {
  protected chart: any;
  protected options: TOptions;
  protected textColors: ChartTextColorOptions;

  constructor(dom: HTMLDivElement | HTMLCanvasElement, options: TOptions) {
    this.chart = echarts.init(dom);
    this.options = options;
    this.textColors = this.getTextColor();
  }

  dispose(): void {
    this.chart && this.chart.dispose();
  }

  protected abstract render(): void;

  protected getTitleOptions(): any {
    const result: any = {};
    const textColors = this.getTextColor();
    if (textColors.primary) {
      result.textStyle = {
        color: textColors.primary,
      };
    }
    if (textColors.secondary) {
      result.subtextStyle = {
        color: textColors.secondary,
      };
    }
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
    if (this.textColors.primary) {
      result.color = this.textColors.primary;
    }
    if (currentNodeOptions && currentNodeOptions.color) {
      result.color = currentNodeOptions.color;
    }
    return result;
  }

  private getTextColor(): ChartTextColorOptions {
    const result: ChartTextColorOptions = {};
    if (this.options.isDark) {
      result.primary = '#ffffff';
      result.secondary = '#cccccc';
    } else {
      result.primary = '#000000';
      result.secondary = '#666666';
    }
    if (this.options.textColor) {
      result.primary = this.options.textColor;
    }
    if (this.options.mutedTextColor) {
      result.secondary = this.options.mutedTextColor;
    }
    return result;
  }

  protected getColor(key: string, index: number): string {
    if (this.options.colors) {
      if (typeof this.options.colors === 'string') {
        return this.options.colors;
      } else if (Array.isArray(this.options.colors)) {
        if (this.options.colors.length > index) {
          return this.options.colors[index];
        }
      } else {
        return this.options.colors[key];
      }
    }

    return '';
  }
}
