import { describe, it, expect } from 'vitest';
import type { WordCloudData } from '../types.js';
import { isWordCloudData } from '../types.js';
import { resolveWordCloudOptions } from './word-cloud.js';

const sample: WordCloudData = [
  { name: 'TypeScript', value: 80 },
  { name: 'Visualization', value: 120 },
  { name: 'Lit', value: 60 },
];

function getSeries(option: Record<string, unknown>): Record<string, unknown> {
  return (option.series as Record<string, unknown>[])[0];
}

describe('isWordCloudData', () => {
  it('accepts a non-empty {name,value} array', () => {
    expect(isWordCloudData(sample)).toBe(true);
  });

  it('rejects empty arrays and non-array payloads', () => {
    expect(isWordCloudData([] as unknown as WordCloudData)).toBe(false);
    expect(
      isWordCloudData({ categories: [], series: [] } as unknown as WordCloudData),
    ).toBe(false);
    expect(
      isWordCloudData({ value: 30 } as unknown as WordCloudData),
    ).toBe(false);
  });

  it('rejects entries missing name/value fields', () => {
    expect(
      isWordCloudData([{ name: 'A' }] as unknown as WordCloudData),
    ).toBe(false);
    expect(
      isWordCloudData([{ value: 1 }] as unknown as WordCloudData),
    ).toBe(false);
  });
});

describe('wordcloud adapter', () => {
  it('builds a single custom word-cloud series', () => {
    const option = resolveWordCloudOptions(sample, {});
    const s = getSeries(option);
    expect(s.type).toBe('custom');
    expect(s.renderItem).toBe('wordCloud');
    expect(s.coordinateSystem).toBe('none');
    expect(Array.isArray(s.data)).toBe(true);
  });

  it('sorts by value desc by default', () => {
    const data = getSeries(resolveWordCloudOptions(sample, {})).data as Array<{
      value: [string, number];
    }>;
    expect(data.map((d) => d.value[0])).toEqual(['Visualization', 'TypeScript', 'Lit']);
  });

  it('preserves input order when autoSort is false', () => {
    const data = getSeries(
      resolveWordCloudOptions(sample, { autoSort: false }),
    ).data as Array<{ value: [string, number] }>;
    expect(data.map((d) => d.value[0])).toEqual(['TypeScript', 'Visualization', 'Lit']);
  });

  it('supports diamond variant defaults for layout knobs', () => {
    const s = getSeries(
      resolveWordCloudOptions(sample, {
        variant: 'diamond',
      }),
    );
    const payload = s.itemPayload as Record<string, unknown>;
    expect(payload.shape).toBe('diamond');
    expect(payload.rotationRange).toEqual([0, 0]);
    expect(payload.sizeRange).toEqual([14, 48]);
    expect(payload.gridSize).toBe(10);
  });

  it('lets explicit options override diamond variant defaults', () => {
    const s = getSeries(
      resolveWordCloudOptions(sample, {
        variant: 'diamond',
        shape: 'star',
        rotationRange: [-30, 30],
        sizeRange: [10, 20],
        gridSize: 6,
      }),
    );
    const payload = s.itemPayload as Record<string, unknown>;
    expect(payload.shape).toBe('star');
    expect(payload.rotationRange).toEqual([-30, 30]);
    expect(payload.sizeRange).toEqual([10, 20]);
    expect(payload.gridSize).toBe(6);
  });

  it('keeps compact-diamond as a backwards-compatible alias of diamond', () => {
    const oldPreset = getSeries(
      resolveWordCloudOptions(sample, { variant: 'compact-diamond' }),
    ).itemPayload as Record<string, unknown>;
    const newPreset = getSeries(
      resolveWordCloudOptions(sample, { variant: 'diamond' }),
    ).itemPayload as Record<string, unknown>;
    expect(oldPreset.shape).toBe(newPreset.shape);
    expect(oldPreset.rotationRange).toEqual(newPreset.rotationRange);
    expect(oldPreset.sizeRange).toEqual(newPreset.sizeRange);
    expect(oldPreset.gridSize).toBe(newPreset.gridSize);
  });

  it('supports poster variant defaults for stronger headline contrast', () => {
    const payload = getSeries(
      resolveWordCloudOptions(sample, { variant: 'poster' }),
    ).itemPayload as Record<string, unknown>;
    expect(payload.shape).toBe('star');
    expect(payload.rotationRange).toEqual([-45, 45]);
    expect(payload.sizeRange).toEqual([16, 72]);
    expect(payload.gridSize).toBe(12);
  });

  it('maps resolved colors to per-word itemStyle while keeping merged color array', () => {
    const option = resolveWordCloudOptions(sample, {
      colors: ['#111111', '#222222', '#333333'],
    });
    const s = getSeries(option);
    const data = s.data as Array<{ itemStyle: { color: string } }>;
    expect(data[0].itemStyle.color).toBe('#111111');
    expect(data[1].itemStyle.color).toBe('#222222');
    expect(data[2].itemStyle.color).toBe('#333333');
    expect(option.color).toEqual(['#111111', '#222222', '#333333']);
  });

  it('lets per-item color override palette resolution', () => {
    const option = resolveWordCloudOptions(
      [
        { name: 'A', value: 10, color: '#ff00ff' },
        { name: 'B', value: 8 },
      ],
      { colors: ['#111111', '#222222'] },
    );
    const data = getSeries(option).data as Array<{ itemStyle: { color: string } }>;
    expect(data[0].itemStyle.color).toBe('#ff00ff');
    expect(data[1].itemStyle.color).toBe('#222222');
  });

  it('reserves title space in itemPayload top inset', () => {
    const withTitle = getSeries(
      resolveWordCloudOptions(sample, { title: 'Word Cloud', padding: 10 }),
    );
    const noTitle = getSeries(
      resolveWordCloudOptions(sample, { padding: 10 }),
    );
    const withTitlePayload = withTitle.itemPayload as Record<string, unknown>;
    const noTitlePayload = noTitle.itemPayload as Record<string, unknown>;
    expect(withTitlePayload.top as number).toBeGreaterThan(
      noTitlePayload.top as number,
    );
  });

  it('passes option knobs into itemPayload', () => {
    const mask = {} as HTMLCanvasElement;
    const s = getSeries(
      resolveWordCloudOptions(sample, {
        sizeRange: [20, 80],
        shape: 'star',
        rotationRange: [0, 0],
        rotationStep: 0,
        gridSize: 12,
        keepAspect: true,
        drawOutOfBound: true,
        shrinkToFit: true,
        layoutAnimation: false,
        maskImage: mask,
      }),
    );
    const payload = s.itemPayload as Record<string, unknown>;
    expect(payload.sizeRange).toEqual([20, 80]);
    expect(payload.shape).toBe('star');
    expect(payload.rotationRange).toEqual([0, 0]);
    expect(payload.rotationStep).toBe(0);
    expect(payload.gridSize).toBe(12);
    expect(payload.keepAspect).toBe(true);
    expect(payload.drawOutOfBound).toBe(true);
    expect(payload.shrinkToFit).toBe(true);
    expect(payload.layoutAnimation).toBe(false);
    expect(payload.maskImage).toBe(mask);
  });

  it('formats default tooltip as `name: value`', () => {
    const tooltip = resolveWordCloudOptions(sample, {}).tooltip as Record<
      string,
      unknown
    >;
    const formatter = tooltip.formatter as (params: unknown) => string;
    expect(
      formatter({
        name: 'Visualization',
        value: ['Visualization', 120],
        marker: '<span/>',
        dataIndex: 0,
      }),
    ).toBe('<span/>Visualization: 120');
  });
});
