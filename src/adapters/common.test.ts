import { describe, it, expect } from 'vitest';
import { LEGEND_RESERVE, getLegendReserve } from './common.js';

const EMPTY = { top: 0, bottom: 0, left: 0, right: 0 };

describe('getLegendReserve', () => {
  it('returns zeros on every edge when the legend is hidden', () => {
    expect(getLegendReserve({}, false)).toEqual(EMPTY);
    // Even with a position set, hidden wins.
    expect(getLegendReserve({ legend: { position: 'right' } }, false)).toEqual(EMPTY);
  });

  it('reserves on the bottom edge by default', () => {
    expect(getLegendReserve({}, true)).toEqual({
      ...EMPTY,
      bottom: LEGEND_RESERVE,
    });
  });

  it('reserves on the requested edge for each legend position', () => {
    expect(getLegendReserve({ legend: { position: 'top' } }, true)).toEqual({
      ...EMPTY,
      top: LEGEND_RESERVE,
    });
    expect(getLegendReserve({ legend: { position: 'bottom' } }, true)).toEqual({
      ...EMPTY,
      bottom: LEGEND_RESERVE,
    });
    expect(getLegendReserve({ legend: { position: 'left' } }, true)).toEqual({
      ...EMPTY,
      left: LEGEND_RESERVE,
    });
    expect(getLegendReserve({ legend: { position: 'right' } }, true)).toEqual({
      ...EMPTY,
      right: LEGEND_RESERVE,
    });
  });

  it('adds extraGap on top of the legend slot', () => {
    expect(getLegendReserve({}, true, 24)).toEqual({
      ...EMPTY,
      bottom: LEGEND_RESERVE + 24,
    });
    expect(getLegendReserve({ legend: { position: 'right' } }, true, 10)).toEqual({
      ...EMPTY,
      right: LEGEND_RESERVE + 10,
    });
  });

  it('returns a fresh object on every call (callers may mutate the result)', () => {
    const a = getLegendReserve({}, true);
    const b = getLegendReserve({}, true);
    expect(a).not.toBe(b);
    a.bottom = 999;
    expect(b.bottom).toBe(LEGEND_RESERVE);
  });
});
