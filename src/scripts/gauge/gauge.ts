import { getValueForCouldBeFunction } from '../../utils';
import { Chart } from '../core/chart';
import { GaugeChartData, GaugeChartOptions, GaugeChartVariant } from './types';

export class GaugeChart extends Chart<GaugeChartData, GaugeChartOptions> {
  static defaults: GaugeChartOptions = {
    primaryTextFontSize: 32,
    secondaryTextFontSize: 14,
    indicatorDivider: 5,
    indicatorWidth: 10,
    indicatorBackgroundColor: (chart: GaugeChart) =>
      chart.isDark ? '#3f3f46' : '#e2e8f0',
  };

  private autoOptions: GaugeChartOptions = {};

  private animationDuration = 1000;

  private indicatorOuterRadius: number = 0;
  private indicatorInnerRadius: number = 0;
  private pointerInnerRadius = 40;
  private panelOuterRadius: number = 0;
  private textBoxTopOffset = 0;
  private padding = 16;

  private maxRadius?: number;

  public setValue(value: number): void {
    let option2Update: any = {
      series: [
        {
          data: [value],
        },
      ],
    };
    if (this.options.indicatorBackgroundImage) {
      option2Update = {
        dataset: {
          source: [[1, value]],
        },
      };
    }
    this.chart?.setOption(option2Update);
  }

  protected init(): void {
    const { width, height } = this.getContainerSize();
    this.maxRadius = (width > height ? height : width) / 2 - this.padding;
  }

  protected getDefaultOptions(): GaugeChartOptions {
    return GaugeChart.defaults;
  }

  protected getEOption() {
    switch (this.options.variant) {
      case GaugeChartVariant.Percentage:
        return this.getEOptionForPercentageVariant();

      default:
        return this.getEOptionForDefaultVariant();
    }
  }

  protected getLegendNames(): string[] {
    return [];
  }

  private getEOptionForDefaultVariant(): any {
    const radius =
      this.maxRadius! + this.optionsWithDefaults.primaryTextFontSize!;
    const option = {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          center: ['50%', radius + this.padding],
          radius: radius,
          endAngle: 0,
          min: 0,
          max: this.data.maxValue,
          splitNumber: this.optionsWithAll.indicatorDivider,
          itemStyle: {
            color: this.optionsWithAll.colors![0],
            shadowColor: this.getBaseColor(0.3),
            shadowBlur: 10,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
          },
          progress: {
            show: true,
            roundCap: true,
            width: this.optionsWithAll.indicatorWidth,
          },
          pointer: {
            icon: 'path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z',
            length: '75%',
            width: this.optionsWithAll.indicatorWidth,
            offsetCenter: [0, '5%'],
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: this.optionsWithAll.indicatorWidth,
              color: [
                [
                  1,
                  getValueForCouldBeFunction(
                    this.optionsWithAll.indicatorBackgroundColor,
                    this,
                    this,
                  ),
                ],
              ],
            },
          },
          axisTick: {
            splitNumber: 2,
            lineStyle: {
              width: 2,
              color: '#999',
            },
          },
          splitLine: {
            length: 12,
            lineStyle: {
              width: 3,
              color: '#999',
            },
          },
          axisLabel: {
            distance: 30,
            color: '#999',
            fontSize: 12,
          },
          title: {
            show: false,
          },
          detail: {
            backgroundColor: getValueForCouldBeFunction(
              this.optionsWithAll.textBackgroundColor,
              this,
              this,
            ),
            borderColor: '#999',
            borderWidth: 0,
            width: '60%',
            lineHeight: this.optionsWithAll.primaryTextFontSize,
            height: this.optionsWithAll.primaryTextFontSize,
            borderRadius: (this.optionsWithAll.indicatorWidth ?? 16) / 2,
            offsetCenter: [
              0,
              this.optionsWithAll.primaryTextFontSize! + this.textBoxTopOffset,
            ],
            valueAnimation: true,
            formatter: (value: number) => {
              return `{value|${value.toFixed(0)}} {sText|${this.optionsWithAll.secondaryText ?? ''}}`;
            },
            rich: {
              value: {
                fontSize: this.optionsWithAll.primaryTextFontSize,
                fontWeight: 'bolder',
                color: getValueForCouldBeFunction(
                  this.optionsWithAll.primaryTextColor ??
                    this.theme.base.textColor,
                  this,
                  this,
                ),
              },
              sText: {
                fontSize: this.optionsWithAll.secondaryTextFontSize,
                color: getValueForCouldBeFunction(
                  this.optionsWithAll.secondaryTextColor ??
                    this.theme.base.textColorMuted,
                  this,
                  this,
                ),
                padding: [
                  0,
                  0,
                  (this.optionsWithAll.secondaryTextFontSize! -
                    this.optionsWithAll.primaryTextFontSize!) /
                    2,
                  this.textBoxTopOffset,
                ],
              },
            },
          },
          data: [
            {
              value: this.data.value,
            },
          ],
        },
      ],
    };
    return option;
  }

  private getEOptionForPercentageVariant(): any {
    this.indicatorOuterRadius = this.maxRadius!;
    this.indicatorInnerRadius = this.options.indicatorWidth
      ? this.indicatorOuterRadius - this.options.indicatorWidth
      : this.indicatorOuterRadius * 0.85;
    this.panelOuterRadius =
      this.indicatorInnerRadius -
      (this.indicatorOuterRadius - this.indicatorInnerRadius);
    this.pointerInnerRadius = this.panelOuterRadius;

    console.log(
      `🚀 ~ GaugeChart ~ getEOptionForPercentageVariant ~ indicatorOuterRadius:`,
      this.indicatorOuterRadius,
    );
    console.log(
      `🚀 ~ GaugeChart ~ getEOptionForPercentageVariant ~ indicatorInnerRadius:`,
      this.indicatorInnerRadius,
    );
    console.log(
      `🚀 ~ GaugeChart ~ getEOptionForPercentageVariant ~ panelOuterRadius:`,
      this.panelOuterRadius,
    );

    this.autoOptions.primaryTextFontSize = (this.panelOuterRadius * 2) / 3;
    this.autoOptions.secondaryTextFontSize =
      this.autoOptions.primaryTextFontSize / 2;

    if (!this.options.primaryTextFontSize) {
      this.optionsWithAll.primaryTextFontSize =
        this.autoOptions.primaryTextFontSize;
    }

    console.log('all', this.optionsWithAll);

    const eOption = {
      animationEasing: 'quarticInOut',
      animationDuration: this.animationDuration,
      animationDurationUpdate: this.animationDuration,
      animationEasingUpdate: 'quarticInOut',
      dataset: {
        source: [[1, this.data.value]],
      },
      tooltip: {},
      angleAxis: {
        type: 'value',
        startAngle: 0,
        show: false,
        min: 0,
        max: this.data.maxValue,
      },
      radiusAxis: {
        type: 'value',
        show: false,
      },
      polar: {},
      series: [
        this.options.indicatorBackgroundImage
          ? this.getSeriesForPercentageVariantWithImage()
          : this.getSeriesForPercentageVariantWithoutImage(),
      ],
    };
    return eOption;
  }

  private getSeriesForPercentageVariantWithoutImage(): any {
    const seriesProgress = {
      type: 'gauge',
      startAngle: 0,
      center: ['50%', '50%'],
      radius: this.indicatorOuterRadius,
      endAngle: 360,
      min: 0,
      max: this.data.maxValue,
      progress: {
        show: true,
        roundCap: true,
        width: this.optionsWithAll.indicatorWidth,
      },
      itemStyle: {
        color: this.optionsWithAll.colors![0],
        shadowColor: this.getBaseColor(0.3),
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
      },
      pointer: {
        show: false,
      },
      splitLine: {
        show: false,
        lineStyle: {
          width: this.optionsWithAll.indicatorWidth,
        },
      },
      axisLine: {
        roundCap: true,
        lineStyle: {
          width: this.optionsWithAll.indicatorWidth,
          color: [
            [
              1,
              getValueForCouldBeFunction(
                this.optionsWithAll.indicatorBackgroundColor,
                this,
                this,
              ),
            ],
          ],
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        show: false,
      },

      detail: {
        show: true,
        valueAnimation: true,
        width: '60%',
        lineHeight: 40,
        borderRadius: (this.optionsWithAll.indicatorWidth ?? 16) / 2,
        offsetCenter: [0, 0],
        fontSize: this.optionsWithAll.primaryTextFontSize,
        fontWeight: 'bolder',
        formatter: (value: number) =>
          `${Math.round((value * 100) / this.data.maxValue)}%`,
        color: 'inherit',
      },
      data: [
        {
          value: this.data.value,
        },
      ],
    };
    return seriesProgress;
  }

  private getSeriesForPercentageVariantWithImage(): any {
    const series = {
      type: 'custom',
      coordinateSystem: 'polar',
      renderItem: (p: any, a: any) =>
        this.renderItemForPercentageVariantWithImage(p, a),
    };
    return series;
  }

  // Percentage Variant
  private renderItemForPercentageVariantWithImage(params: any, api: any) {
    const valOnRadian = api.value(1);

    const item = {
      type: 'group',
      children: [
        // indicator
        ...this.getIndicatorItemsWithImage(params, api),
        // panel
        {
          type: 'circle',
          shape: {
            cx: params.coordSys.cx,
            cy: params.coordSys.cy,
            r: this.panelOuterRadius,
          },
          style: {
            fill: getValueForCouldBeFunction(
              this.optionsWithAll.textBackgroundColor ??
                this.theme.base.baseColor,
              this,
              this,
            ),
            shadowBlur: 25,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowColor: this.getBaseColor(0.5),
          },
        },
        // label
        {
          type: 'text',
          extra: {
            valOnRadian: valOnRadian,
            transition: 'valOnRadian',
            enterFrom: { valOnRadian: 0 },
          },
          style: {
            text: this.makeText(valOnRadian),
            fontSize: this.optionsWithAll.primaryTextFontSize,
            fontWeight: 700,
            x: params.coordSys.cx,
            y: params.coordSys.cy,
            fill: getValueForCouldBeFunction(
              this.optionsWithAll.primaryTextColor ?? this.theme.base.textColor,
              this,
              this,
            ),
            align: 'center',
            verticalAlign: 'middle',
            enterFrom: { opacity: 0 },
          },
          during: (apiDuring: any) => {
            apiDuring.setStyle(
              'text',
              this.makeText(apiDuring.getExtra('valOnRadian')),
            );
          },
        },
      ],
    };

    console.log('renderItem', item);

    return item;
  }

  private makePointerPoints(renderItemParams: any, polarEndRadian: any) {
    return [
      this.convertToPolarPoint(
        renderItemParams,
        this.indicatorOuterRadius,
        polarEndRadian,
      ),
      this.convertToPolarPoint(
        renderItemParams,
        this.indicatorOuterRadius,
        polarEndRadian + Math.PI * 0.03,
      ),
      this.convertToPolarPoint(
        renderItemParams,
        this.pointerInnerRadius,
        polarEndRadian,
      ),
    ];
  }

  private convertToPolarPoint(
    renderItemParams: any,
    radius: number,
    radian: number,
  ) {
    return [
      Math.cos(radian) * radius + renderItemParams.coordSys.cx,
      -Math.sin(radian) * radius + renderItemParams.coordSys.cy,
    ];
  }

  private makeText(valOnRadian: number) {
    // Validate additive animation calc.
    if (valOnRadian < -10) {
      console.error('illegal during val: ' + valOnRadian);
    }
    return ((valOnRadian / this.data.maxValue) * 100).toFixed(0) + '%';
  }

  private getIndicatorItemsWithImage(params: any, api: any): any {
    const valOnRadian = api.value(1);
    const coords = api.coord([api.value(0), valOnRadian]);
    const polarEndRadian = coords[3];

    const indicatorImageStyle = {
      image: this.options.indicatorBackgroundImage,
      x: params.coordSys.cx - this.indicatorOuterRadius,
      y: params.coordSys.cy - this.indicatorOuterRadius,
      width: this.indicatorOuterRadius * 2,
      height: this.indicatorOuterRadius * 2,
    };

    const groupChildrenWithIndicatorImage = [
      {
        type: 'image',
        style: indicatorImageStyle,
        clipPath: {
          type: 'sector',
          shape: {
            cx: params.coordSys.cx,
            cy: params.coordSys.cy,
            r: this.indicatorOuterRadius,
            r0: this.indicatorInnerRadius,
            startAngle: 0,
            endAngle: -polarEndRadian,
            transition: 'endAngle',
            enterFrom: { endAngle: 0 },
          },
        },
      },
      {
        type: 'image',
        style: indicatorImageStyle,
        clipPath: {
          type: 'polygon',
          shape: {
            points: this.makePointerPoints(params, polarEndRadian),
          },
          extra: {
            polarEndRadian: polarEndRadian,
            transition: 'polarEndRadian',
            enterFrom: { polarEndRadian: 0 },
          },
          during: (apiDuring: any) => {
            apiDuring.setShape(
              'points',
              this.makePointerPoints(
                params,
                apiDuring.getExtra('polarEndRadian'),
              ),
            );
          },
        },
      },
    ];

    return groupChildrenWithIndicatorImage;
  }
}
