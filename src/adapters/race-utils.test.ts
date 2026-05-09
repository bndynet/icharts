import { describe, it, expect } from 'vitest';
import { resolveRaceLabelHeadroom } from './race-utils.js';

/**
 * Unit tests for the adaptive label-headroom calculation. The adapter
 * tests (bar.test / line.test) cover the integration; this file pins
 * the contract of the helper itself so the math is hard to regress.
 *
 * Note: under the node-only Vitest environment `document` is undefined,
 * so the canvas path falls back to the char-count estimate
 * (~7px per char). All assertions stay magnitude-based so a future
 * jsdom switch wouldn't invalidate them.
 */
describe('resolveRaceLabelHeadroom', () => {
  it('returns the floor (>=32px) even when there are no labels', () => {
    expect(resolveRaceLabelHeadroom([], undefined)).toBeGreaterThanOrEqual(32);
  });

  it('returns the floor for very short labels', () => {
    expect(resolveRaceLabelHeadroom(['1'], undefined)).toBeGreaterThanOrEqual(32);
  });

  it('grows with the widest label, not the count', () => {
    const many = resolveRaceLabelHeadroom(
      Array.from({ length: 50 }, () => 'A'),
      undefined,
    );
    const oneWide = resolveRaceLabelHeadroom(
      ['A very long single label that should dominate'],
      undefined,
    );
    expect(oneWide).toBeGreaterThan(many);
  });

  it('is monotonic with respect to ctx.maxRaceGridRight (never shrinks below the high-water mark)', () => {
    const widest = resolveRaceLabelHeadroom(['x'], { maxRaceGridRight: 500 });
    expect(widest).toBe(500);
  });

  it('grows beyond ctx.maxRaceGridRight when the current frame is even wider', () => {
    const label = 'a label that is much wider than the prior high water mark in pixels';
    const computed = resolveRaceLabelHeadroom([label], { maxRaceGridRight: 50 });
    expect(computed).toBeGreaterThan(50);
  });

  it('ignores empty strings (they contribute zero width)', () => {
    const onlyEmpty = resolveRaceLabelHeadroom(['', '', ''], undefined);
    expect(onlyEmpty).toBe(resolveRaceLabelHeadroom([], undefined));
  });
});
