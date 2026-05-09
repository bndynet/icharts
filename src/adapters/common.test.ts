import { describe, it, expect } from 'vitest';
import { LEGEND_RESERVE, getLegendReserve, getTitleReserve } from './common.js';

const EMPTY = { top: 0, bottom: 0, left: 0, right: 0 };

// Title geometry: fontSize + padding*2 + TITLE_CHART_GAP
// Defaults: fontSize=14, padding=8, gap=8 → 14 + 16 + 8 = 38
const DEFAULT_TITLE_HEIGHT = 38;

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

describe('getTitleReserve', () => {
  it('returns zeros on every edge when no title is set', () => {
    expect(getTitleReserve({})).toEqual(EMPTY);
    expect(getTitleReserve({ title: undefined })).toEqual(EMPTY);
  });

  it('reserves the title widget height on the top edge for a string title', () => {
    expect(getTitleReserve({ title: 'Sales' })).toEqual({
      ...EMPTY,
      top: DEFAULT_TITLE_HEIGHT,
    });
  });

  it('reserves on top for an object title with default sizing', () => {
    expect(getTitleReserve({ title: { text: 'Sales' } })).toEqual({
      ...EMPTY,
      top: DEFAULT_TITLE_HEIGHT,
    });
  });

  it('reflects custom fontSize and padding in the top reserve', () => {
    // 18 + 12*2 + 8 = 50
    expect(getTitleReserve({ title: { text: 'Sales', fontSize: 18, padding: 12 } })).toEqual({
      ...EMPTY,
      top: 50,
    });
  });

  it('does not include chart padding (padding-free, mirrors getLegendReserve)', () => {
    // chart padding is irrelevant — title reserve is the widget height only.
    const a = getTitleReserve({ title: 'Sales', padding: 0 });
    const b = getTitleReserve({ title: 'Sales', padding: 24 });
    expect(a).toEqual(b);
  });

  it('returns a fresh object on every call (callers may mutate the result)', () => {
    const a = getTitleReserve({ title: 'Sales' });
    const b = getTitleReserve({ title: 'Sales' });
    expect(a).not.toBe(b);
    a.top = 999;
    expect(b.top).toBe(DEFAULT_TITLE_HEIGHT);
  });

  it('exposes a shape symmetric with getLegendReserve so adapters can compose them', () => {
    // This is a structural assertion, not a value test — both helpers must
    // return the same EdgeReserves shape so charts that combine them
    // (radar today, others later) can use a single edge loop.
    const title = getTitleReserve({ title: 'Sales' });
    const legend = getLegendReserve({ legend: { position: 'bottom' } }, true);
    expect(Object.keys(title).sort()).toEqual(Object.keys(legend).sort());
  });
});
