/* eslint-disable @typescript-eslint/no-explicit-any */
import { LegendItemContext, OnLegendContext } from '../../types';
import {
  getValueByIndex,
  mergeObjectsTo,
  setValueToObjectIfValueDefined,
} from '../../utils';
import { Chart } from '../core/chart';
import { PieChartData, PieChartOptions, PieVariant } from './types';

const percentOfDefaultOuterRadius = 75;
const defaultOuterRadius = `${percentOfDefaultOuterRadius}%`;

export class PieChart
  extends Chart<PieChartData, PieChartOptions>
  implements OnLegendContext
{
  static defaults: PieChartOptions = {
    variant: PieVariant.None,
    autoSort: true,
    legend: {
      show: false,
    },
    slice: {
      borderRadius: 4,
      gap: 1,
    },
    label: {
      show: true,
      percentToHide: undefined,
      highlight: false,
      position: 'outside',
    },
  };

  private _data: PietData = [];
  private _legendNames = new Set<string>();
  private _multipleSeries = false;

  iGetItemContext(name: string): LegendItemContext {
    const color = this.getColorByName(name);
    const result: LegendItemContext = {
      name,
      color: Array.isArray(color) ? color[0] : color,
      details: [],
    };
    this._data.forEach((series) => {
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

  protected getDefaultOptions(): PieChartOptions {
    return PieChart.defaults;
  }

  protected init(): void {
    this._data = [];
    console.log('type', this.options.variant);
    if (Array.isArray(this.data)) {
      console.log('type array', this.data);
      if (
        this.data.length > 0 &&
        'name' in this.data[0] &&
        'value' in this.data[0]
      ) {
        // format: [{name, value}, ...]
        this._data.push({
          name: getValueByIndex(this.allOptions.series, 0)?.name,
          items: this.data as { name: string; value: number }[],
        });
      } else {
        // format(nested): [{k1, k2, k3}, {}]
        this.data.forEach((d: any, idx) => {
          this._data.push({
            name: getValueByIndex(this.allOptions.series, idx)?.name,
            items: Object.keys(d).map((key) => ({
              name: key,
              value: d[key],
            })),
          });
        });
      }
    } else {
      // format: {}
      console.log('-----', this.data);
      this._data.push({
        name: getValueByIndex(this.allOptions.series, 0)?.name,
        items: Object.keys(this.data as object).map((key) => ({
          name: key,
          value: (this.data as any)[key],
        })),
      });
    }

    this._data.forEach((seriesList) => {
      const total = seriesList.items
        .map((item) => item.value)
        .reduce((total, cur) => total + cur, 0);
      seriesList.items.forEach((seriesItem) => {
        this._legendNames.add(seriesItem.name);
        seriesItem.iTotal = total;
        seriesItem.iPercent = (seriesItem.value * 100) / total;
        // hide the label if the value/percent less than the threshold
        if (
          this.options.label?.percentToHide &&
          seriesItem.iPercent < this.options.label?.percentToHide
        ) {
          seriesItem.label = { show: false };
        }
      });

      if (this.allOptions.autoSort) {
        seriesList.items.sort((a, b) => b.value - a.value);
      }
    });

    this._multipleSeries = this._data.length > 1;
  }

  protected getEOption(): any {
    const option: any = {
      series: this.getSeriesOptions(),
    };
    if (this.allOptions.legend?.show) {
      option.data = (Array.isArray(this.data) ? this.data : [this.data])
        .map((d) => Object.keys(d as object))
        .reduce((merged: any[], array: any[]) => (merged || []).concat(array));
      const area = this.getAreaWithoutLegend();

      option.series.forEach((s: any) => {
        mergeObjectsTo(s, area);
      });
    }

    return option;
  }

  protected getLegendNames(): string[] {
    return [...this._legendNames];
  }

  private getSeriesOptions(): any {
    const seriesList: any[] = [];
    const radiusList: Array<Array<string | number>> = [];
    const radiusStep = percentOfDefaultOuterRadius / this._data.length;

    this._data.forEach((seriesItem, idx) => {
      const isLastSeries = idx === this._data.length - 1;
      const data = seriesItem.items;
      if (idx === 0) {
        if (this._multipleSeries) {
          radiusList.push([0, `${radiusStep}%`]);
        } else {
          radiusList.push([
            this.allOptions.innerRadius || 0,
            this.allOptions.outerRadius || defaultOuterRadius,
          ]);
        }
      } else {
        // calculate the step of radius if more than one series
        if (this._multipleSeries) {
          radiusList.push([
            `${radiusStep * (idx + 1) - radiusStep / 2}%`,
            `${radiusStep * (idx + 1)}%`,
          ]);
        }
      }
      const series: any = {
        type: 'pie',
        name: seriesItem.name,
        radius: radiusList[idx],
        avoidLabelOverlap: true,
        label: {
          show: this._multipleSeries
            ? isLastSeries
            : this.allOptions.label?.show,
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
    setValueToObjectIfValueDefined(
      series,
      this.allOptions.slice?.gap,
      'padAngle',
    );
    if (this.allOptions.slice) {
      series.itemStyle = {};
      setValueToObjectIfValueDefined(
        series.itemStyle,
        this.allOptions.slice?.borderColor,
        'borderColor',
      );
      setValueToObjectIfValueDefined(
        series.itemStyle,
        this.allOptions.slice?.borderRadius,
        'borderRadius',
      );
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
