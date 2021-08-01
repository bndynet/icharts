/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as echarts from 'echarts/core';
import { defaultTheme, Theme, themes } from '../../themes';
import { ChartOptions, Icon, OnLegendContext, Orient, Position } from '../../types';
import { mergeObjects, mergeObjectsTo, setValueToObject } from '../utils';
import { defaults } from './chart.defaults';

export abstract class Chart<TData, TOptions extends ChartOptions<TData>> {
  static defaults = defaults;

  protected chart: any;
  protected theme: Theme;
  protected allOptions: TOptions;

  private colormap = new Map();
  private colors: string[];

  constructor(
    protected dom: HTMLDivElement | HTMLCanvasElement,
    protected options: TOptions,
  ) {
    this.allOptions = mergeObjects(Chart.defaults, this.processedOptions(), options);
    if (!this.allOptions.theme) {
      this.allOptions.theme = defaultTheme;
    }

    this.chart = echarts.init(dom, this.allOptions.theme);
    this.theme = themes[this.allOptions.theme];
    this.colors = (this.allOptions.colors ?? []).concat(this.theme.color);
  }

  render(): void {
    mergeObjectsTo(this.allOptions, this.getEOption());

    // set color for chart
    this.allOptions.color = this.getLegendNames()
      .map((name) => this.getColorByName(name))
      .filter((color) => color !== null);

    console.log(`🚀 ~ ${Chart.name} ~ option:`, this.allOptions);
    this.chart && this.chart.setOption(this.allOptions);
  }

  dispose(): void {
    this.chart && this.chart.dispose();
  }

  getContainerSize(): { width: number; height: number } {
    return {
      width: this.dom.getBoundingClientRect().width,
      height: this.dom.getBoundingClientRect().height,
    };
  }

  protected abstract getEOption(): any;

  protected abstract getLegendNames(): string[];

  private processedOptions(): ChartOptions<TData> {
    return {
      legend: this.getELegend(),
    };
  }

  protected getELegend(): any {
    const result: any = {};
    // set position
    const positionMap: { [key: string]: any } = {
      [Position.Left]: { top: 'center', left: 0, orient: Orient.Vertical },
      [Position.Right]: { top: 'center', right: 0, orient: Orient.Vertical },
      [Position.Top]: { top: 0, left: 'center', orient: Orient.Horizontal },
      [Position.TopLeft]: { top: 0, left: 0, orient: Orient.Horizontal },
      [Position.TopRight]: { top: 0, right: 0, orient: Orient.Horizontal },
      [Position.Bottom]: { bottom: 0, left: 'center', orient: Orient.Horizontal },
      [Position.BottomLeft]: { bottom: 0, left: 0, orient: Orient.Horizontal },
      [Position.BottomRight]: { bottom: 0, right: 0, orient: Orient.Horizontal },
    };

    if (this.options.legend && this.options.legend?.position) {
      mergeObjectsTo(result, positionMap[this.options.legend.position]);
    } else {
      mergeObjectsTo(result, positionMap['bottom']);
    }

    // set width
    if (this.options.legend?.width && !this.options.legend.textStyle?.width) {
      // minus the maker width if maker icon is shown
      const markerWidth = this.options.legend.icon === Icon.None ? 0 : 30;
      setValueToObject(result, this.options.legend.width - markerWidth, 'textStyle', 'width');
    }
    if (this.options.legend?.textStyle?.width || result.textStyle?.width) {
      setValueToObject(result, 'truncate', 'textStyle', 'overflow');
    }

    // callbacks
    if (this.options.callbacks?.legend?.formatLabel && !this.options.legend?.formatter) {
      result.formatter = (name: string) => {
        const context = (this as unknown as OnLegendContext).iGetItemContext(name);
        return this.options.callbacks?.legend?.formatLabel(context);
      };
    }

    return result;
  }

  protected getEToolbox(): any {
    return mergeObjects({
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
    });
  }

  protected getColorByName(name: string): string | null {
    if (this.colormap.has(name)) {
      return this.colormap.get(name);
    }

    if (this.allOptions.colormap && this.allOptions.colormap[name]) {
      this.colormap.set(name, this.allOptions.colormap[name]);
    } else {
      const usedColors = [...this.colormap.values()];
      const matchedColor = this.colors.find((c) => !usedColors.includes(c));
      if (matchedColor) {
        this.colormap.set(name, matchedColor);
      } else {
        // TODO: generate a random color if no enough colors.
      }
    }

    return this.colormap.get(name);
  }

  protected getETooltip(): any {
    const result = {};
    return result;
  }
}
