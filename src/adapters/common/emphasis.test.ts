import { describe, it, expect } from 'vitest';
import { buildEmphasisBlur, DEFAULT_BLUR_OPACITY } from './emphasis.js';
import { resolveLineOptions, resolveAreaOptions } from '../line.js';
import { resolveBarOptions } from '../bar.js';
import { resolvePieOptions } from '../pie.js';
import { resolveRadarOptions } from '../radar.js';
import type { XYData, PieData, RadarData } from '../../types.js';

const xy: XYData = {
  categories: ['Q1', 'Q2', 'Q3'],
  series: [
    { name: 'Premium', data: [10, 12, 14] },
    { name: 'Pro', data: [6, 7, 8] },
  ],
};

const pie: PieData = [
  { name: 'Premium', value: 40 },
  { name: 'Pro', value: 30 },
  { name: 'Basic', value: 20 },
];

const radar: RadarData = {
  indicators: [
    { name: 'Speed', max: 100 },
    { name: 'Reliability', max: 100 },
    { name: 'Support', max: 100 },
  ],
  series: [
    { name: 'Premium', values: [90, 80, 70] },
    { name: 'Pro', values: [60, 70, 65] },
  ],
};

function firstSeries(series: unknown): Record<string, unknown> {
  return (series as Record<string, unknown>[])[0];
}

describe('buildEmphasisBlur helper', () => {
  it('returns {} when emphasis is undefined', () => {
    expect(buildEmphasisBlur(undefined, 'series')).toEqual({});
  });

  it('returns {} when blurOthers is false', () => {
    expect(buildEmphasisBlur({ blurOthers: false }, 'self')).toEqual({});
  });

  it('emits the focus + blur blocks when blurOthers is on', () => {
    const blocks = buildEmphasisBlur({ blurOthers: true }, 'series');
    expect(blocks.emphasis).toEqual({ focus: 'series', blurScope: 'coordinateSystem' });
    expect(blocks.blur).toMatchObject({
      itemStyle: { opacity: DEFAULT_BLUR_OPACITY },
      lineStyle: { opacity: DEFAULT_BLUR_OPACITY },
      areaStyle: { opacity: DEFAULT_BLUR_OPACITY },
      label: { opacity: DEFAULT_BLUR_OPACITY },
    });
  });

  it('passes the focus mode through verbatim', () => {
    expect(buildEmphasisBlur({ blurOthers: true }, 'self').emphasis).toMatchObject({
      focus: 'self',
    });
  });

  it('honors a custom blurOpacity', () => {
    const blocks = buildEmphasisBlur({ blurOthers: true, blurOpacity: 0.3 }, 'self');
    expect((blocks.blur?.itemStyle as Record<string, unknown>).opacity).toBe(0.3);
  });

  it('clamps out-of-range opacity into [0, 1]', () => {
    const hi = buildEmphasisBlur({ blurOthers: true, blurOpacity: 5 }, 'self');
    const lo = buildEmphasisBlur({ blurOthers: true, blurOpacity: -2 }, 'self');
    expect((hi.blur?.itemStyle as Record<string, unknown>).opacity).toBe(1);
    expect((lo.blur?.itemStyle as Record<string, unknown>).opacity).toBe(0);
  });

  it('falls back to the default opacity for a non-finite value', () => {
    const blocks = buildEmphasisBlur({ blurOthers: true, blurOpacity: NaN }, 'self');
    expect((blocks.blur?.itemStyle as Record<string, unknown>).opacity).toBe(
      DEFAULT_BLUR_OPACITY,
    );
  });
});

describe('adapters wire emphasis.blurOthers', () => {
  it('line — focus "series" on every series', () => {
    const { option } = resolveLineOptions(xy, { emphasis: { blurOthers: true } });
    for (const s of option.series as Record<string, unknown>[]) {
      expect(s.emphasis).toMatchObject({ focus: 'series' });
      expect((s.blur as Record<string, unknown>).itemStyle).toBeDefined();
    }
  });

  it('area — focus "series"', () => {
    const option = resolveAreaOptions(xy, { emphasis: { blurOthers: true } });
    expect(firstSeries(option.series).emphasis).toMatchObject({ focus: 'series' });
  });

  it('bar (multi-series) — focus "series"', () => {
    const { option } = resolveBarOptions(xy, { emphasis: { blurOthers: true } });
    expect(firstSeries(option.series).emphasis).toMatchObject({ focus: 'series' });
  });

  it('bar (colorByCategory single series) — focus "self"', () => {
    const single: XYData = {
      categories: ['Premium', 'Pro', 'Basic'],
      series: [{ name: 'Customers', data: [40, 30, 20] }],
    };
    const { option } = resolveBarOptions(single, {
      colorByCategory: true,
      emphasis: { blurOthers: true },
    });
    expect(firstSeries(option.series).emphasis).toMatchObject({ focus: 'self' });
  });

  it('pie — focus "self"', () => {
    const { option } = resolvePieOptions(pie, { emphasis: { blurOthers: true } });
    expect(firstSeries(option.series).emphasis).toMatchObject({ focus: 'self' });
  });

  it('radar — focus "self"', () => {
    const option = resolveRadarOptions(radar, { emphasis: { blurOthers: true } });
    expect(firstSeries(option.series).emphasis).toMatchObject({ focus: 'self' });
  });

  it('is off by default — no emphasis/blur blocks emitted', () => {
    const { option } = resolveLineOptions(xy, {});
    for (const s of option.series as Record<string, unknown>[]) {
      expect(s.emphasis).toBeUndefined();
      expect(s.blur).toBeUndefined();
    }
    const pieOpt = resolvePieOptions(pie, {}).option;
    expect(firstSeries(pieOpt.series).emphasis).toBeUndefined();
  });
});
