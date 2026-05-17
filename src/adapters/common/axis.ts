import type { AxisOptions, XYChartOptions, XYData } from '../../types.js';
import { formatDateByPattern, DATE_STRING_RE } from './date-utils.js';
import { isAxisBound } from './shared.js';

export function buildXAxis(
  data: XYData,
  options: XYChartOptions,
  isTimeAxis: boolean,
): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.xAxis ?? {};

  const axis: Record<string, unknown> = {
    type: isTimeAxis ? 'time' : 'category',
    boundaryGap: !isTimeAxis,
    splitLine: { show: false },
    splitArea: { show: false },
  };

  if (!isTimeAxis) {
    axis.data = data.categories;
  }

  if (isAxisBound(userAxis.min)) axis.min = userAxis.min;
  if (isAxisBound(userAxis.max)) axis.max = userAxis.max;

  if (userAxis.name) {
    axis.name = userAxis.name;
    axis.nameLocation = 'center';
    axis.nameGap = 30;
  }

  if (userAxis.formatLabel) {
    const fn = userAxis.formatLabel;
    axis.axisLabel = {
      formatter: (value: string | number, index: number) => fn(value, index),
    };
  } else if (isTimeAxis && userAxis.dateFormat) {
    const fmt = userAxis.dateFormat;
    axis.axisLabel = {
      formatter: (value: number) => formatDateByPattern(new Date(value), fmt),
    };
  }

  if (isTimeAxis) {
    const cursorFmt = userAxis.cursorFormat ?? userAxis.dateFormat;
    if (cursorFmt) {
      const fmt = cursorFmt;
      axis.axisPointer = {
        label: {
          formatter: (params: { value: number }) =>
            formatDateByPattern(new Date(params.value), fmt),
        },
      };
    }
  }

  return [axis];
}

export function buildYAxis(options: XYChartOptions, count = 1): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.yAxis ?? {};
  const axes: Record<string, unknown>[] = [];

  for (let i = 0; i < count; i++) {
    const axis: Record<string, unknown> = {
      type: 'value',
      splitArea: { show: false },
      nameLocation: 'center',
      nameGap: 60,
    };

    if (i === 0 && isAxisBound(userAxis.min)) axis.min = userAxis.min;
    if (i === 0 && isAxisBound(userAxis.max)) axis.max = userAxis.max;

    if (i === 0 && userAxis.name) {
      axis.name = userAxis.name;
    }

    if (i === 0 && userAxis.formatLabel) {
      const fn = userAxis.formatLabel;
      axis.axisLabel = {
        formatter: (value: string | number, index: number) => fn(value, index),
      };
    }

    if (i > 0) {
      axis.alignTicks = true;
    }

    axes.push(axis);
  }

  return axes;
}

export function isTimeCategories(categories: (string | number)[]): boolean {
  if (categories.length === 0) return false;
  let hasRealTimestamp = false;
  const everyValid = categories.every((v) => {
    if (typeof v === 'number') {
      if (v === 0) return true;
      const abs = Math.abs(v);
      if (abs < 1e8) return false;
      if (abs >= 1e9) hasRealTimestamp = true;
      return true;
    }
    if (typeof v === 'string') {
      const ok = DATE_STRING_RE.test(v.trim());
      if (ok) hasRealTimestamp = true;
      return ok;
    }
    return false;
  });
  return everyValid && hasRealTimestamp;
}
