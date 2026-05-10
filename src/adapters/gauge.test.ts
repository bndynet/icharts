import { describe, it, expect } from 'vitest';
import type { GaugeData, GaugeChartOptions } from '../types.js';
import { resolveGaugeOptions } from './gauge.js';
import type { RenderContext } from './index.js';

const sample: GaugeData = { value: 72, max: 100, label: 'Score' };

const seriesOf = (
  r: ReturnType<typeof resolveGaugeOptions>,
): Record<string, unknown> =>
  (r.series as Record<string, unknown>[])[0];

const ringWidth = (r: ReturnType<typeof resolveGaugeOptions>): number => {
  const series = seriesOf(r);
  const axisLine = series.axisLine as { lineStyle: { width: number } };
  return axisLine.lineStyle.width;
};

const progressWidth = (r: ReturnType<typeof resolveGaugeOptions>): number => {
  const series = seriesOf(r);
  const progress = series.progress as { width: number };
  return progress.width;
};

const detailFontSize = (r: ReturnType<typeof resolveGaugeOptions>): number => {
  const series = seriesOf(r);
  const detail = series.detail as { fontSize: number };
  return detail.fontSize;
};

const titleFontSize = (r: ReturnType<typeof resolveGaugeOptions>): number => {
  const series = seriesOf(r);
  const title = series.title as { fontSize: number };
  return title.fontSize;
};

const ctx = (w: number, h: number): RenderContext => ({
  containerWidth: w,
  containerHeight: h,
});

describe('gauge adapter — percentage variant auto-sizing', () => {
  const baseOptions: GaugeChartOptions = { variant: 'percentage' };

  it('falls back to static defaults when no container dims are reported', () => {
    const result = resolveGaugeOptions(sample, baseOptions);
    expect(ringWidth(result)).toBe(20);
    expect(progressWidth(result)).toBe(20);
    expect(detailFontSize(result)).toBe(36);
    expect(titleFontSize(result)).toBe(14);
  });

  it('falls back when only one dimension is reported (defensive)', () => {
    // RenderContext zeros are coerced to undefined in core.ts, but guard
    // the adapter against partial ctx objects too — single missing
    // dimension means the engine can't render meaningfully.
    const result = resolveGaugeOptions(sample, baseOptions, {
      containerWidth: 400,
    });
    expect(ringWidth(result)).toBe(20);
    expect(detailFontSize(result)).toBe(36);
  });

  it('auto-sizes at the demo card dimensions (320x320)', () => {
    // 0.075 * 320 = 24, 0.135 * 320 = 43.2 → 43, 43 * 0.40 = 17.2 → 17
    const result = resolveGaugeOptions(sample, baseOptions, ctx(320, 320));
    expect(ringWidth(result)).toBe(24);
    expect(progressWidth(result)).toBe(24);
    expect(detailFontSize(result)).toBe(43);
    expect(titleFontSize(result)).toBe(17);
  });

  it('auto-sizes at small KPI tile dimensions (200x200)', () => {
    // 0.075 * 200 = 15, 0.135 * 200 = 27, 27 * 0.40 = 10.8 → 11
    const result = resolveGaugeOptions(sample, baseOptions, ctx(200, 200));
    expect(ringWidth(result)).toBe(15);
    expect(detailFontSize(result)).toBe(27);
    expect(titleFontSize(result)).toBe(11);
  });

  it('uses the shorter side when container is non-square', () => {
    // min(400, 240) = 240 → 0.075 * 240 = 18, 0.135 * 240 = 32.4 → 32
    const result = resolveGaugeOptions(sample, baseOptions, ctx(400, 240));
    expect(ringWidth(result)).toBe(18);
    expect(detailFontSize(result)).toBe(32);
  });

  it('clamps to lower bounds for tiny containers (100x100)', () => {
    // 0.075 * 100 = 7.5 → would round to 8, also clamp min 8
    // 0.135 * 100 = 13.5 → clamped to 18
    // 18 * 0.40 = 7.2 → clamped to 10
    const result = resolveGaugeOptions(sample, baseOptions, ctx(100, 100));
    expect(ringWidth(result)).toBe(8);
    expect(detailFontSize(result)).toBe(18);
    expect(titleFontSize(result)).toBe(10);
  });

  it('clamps to upper bounds for huge containers (800x800)', () => {
    // 0.075 * 800 = 60 → clamped to 36
    // 0.135 * 800 = 108 → clamped to 72
    // 72 * 0.40 = 28.8 → clamped to 28
    const result = resolveGaugeOptions(sample, baseOptions, ctx(800, 800));
    expect(ringWidth(result)).toBe(36);
    expect(detailFontSize(result)).toBe(72);
    expect(titleFontSize(result)).toBe(28);
  });

  it('honors explicit gaugeWidth — auto-sizer never overrides consumer', () => {
    const result = resolveGaugeOptions(
      sample,
      { variant: 'percentage', gaugeWidth: 12 },
      ctx(800, 800),
    );
    expect(ringWidth(result)).toBe(12);
    expect(progressWidth(result)).toBe(12);
    // Font sizes still auto-size — only gaugeWidth has a public knob.
    expect(detailFontSize(result)).toBe(72);
    expect(titleFontSize(result)).toBe(28);
  });

  it('propagates the auto-sized width to both axisLine and progress', () => {
    // Regression guard: the two pixel values must stay in lock-step
    // because a mismatch would render a ring that's offset from its
    // own progress fill.
    const result = resolveGaugeOptions(sample, baseOptions, ctx(320, 320));
    expect(ringWidth(result)).toBe(progressWidth(result));
  });

  it('places the (number + label) block as a single px-anchored stack around the ring center', () => {
    // 320² → detail 43 / title 17.
    // padding = 0.15 × (43 + 17) = 9.
    // em_gap = max(0, 12 − 9) = 3.
    // detail_y = -(3 + 17)/2 = -10.
    // title_y  =  (43 + 3)/2 =  23.
    const result = resolveGaugeOptions(sample, baseOptions, ctx(320, 320));
    const series = seriesOf(result);
    const detail = series.detail as { offsetCenter: [number, number] };
    const title = series.title as { offsetCenter: [number, number] };
    expect(detail.offsetCenter).toEqual([0, -10]);
    expect(title.offsetCenter).toEqual([0, 23]);
    // Em-box must straddle 0 symmetrically (this is what keeps the
    // block centered on the ring at every font size):
    const top = detail.offsetCenter[1] - 43 / 2;
    const bottom = title.offsetCenter[1] + 17 / 2;
    expect(top + bottom).toBeCloseTo(0, 1);
  });

  it('keeps the big number at exact center when no label is rendered', () => {
    const result = resolveGaugeOptions(
      { value: 72, max: 100 },
      baseOptions,
      ctx(320, 320),
    );
    const series = seriesOf(result);
    const detail = series.detail as { offsetCenter: [number, number] };
    const title = series.title as { show: boolean };
    expect(title.show).toBe(false);
    expect(detail.offsetCenter[1]).toBe(0);
  });

  it('uses the static fallback sizing when ctx is missing', () => {
    // Fallback detail 36 / title 14.
    // padding = 0.15 × 50 = 7.5.
    // em_gap = 12 − 7.5 = 4.5.
    // detail_y = -(4.5 + 14)/2 = -9.25 → -9.3.
    // title_y  =  (36 + 4.5)/2 =  20.25 → 20.3.
    const result = resolveGaugeOptions(sample, baseOptions);
    const series = seriesOf(result);
    const detail = series.detail as { offsetCenter: [number, number] };
    const title = series.title as { offsetCenter: [number, number] };
    expect(detail.offsetCenter[1]).toBe(-9.3);
    expect(title.offsetCenter[1]).toBe(20.3);
  });

  it('targets a constant 12 px visible glyph gap across container sizes (compensating typographic padding)', () => {
    // The visible glyph gap is the em-box gap *plus* ~0.15 em of
    // padding above the lower text and below the upper text (canvas
    // textBaseline 'middle' centers em-boxes on the offsetCenter, not
    // glyph centers). The adapter subtracts that padding from the
    // em-box gap so the visible gap lands on 12 px for the auto-sized
    // font range. For very large fonts the em-box gap clamps to 0
    // (padding alone already exceeds 12 px), so visible gap can grow
    // — but only as far as ~15 px in the 800² extreme, which still
    // reads as tight.
    const cases: Array<{
      dims: RenderContext;
      detailFs: number;
      titleFs: number;
      expectedVisibleGap: number;
    }> = [
      { dims: ctx(120, 120), detailFs: 18, titleFs: 10, expectedVisibleGap: 12 },
      { dims: ctx(200, 200), detailFs: 27, titleFs: 11, expectedVisibleGap: 12 },
      { dims: ctx(320, 320), detailFs: 43, titleFs: 17, expectedVisibleGap: 12 },
      { dims: ctx(800, 800), detailFs: 72, titleFs: 28, expectedVisibleGap: 15 },
    ];
    for (const { dims, detailFs, titleFs, expectedVisibleGap } of cases) {
      const result = resolveGaugeOptions(sample, baseOptions, dims);
      const series = seriesOf(result);
      const detail = series.detail as { offsetCenter: [number, number] };
      const title = series.title as { offsetCenter: [number, number] };
      const emBoxGap =
        title.offsetCenter[1] - detail.offsetCenter[1] - (detailFs + titleFs) / 2;
      const visibleGap = emBoxGap + 0.15 * (detailFs + titleFs);
      // ±0.5 px tolerance (precision 0) absorbs the 1-decimal rounding
      // applied to the resolved offsetCenter values.
      expect(visibleGap).toBeCloseTo(expectedVisibleGap, 0);
    }
  });
});

describe('gauge adapter — default variant is unaffected by container dims', () => {
  const baseOptions: GaugeChartOptions = { variant: 'default' };

  it('emits the static defaults regardless of ctx', () => {
    const small = resolveGaugeOptions(sample, baseOptions, ctx(100, 100));
    const large = resolveGaugeOptions(sample, baseOptions, ctx(800, 800));
    for (const result of [small, large]) {
      expect(ringWidth(result)).toBe(18);
      expect(detailFontSize(result)).toBe(28);
      expect(titleFontSize(result)).toBe(16);
    }
  });

  it('still honors explicit gaugeWidth on default variant', () => {
    const result = resolveGaugeOptions(
      sample,
      { variant: 'default', gaugeWidth: 30 },
      ctx(400, 400),
    );
    expect(ringWidth(result)).toBe(30);
    expect(progressWidth(result)).toBe(30);
  });
});
