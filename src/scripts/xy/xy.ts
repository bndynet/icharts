import { IChartAxis, ISeries } from '../../types';
import {
  appendValueToObject,
  getLinearGradientColor,
  mergeObjects,
  mergeObjectsTo,
  setDefaultValueToObject,
  setValueToObject,
  setValueToObjectIfValueDefined,
} from '../../utils';
import { Chart } from '../core/chart';
import { XYChartData, XYChartOptions, XYChartVariant } from './types';

const defaultBarRadius = 0;

export class XYChart extends Chart<XYChartData, XYChartOptions> {
  static defaults = {
    legend: {
      show: true,
    },
  };

  private legendNames: string[] = [];
  private categoryValues?: Array<string | number>;
  private categoryIsTimestamp = false;
  private valueAxesCount = 1;

  protected getDefaultOptions(): XYChartOptions {
    return XYChart.defaults;
  }

  protected init(): void {
    this.legendNames = [
      ...new Set(
        this.data
          ?.map((item) => Object.keys(item))
          .flat()
          .filter(
            (name) => name !== this.options.dataKey && !!name,
          ) as string[],
      ),
    ];
    if (this.options.dataKey) {
      this.categoryValues = this.data?.map(
        (item) => item[this.options.dataKey!] as string,
      );
      this.categoryIsTimestamp =
        this.categoryValues?.every(
          (v) =>
            typeof v === 'number' &&
            (v.toString().length === 13 || v.toString().length === 10),
        ) ?? false;
    }
  }

  protected getEOption() {
    const eOption = {
      xAxis: mergeObjectsTo(
        [
          {
            type: this.categoryIsTimestamp ? 'time' : 'category',
            boundaryGap: this.hasBar(),
            splitLine: {
              show: false,
            },
            splitArea: {
              show: false,
            },
            data: this.categoryValues,
          },
        ],
        this.options.xAxis,
      ),
      yAxis: mergeObjectsTo(
        [
          {
            type: 'value',
            splitArea: {
              show: false,
            },
            nameLocation: 'center',
            nameGap: 60, // default gap between axis name and axis line.
          },
        ],
        this.options.yAxis,
      ),
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: this.hasBar() ? 'shadow' : 'cross',
        },
      },
      legend: {
        data: this.legendNames,
      },
      series: this.getSeries(),
    };

    // when yAxis has name(title)
    if (eOption.yAxis[0].name) {
      // eOption.grid.left = 40;
    }
    if (eOption.yAxis.length > 1 && eOption.yAxis[1].name) {
      // eOption.grid.right = 40;
    }
    // multiple value axes
    for (
      let valueAxisIndex = 0;
      valueAxisIndex < this.valueAxesCount;
      valueAxisIndex++
    ) {
      if (eOption.yAxis.length - 1 < valueAxisIndex) {
        eOption.yAxis.push({
          alignTicks: true,
          type: 'value',
        });
      }
    }

    eOption.xAxis.forEach((axis: any, idx: number) => {
      const ad =
        (this.options.xAxis?.length || -1) > idx
          ? this.options.xAxis?.[idx]
          : undefined;
      this.setAxis(axis, ad);
    });
    eOption.yAxis.forEach((axis: any, idx: number) => {
      const ad =
        (this.options.yAxis?.length || -1) > idx
          ? this.options.yAxis?.[idx]
          : undefined;
      this.setAxis(axis, ad);
    });

    switch (this.options.variant) {
      case XYChartVariant.HorizontalBar:
        // exchange the x axis and y axis
        const xa = eOption.xAxis;
        eOption.xAxis = eOption.yAxis;
        eOption.yAxis = xa;
        // resort from top to bottom
        eOption.yAxis.forEach((axis: any) => {
          axis.data.reverse();
        });
        eOption.series.forEach((series: any) => {
          series.data.reverse();
        });
        break;

      case XYChartVariant.SparkLine:
      case XYChartVariant.SparkBar:
        eOption.xAxis.forEach((axis: any) => {
          setValueToObject(axis, false, 'show');
        });
        eOption.yAxis.forEach((axis: any) => {
          setValueToObject(axis, false, 'show');
        });
        eOption.series.forEach((series) => {
          setValueToObject(series, 0, 'symbolSize');
        });
        setValueToObject(eOption.legend, false, 'show');
        setValueToObject(eOption.tooltip, 'none', 'axisPointer', 'type');
        setValueToObject(eOption, 0, 'grid', 'top');
        setValueToObject(eOption, 0, 'grid', 'right');
        setValueToObject(eOption, 0, 'grid', 'bottom');
        setValueToObject(eOption, 0, 'grid', 'left');
        setValueToObject(eOption, false, 'grid', 'containLabel');
        if (this.options.variant === XYChartVariant.SparkBar) {
          eOption.series.forEach((series) => {
            series.type = 'bar';
          });
        }
        break;
    }

    return eOption;
  }

  protected getLegendNames(): string[] {
    return this.legendNames;
  }

  private getSeries(): Array<any> {
    const seriesList: any = [];
    const defaultSeriesOptions = this.options.series?.find(
      (s) => s.name === '*',
    );

    this.legendNames.forEach((name) => {
      const seriesOptions: ISeries = mergeObjects(
        defaultSeriesOptions,
        this.options.series?.find((s) => s.name === name) || {},
      );

      const series: any = {
        name,
        type: seriesOptions?.type ?? 'line',
        data: this.data?.map((item, idx) => {
          if (this.categoryIsTimestamp) {
            return [this.categoryValues![idx], item[name]]; // [timestamp, value]
          }
          return item[name];
        }),
      };

      // disable the symbol (point)
      if (this.categoryIsTimestamp) {
        setValueToObject(series, 'none', 'symbol');
      }

      // value axis index
      if (seriesOptions.valueAxisIndex) {
        setValueToObjectIfValueDefined(
          series,
          seriesOptions.valueAxisIndex,
          'yAxisIndex',
        );
        if (seriesOptions.valueAxisIndex > this.valueAxesCount - 1) {
          this.valueAxesCount = seriesOptions.valueAxisIndex + 1;
        }
      }

      // series label
      setValueToObjectIfValueDefined(
        series,
        seriesOptions.showLabel,
        'label',
        'show',
      );
      setValueToObjectIfValueDefined(
        series,
        seriesOptions.labelPosition,
        'label',
        'position',
      );
      // line style
      setValueToObjectIfValueDefined(
        series,
        seriesOptions.lineType,
        'lineStyle',
        'type',
      );
      setValueToObjectIfValueDefined(
        series,
        this.options.lineWidth,
        'lineStyle',
        'width',
      );
      setValueToObjectIfValueDefined(
        series,
        seriesOptions.lineWidth,
        'lineStyle',
        'width',
      );

      // markLine
      if (seriesOptions.showAverageLine) {
        appendValueToObject(
          series,
          { type: 'average', name: 'Avg' },
          'markLine',
          'data',
        );
      }
      if (seriesOptions.showMaxLine) {
        appendValueToObject(
          series,
          { type: 'max', name: 'Max' },
          'markLine',
          'data',
        );
      }
      if (seriesOptions.showMinLine) {
        appendValueToObject(
          series,
          { type: 'min', name: 'Min' },
          'markLine',
          'data',
        );
      }

      //markPoint
      if (seriesOptions.showMaxBubble) {
        appendValueToObject(
          series,
          { type: 'max', name: 'Max' },
          'markPoint',
          'data',
        );
      }
      if (seriesOptions.showMinBubble) {
        appendValueToObject(
          series,
          { type: 'min', name: 'Min' },
          'markPoint',
          'data',
        );
      }

      setValueToObjectIfValueDefined(
        series,
        seriesOptions.lineSmooth,
        'smooth',
      );
      setValueToObjectIfValueDefined(
        series,
        seriesOptions.showPoint,
        'showSymbol',
      );

      switch (this.options.variant) {
        case XYChartVariant.Bar:
          series.type = 'bar';
          setDefaultValueToObject(
            series,
            seriesOptions.labelPosition,
            'outside',
            'label',
            'position',
          );
          setValueToObjectIfValueDefined(
            series,
            this.options.barWidth,
            'barWidth',
          );
          setValueToObjectIfValueDefined(
            series,
            this.options.barMaxWidth,
            'barMaxWidth',
          );
          break;
        case XYChartVariant.Area:
          series.areaStyle = {
            opacity: 0.8,
          };
          break;
        case XYChartVariant.HorizontalBar:
        case XYChartVariant.SparkBar:
          series.type = 'bar';
          break;
      }
      if (this.options.stacked) {
        series.stack = 'Total';
        // highlight the series when hover
        // series.emphasis = {
        //   focus: 'series',
        // };
      }

      const color = this.getColorByName(name);

      if (Array.isArray(color)) {
        // set linear gradient color
        if (series.type === 'bar') {
          series.itemStyle = {
            opacity: 0.8,
            color: getLinearGradientColor(
              color,
              seriesOptions.colorStart,
              seriesOptions.colorEnd,
            ),
          };
        } else {
          series.areaStyle = {
            opacity: 0.8,
            color: getLinearGradientColor(
              color,
              seriesOptions.colorStart,
              seriesOptions.colorEnd,
            ),
          };
        }
      }

      seriesList.push(series);
    });

    if (
      this.options.variant === XYChartVariant.Bar ||
      this.options.variant === XYChartVariant.HorizontalBar
    ) {
      if (this.options.stacked) {
        this.radiusSeriesForStacked(seriesList);
      } else {
        this.radiusSeriesForNonStacked(seriesList);
      }
    }

    return seriesList;
  }

  private radiusSeriesForNonStacked(series: Array<any>): void {
    series.forEach((s) => {
      const seriesData = [...s.data];
      s.data = [];
      seriesData.forEach((v) => {
        s.data.push({
          itemStyle: {
            borderRadius:
              this.options.variant === XYChartVariant.Bar
                ? [
                    this.options.barRadius || defaultBarRadius,
                    this.options.barRadius || defaultBarRadius,
                    0,
                    0,
                  ]
                : this.options.variant === XYChartVariant.HorizontalBar
                  ? [
                      0,
                      this.options.barRadius || defaultBarRadius,
                      this.options.barRadius || defaultBarRadius,
                      0,
                    ]
                  : [0, 0, 0, 0],
          },
          value: v,
        });
      });
    });
  }

  private radiusSeriesForStacked(series: Array<any>): void {
    const stackInfo: {
      [key: string]: { stackStart: number[]; stackEnd: number[] };
    } = {};
    for (let i = 0; i < series[0].data.length; ++i) {
      for (let j = 0; j < series.length; ++j) {
        const stackName = series[j].stack;
        if (!stackName) {
          continue;
        }
        if (!stackInfo[stackName]) {
          stackInfo[stackName] = {
            stackStart: [],
            stackEnd: [],
          };
        }
        const info = stackInfo[stackName];
        const data = series[j].data[i];
        if (data && data !== '-') {
          if (info.stackStart[i] == null) {
            info.stackStart[i] = j;
          }
          info.stackEnd[i] = j;
        }
      }
    }
    for (let i = 0; i < series.length; ++i) {
      const data = series[i].data as
        | number[]
        | { value: number; itemStyle: object }[];
      const info = stackInfo[series[i].stack];
      for (let j = 0; j < series[i].data.length; ++j) {
        // const isStart = info.stackStart[j] === i;
        const isEnd = info.stackEnd[j] === i;
        const topBorder = isEnd
          ? this.options.barRadius || defaultBarRadius
          : 0;
        const bottomBorder = 0;
        data[j] = {
          value: data[j] as number,
          itemStyle: {
            borderRadius:
              this.options.variant === XYChartVariant.Bar
                ? [topBorder, topBorder, bottomBorder, bottomBorder]
                : this.options.variant === XYChartVariant.HorizontalBar
                  ? [0, topBorder, topBorder, 0]
                  : [0, 0, 0, 0],
          },
        };
      }
    }
  }

  private setAxis(eAxis: any, axisOptions?: IChartAxis): void {
    if (eAxis.type === 'time' && this.categoryIsTimestamp) {
      // Time axis does not need the data as the timestamp will be in the series data
      // For example: [[timestamp, value], ...]
      eAxis.data = undefined;
      if (this.options.callbacks?.formatTime) {
        setValueToObject(
          eAxis,
          (value: number, idx: number) =>
            this.options.callbacks?.formatTime!(value, idx),
          'axisLabel',
          'formatter',
        );
      }
    }
    if (axisOptions) {
      if (
        axisOptions.formatLabel &&
        typeof axisOptions.formatLabel === 'function'
      ) {
        setValueToObject(
          eAxis,
          (value: string | number, idx: number) => {
            return axisOptions.formatLabel?.(value, idx);
          },
          'axisLabel',
          'formatter',
        );
      }

      setValueToObjectIfValueDefined(
        eAxis,
        axisOptions.showAxisLine,
        'axisLine',
        'show',
      );
      if (axisOptions.showAxisLine === false) {
        setValueToObject(eAxis, false, 'axisTick', 'show');
      }
    }
  }

  private hasBar(): boolean {
    return (
      (!!this.options.variant &&
        [
          XYChartVariant.Bar,
          XYChartVariant.HorizontalBar,
          XYChartVariant.SparkBar,
        ].includes(this.options.variant)) ||
      !!this.options.series?.find((s) => s.type === 'bar')
    );
  }
}
