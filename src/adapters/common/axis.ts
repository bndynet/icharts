import type { AxisOptions, XYChartOptions, XYData } from '../../types.js';
import { formatDateByPattern, DATE_STRING_RE } from './date-utils.js';
import {
  type CompiledRichText,
  mergeCompiledRichStyles,
  safeFormatAxisLabel,
} from './rich-text.js';
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
  if (userAxis.show !== undefined) {
    axis.show = userAxis.show;
  }

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

  applyAxisLabel(
    axis,
    userAxis,
    isTimeAxis,
    isTimeAxis ? undefined : data.categories,
    'xaxis',
  );

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

/**
 * Build the y-axis (or axes when `count > 1` for dual-axis charts).
 *
 * When `categoryValues` is supplied the **first** axis becomes a category
 * axis with `data: categoryValues` — used by horizontal-bar / bar-race for
 * the racer / category labels on the left edge. Without it the axes default
 * to `type: 'value'`. Per-axis `min` / `max` / `name` / `formatLabel` /
 * `show` are sourced from `options.yAxis` and applied to the first axis only
 * (axes 1+ get `alignTicks: true` and inherit the rest from ECharts).
 */
export function buildYAxis(
  options: XYChartOptions,
  count = 1,
  categoryValues?: ReadonlyArray<string | number>,
): Record<string, unknown>[] {
  const userAxis: AxisOptions = options.yAxis ?? {};
  const axes: Record<string, unknown>[] = [];
  const isCategory = categoryValues !== undefined;

  for (let i = 0; i < count; i++) {
    const axis: Record<string, unknown> = {
      type: isCategory && i === 0 ? 'category' : 'value',
      splitArea: { show: false },
      nameLocation: 'center',
      nameGap: 60,
    };
    if (i === 0 && isCategory) {
      axis.data = categoryValues;
    }
    if (i === 0 && userAxis.show !== undefined) {
      axis.show = userAxis.show;
    }

    if (i === 0 && !isCategory && isAxisBound(userAxis.min)) axis.min = userAxis.min;
    if (i === 0 && !isCategory && isAxisBound(userAxis.max)) axis.max = userAxis.max;

    if (i === 0 && userAxis.name) {
      axis.name = userAxis.name;
    }

    if (i === 0) {
      applyAxisLabel(
        axis,
        userAxis,
        false,
        isCategory ? categoryValues : undefined,
        'yaxis',
      );
    }

    if (i > 0) {
      axis.alignTicks = true;
    }

    axes.push(axis);
  }

  return axes;
}

/**
 * Wires `userAxis.formatLabel` (and time-axis `dateFormat`) into the given
 * ECharts axis literal.
 *
 * **RichTextSpec support is gated on knowing the tick set upfront.**
 * - `categoryValues` provided → pre-compile each value's `formatLabel` output
 *   so the per-segment styles can be merged into `axisLabel.rich`. ECharts
 *   only renders `{key|text}` markup when the matching key is registered,
 *   which is impossible at runtime (no setOption hook from the formatter).
 *   Pre-computing is the only reliable path.
 * - `categoryValues` omitted (value / time axis) → the user's function is
 *   still called per tick, but RichTextSpec returns are flattened to plain
 *   text (`compileRichText(...).plainText`). Plain string returns work
 *   everywhere. This is documented on `AxisOptions.formatLabel`.
 *
 * Falls back to a raw `dateFormat` formatter when no `formatLabel` is set
 * AND the axis is a time axis. Mutates `axis` in place; no return.
 *
 * Exposed so adapters that hand-author category-axis literals (bar race
 * y-axis, bar horizontal y-axis) can wire RichText support without
 * duplicating the compilation pipeline.
 */
export function applyAxisLabel(
  axis: Record<string, unknown>,
  userAxis: AxisOptions,
  isTimeAxis: boolean,
  categoryValues: ReadonlyArray<string | number> | undefined,
  keyPrefix: string,
): void {
  const existing = (axis.axisLabel as Record<string, unknown> | undefined) ?? {};

  if (userAxis.formatLabel) {
    const fn = userAxis.formatLabel;
    if (categoryValues !== undefined) {
      const compiled: CompiledRichText[] = categoryValues.map((v, i) =>
        safeFormatAxisLabel(fn, v, i, `${keyPrefix}_${i}`),
      );
      const rich = mergeCompiledRichStyles(compiled);
      // Index by value (string-keyed since ECharts forwards the raw category
      // value as `value`). Duplicate categories: keep the first index, like
      // legend's safeFormatLegendLabel — same defensive contract.
      const valueIndex = new Map<string, number>();
      categoryValues.forEach((v, i) => {
        const key = String(v);
        if (!valueIndex.has(key)) valueIndex.set(key, i);
      });
      const richBlock =
        Object.keys(rich).length > 0 ? { rich } : undefined;
      axis.axisLabel = {
        ...existing,
        formatter: (value: string | number, idx: number): string => {
          const i = valueIndex.get(String(value));
          if (i !== undefined) return compiled[i].text;
          return safeFormatAxisLabel(fn, value, idx, `${keyPrefix}_fallback`).text;
        },
        ...(richBlock ?? {}),
      };
      return;
    }
    axis.axisLabel = {
      ...existing,
      formatter: (value: string | number, idx: number): string =>
        safeFormatAxisLabel(fn, value, idx, `${keyPrefix}_v`).plainText,
    };
    return;
  }

  if (isTimeAxis && userAxis.dateFormat) {
    const fmt = userAxis.dateFormat;
    axis.axisLabel = {
      ...existing,
      formatter: (value: number): string =>
        formatDateByPattern(new Date(value), fmt),
    };
  }
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
