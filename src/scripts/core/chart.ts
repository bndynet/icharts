/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as echarts from 'echarts/core';
import { defaultTheme, isDarkTheme, themes } from '../../themes';
import { lightTheme } from '../../themes/light';
import {
  ChartData,
  ChartOptions,
  Icon,
  OnLegendContext,
  Orient,
  Position,
  TopRightBottomLeft,
} from '../../types';
import {
  isNumber,
  mergeObjects,
  mergeObjectsTo,
  setValueToObject,
} from '../../utils';
import { defaults } from './chart.defaults';

export abstract class Chart<
  TData = ChartData,
  TOptions extends ChartOptions<TData> = ChartOptions<TData>,
> {
  static defaults = defaults;

  get isDark(): boolean {
    return isDarkTheme(this.options.theme);
  }

  private chart: any;
  private theme: typeof lightTheme;
  protected allOptions: TOptions;

  private colormap = new Map();
  private colors: string[];

  constructor(
    protected dom: HTMLDivElement | HTMLCanvasElement,
    protected data: TData,
    protected options: TOptions = {} as TOptions,
  ) {
    this.allOptions = mergeObjects(
      Chart.defaults,
      this.getDefaultOptions(),
      this.processedOptions(),
      options,
    );
    if (!this.allOptions.theme) {
      this.allOptions.theme = defaultTheme;
    }

    this.chart = echarts.init(dom, this.allOptions.theme);
    this.theme = themes[this.allOptions.theme];
    console.log(`🚀 ~ Chart<TData ~ theme:`, this.theme);
    this.colors = (this.allOptions.colors ?? []).concat(this.theme.color || []);
  }

  render(): void {
    this.init();
    mergeObjectsTo(this.allOptions, this.getCommonEOption(), this.getEOption());

    // set color for chart
    this.allOptions.color = this.getLegendNames()
      .map((name) => this.getColorByName(name))
      .filter((color) => color !== null)
      .map((color) => (Array.isArray(color) ? color[0] : color));

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

  protected abstract init(): void;

  protected abstract getDefaultOptions(): TOptions;

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
      [Position.Bottom]: {
        bottom: 0,
        left: 'center',
        orient: Orient.Horizontal,
      },
      [Position.BottomLeft]: { bottom: 0, left: 0, orient: Orient.Horizontal },
      [Position.BottomRight]: {
        bottom: 0,
        right: 0,
        orient: Orient.Horizontal,
      },
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
      setValueToObject(
        result,
        this.options.legend.width - markerWidth,
        'textStyle',
        'width',
      );
    }
    if (this.options.legend?.textStyle?.width || result.textStyle?.width) {
      setValueToObject(result, 'truncate', 'textStyle', 'overflow');
    }

    // callbacks
    if (
      this.options.callbacks?.legend?.formatLabel &&
      !this.options.legend?.formatter
    ) {
      result.formatter = (name: string) => {
        const context = (this as unknown as OnLegendContext).iGetItemContext(
          name,
        );
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

  protected getColorByName(name: string): string | string[] | null {
    if (this.colormap.has(name)) {
      return this.colormap.get(name);
    }

    if (this.allOptions.colormap && this.allOptions.colormap[name]) {
      const value =
        typeof this.allOptions.colormap[name] === 'function'
          ? this.allOptions.colormap[name].call(this, this.options)
          : this.allOptions.colormap[name];
      this.colormap.set(name, value);
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

  protected getAreaWithoutLegend(): TopRightBottomLeft {
    const result: TopRightBottomLeft = {};

    if (this.allOptions.legend?.show) {
      // check legend position
      let legendPosition = Position.Top;
      if (isNumber(this.allOptions.legend.top)) {
        legendPosition = Position.Top;
      } else if (isNumber(this.allOptions.legend.bottom)) {
        legendPosition = Position.Bottom;
      }
      if (isNumber(this.allOptions.legend.left)) {
        legendPosition = Position.Left;
      } else if (isNumber(this.allOptions.legend.right)) {
        legendPosition = Position.Right;
      }

      const defaultHeight = 40;
      // set area
      if (legendPosition === Position.Top) {
        result.top = this.allOptions.legend?.height ?? defaultHeight;
      } else if (legendPosition === Position.Bottom) {
        result.bottom = this.allOptions.legend?.height ?? defaultHeight;
      } else if (
        legendPosition === Position.Left &&
        this.allOptions.legend?.width
      ) {
        result.left = this.allOptions.legend.width;
      } else if (
        legendPosition === Position.Right &&
        this.allOptions.legend?.width
      ) {
        result.right = this.allOptions.legend.width;
      }
    }

    return result;
  }

  protected setTooltipForSeries(series: any): void {
    series.tooltip = this.options.tooltip ?? {};

    if (this.options.callbacks?.tooltip?.formatValue) {
      series.tooltip.valueFormatter = (
        value: number | string,
        dataIndex: number,
      ) => {
        return this.options.callbacks!.tooltip!.formatValue!(value, dataIndex);
      };
    }
    if (this.options.callbacks?.tooltip?.getContent) {
      series.tooltip.formatter = (
        params: any,
        ticket: string,
        callback: (ticket: string, html: string) => void,
      ) => {
        return this.options.callbacks!.tooltip!.getContent!(
          params,
          ticket,
          callback,
        );
      };
    }
  }

  private getCommonEOption(): any {
    const commonEOption = {
      grid: mergeObjects(this.getAreaWithoutLegend(), this.options.grid),
    };

    console.log(
      `🚀 ~ Chart<TData ~ getCommonEOption ~ commonEOption:`,
      commonEOption,
    );
    return commonEOption;
  }
}
