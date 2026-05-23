import { describe, it, expect } from 'vitest';
import {
  isLiquidProgressData,
  mergeLiquidProgressData,
} from './liquid-progress.js';

describe('isLiquidProgressData', () => {
  it('accepts gauge-like single metric objects', () => {
    expect(isLiquidProgressData({ value: 72, max: 100, label: 'Storage' })).toBe(
      true,
    );
  });

  it('rejects xy and graph data shapes', () => {
    expect(
      isLiquidProgressData({
        categories: ['A'],
        series: [{ name: 'x', data: [1] }],
      }),
    ).toBe(false);
    expect(
      isLiquidProgressData({
        nodes: [{ name: 'A' }],
        links: [],
      }),
    ).toBe(false);
  });
});

describe('mergeLiquidProgressData', () => {
  const prev = { value: 50, max: 200, label: 'Storage' };

  it('keeps max and label when the patch only carries value', () => {
    expect(mergeLiquidProgressData(prev, { value: 72 })).toEqual({
      value: 72,
      max: 200,
      label: 'Storage',
    });
  });

  it('overrides max when the patch includes max', () => {
    expect(mergeLiquidProgressData(prev, { value: 10, max: 100 })).toEqual({
      value: 10,
      max: 100,
      label: 'Storage',
    });
  });

  it('clears label when the patch passes an empty string', () => {
    expect(mergeLiquidProgressData(prev, { value: 10, label: '' })).toEqual({
      value: 10,
      max: 200,
      label: '',
    });
  });

  it('drops a prior max when the patch explicitly sets max to undefined', () => {
    expect(mergeLiquidProgressData(prev, { value: 10, max: undefined })).toEqual({
      value: 10,
      label: 'Storage',
    });
  });

  it('does not invent max/label when neither frame had them', () => {
    expect(mergeLiquidProgressData({ value: 1 }, { value: 2 })).toEqual({ value: 2 });
  });
});
