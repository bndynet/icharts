/* eslint-disable @typescript-eslint/no-explicit-any */
import { LegendItemContext, OnLegendContext, Position } from '../../types';
import { Chart } from '../core/chart';
import { getValueByIndex, isUndefined, mergeObjects, setValueToObjectIfValueNotUndefined } from '../utils';
import { PieChartData, PieChartOptions, PieVariant } from './types';

const percentOfDefaultOuterRadius = 75;
const defaultOuterRadius = `${percentOfDefaultOuterRadius}%`;

export class PieChart extends Chart<PieChartData, PieChartOptions> implements OnLegendContext {
  static defaults: PieChartOptions = {
    variant: PieVariant.None,
    autoSort: true,
    legend: {
      show: false,
    },
    slice: {
      borderRadius: 4,
      borderWidth: 2,
    },
    label: {
      show: true,
      percentToHide: undefined,
      highlight: false,
      position: 'outside',
    },
  };

  private data: PietData = [];
  private legendNames = new Set<string>();
  private multipleSeries = false;

  constructor(
    protected dom: HTMLDivElement | HTMLCanvasElement,
    protected options: PieChartOptions,
  ) {
    super(dom, mergeObjects(PieChart.defaults, options));
    this.init();
  }

  iGetItemContext(name: string): LegendItemContext {
    const result: LegendItemContext = { name, color: this.getColorByName(name), details: [] };
    this.data.forEach((series) => {
      const sameLegendItem = series.items.find((si) => si.name === name);
      const item = {
        name: series.name || '',
        value: sameLegendItem?.value,
        percent: sameLegendItem?.iPercent,
        total: sameLegendItem?.iTotal,
      };
      result.details.push(item);
    });
    return result;
  }

  private init(): void {
    this.data = [];
    if (Array.isArray(this.allOptions.data)) {
      if (this.allOptions.data.length > 0 && 'name' in this.allOptions.data[0] && 'value' in this.allOptions.data[0]) {
        // format: [{name, value}, ...]
        this.data.push({
          name: getValueByIndex(this.allOptions.seriesNames, 0),
          items: this.allOptions.data as { name: string; value: number }[],
        });
      } else {
        // format(nested): [{k1, k2, k3}, {}]
        this.allOptions.data.forEach((d: any, idx) => {
          this.data.push({
            name: getValueByIndex(this.allOptions.seriesNames, idx),
            items: Object.keys(d).map((key) => ({
              name: key,
              value: d[key],
            })),
          });
        });
      }
    } else {
      // format: {}
      this.data.push({
        name: getValueByIndex(this.allOptions.seriesNames, 0),
        items: Object.keys(this.allOptions.data as object).map((key) => ({
          name: key,
          value: (this.allOptions.data as any)[key],
        })),
      });
    }

    this.data.forEach((seriesList) => {
      const total = seriesList.items.map((item) => item.value).reduce((total, cur) => total + cur, 0);
      seriesList.items.forEach((seriesItem) => {
        this.legendNames.add(seriesItem.name);
        seriesItem.iTotal = total;
        seriesItem.iPercent = (seriesItem.value * 100) / total;
        // hide the label if the value/percent less than the threshold
        if (this.options.label?.percentToHide && seriesItem.iPercent < this.options.label?.percentToHide) {
          seriesItem.label = { show: false };
        }
      });

      if (this.allOptions.autoSort) {
        seriesList.items.sort((a, b) => b.value - a.value);
      }
    });

    this.multipleSeries = this.data.length > 1;
  }

  protected getEOption(): any {
    const option: any = {
      series: this.getSeriesOptions(),
    };
    if (this.allOptions.legend?.show) {
      option.data = (Array.isArray(this.allOptions.data) ? this.allOptions.data : [this.allOptions.data]).map((d) => Object.keys(d as object)).reduce((merged: any[], array: any[]) => (merged || []).concat(array));
      let legendPosition = Position.Top;
      if (!isUndefined(this.allOptions.legend.top)) {
        legendPosition = Position.Top;
      } else if (!isUndefined(this.allOptions.legend.bottom)) {
        legendPosition = Position.Bottom;
      }
      if (!isUndefined(this.allOptions.legend.left)) {
        legendPosition = Position.Left;
      } else if (!isUndefined(this.allOptions.legend.right)) {
        legendPosition = Position.Right;
      }
      console.log(`🚀 ~ PieChart ~ getEOption ~ legendPosition:`, legendPosition);

      option.series.forEach((s: any) => {
        if (legendPosition === Position.Top && this.allOptions.legend?.height) {
          s.top = this.allOptions.legend.height;
        } else if (legendPosition === Position.Bottom && this.allOptions.legend?.height) {
          s.bottom = this.allOptions.legend.height;
        } else if (legendPosition === Position.Left && this.allOptions.legend?.width) {
          s.left = this.allOptions.legend.width;
        } else if (legendPosition === Position.Right && this.allOptions.legend?.width) {
          s.right = this.allOptions.legend.width;
        }
      });
    }

    return option;
  }

  protected getLegendNames(): string[] {
    return [...this.legendNames];
  }

  private getSeriesOptions(): any {
    const seriesList: any[] = [];
    const radiusList: Array<Array<string | number>> = [];
    const radiusStep = percentOfDefaultOuterRadius / this.data.length;

    this.data.forEach((seriesItem, idx) => {
      const isLastSeries = idx === this.data.length - 1;
      const data = seriesItem.items;
      if (idx === 0) {
        if (this.multipleSeries) {
          radiusList.push([0, `${radiusStep}%`]);
        } else {
          radiusList.push([this.allOptions.innerRadius || 0, this.allOptions.outerRadius || defaultOuterRadius]);
        }
      } else {
        // calculate the step of radius if more than one series
        if (this.multipleSeries) {
          radiusList.push([`${radiusStep * (idx + 1) - radiusStep / 2}%`, `${radiusStep * (idx + 1)}%`]);
        }
      }
      const series: any = {
        type: 'pie',
        name: seriesItem.name,
        radius: radiusList[idx],
        avoidLabelOverlap: true,
        label: {
          show: this.multipleSeries ? isLastSeries : this.allOptions.label?.show,
          position: this.allOptions.label?.position,
          formatter: '{b}: {d}%',
          textShadowColor: '#000',
          textShadowOffsetX: 1,
          textShadowOffsetY: 1,
        },
        data,
        itemStyle: {
          normal: {
            color: (params: any): string | null => {
              return null;
              // return getColor(params.data.name, params.dataIndex, this.options);
            },
          },
        },
      };

      this.setItemStyleForSeries(series);
      this.setTooltipForSeries(series);
      this.highlightLabelForSeries(series);

      this.setVariantForSeries(series);

      seriesList.push(series);
    });
    return seriesList;
  }

  private setItemStyleForSeries(series: any): void {
    if (this.allOptions.slice) {
      series.itemStyle = {};
      setValueToObjectIfValueNotUndefined(series.itemStyle, this.allOptions.slice?.borderColor, 'borderColor');
      setValueToObjectIfValueNotUndefined(series.itemStyle, this.allOptions.slice?.borderRadius, 'borderRadius');
      setValueToObjectIfValueNotUndefined(series.itemStyle, this.allOptions.slice?.borderWidth, 'borderWidth');
    }
  }

  private setTooltipForSeries(series: any): void {
    series.tooltip = this.options.tooltip ?? {};

    if (this.options.callbacks?.tooltip?.formatValue) {
      series.tooltip.valueFormatter = (value: number | string, dataIndex: number) => {
        return this.options.callbacks!.tooltip!.formatValue!(value, dataIndex);
      };
    }
    if (this.options.callbacks?.tooltip?.getContent) {
      series.tooltip.formatter = (params: any, ticket: string, callback: (ticket: string, html: string) => void) => {
        return this.options.callbacks!.tooltip!.getContent!(params, ticket, callback);
      };
    }
  }

  private setVariantForSeries(series: any): void {
    switch (this.allOptions.variant) {
      case PieVariant.Doughnut:
        series.radius[0] = '50%';
        break;

      case PieVariant.HalfDonut:
        series.startAngle = 180;
        series.endAngle = 360;
        series.center = ['50%', '80%'];
        series.radius[0] = '100%';
        if (!this.allOptions.outerRadius) {
          series.radius[1] = '130%';
        }
        break;

      case PieVariant.NightingaleRose:
        series.roseType = 'radius';
        series.radius[0] = 20;
        break;
    }
  }

  private highlightLabelForSeries(series: any): void {
    if (this.allOptions.label?.highlight) {
      // highlight the label when hover the slice
      // first to hide the label if it is center
      if (this.allOptions.label.position === 'center') {
        series.label.show = false;
      }
      series.emphasis = {
        label: {
          show: true,
          fontSize: this.allOptions.label.highlightFontSize,
          fontWeight: 'bold',
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      };
    }
  }
}

type SeriesItem = {
  name: string;
  value: number;
  label?: { show?: boolean };
  labelLine?: { show?: boolean };

  iPercent?: number;
  iTotal?: number;
};

type Series = {
  name?: string;
  items: SeriesItem[];
};

type PietData = Series[];