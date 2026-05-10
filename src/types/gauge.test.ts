import { describe, it, expect } from 'vitest';
import { mergeGaugeData } from './gauge.js';

describe('mergeGaugeData', () => {
  const prev = { value: 50, max: 200, label: 'CPU' };

  it('keeps max and label when the patch only carries value', () => {
    expect(mergeGaugeData(prev, { value: 72 })).toEqual({
      value: 72,
      max: 200,
      label: 'CPU',
    });
  });

  it('overrides max when the patch includes max', () => {
    expect(mergeGaugeData(prev, { value: 10, max: 100 })).toEqual({
      value: 10,
      max: 100,
      label: 'CPU',
    });
  });

  it('clears label when the patch passes an empty string', () => {
    expect(mergeGaugeData(prev, { value: 10, label: '' })).toEqual({
      value: 10,
      max: 200,
      label: '',
    });
  });

  it('drops a prior max when the patch explicitly sets max to undefined', () => {
    expect(mergeGaugeData(prev, { value: 10, max: undefined })).toEqual({
      value: 10,
      label: 'CPU',
    });
  });

  it('does not invent max/label when neither frame had them', () => {
    expect(mergeGaugeData({ value: 1 }, { value: 2 })).toEqual({ value: 2 });
  });
});
