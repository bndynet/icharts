import { chart, ChartType } from '..';
import { ChartData, ChartOptions } from '../../types';
import { Chart } from '../core';

enum AttributeName {
  type = 'type',
  data = 'data',
  options = 'options',
}

export class ChartComponent extends HTMLElement {
  static observedAttributes = Object.keys(AttributeName);

  private chartContainer?: HTMLDivElement;
  private chartType?: ChartType;
  private chartData?: ChartData;
  private chartOptions?: ChartOptions<any>;
  private iChart?: Chart;

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  attributeChangedCallback(
    attrName: string,
    oldValue: string,
    newValue: string,
  ) {
    switch (attrName) {
      case AttributeName.type:
        this.chartType = newValue as ChartType;
        break;
      case AttributeName.data:
        if (newValue) {
          this.chartData = JSON.parse(newValue);
        }
        break;
      case AttributeName.options:
        if (newValue) {
          this.chartOptions = JSON.parse(newValue);
        }
        break;
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.renderChart();
    }, 50);
  }

  connectedCallback() {
    this.style.display = 'block';
    this.style.height = '100%';
  }

  disconnectedCallback() {
    this.iChart?.dispose();
  }

  private renderChart(): void {
    if (!this.chartContainer) {
      this.chartContainer = document.createElement('div');
      this.chartContainer.style.width = '100%';
      this.chartContainer.style.height = '100%';
      this.shadowRoot?.appendChild(this.chartContainer);
    }

    this.iChart?.dispose();

    if (this.chartType && this.chartData) {
      this.iChart = chart(
        this.chartContainer,
        this.chartType,
        this.chartData,
        this.chartOptions,
      );
      this.iChart.render();
    }
  }
}

customElements.define('i-chart', ChartComponent);
