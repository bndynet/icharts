import { describe, it, expect } from 'vitest';
import {
  pieParamsToTooltipContext,
  sankeyChordParamsToTooltipContext,
} from './tooltip-context.js';

describe('pieParamsToTooltipContext', () => {
  it('propagates the resolved slice color from params.color', () => {
    const ctx = pieParamsToTooltipContext({
      name: 'North',
      value: 40,
      percent: 50,
      dataIndex: 0,
      marker: '<span></span>',
      color: '#5470c6',
    });
    expect(ctx.kind).toBe('item');
    expect(ctx.color).toBe('#5470c6');
    expect(ctx.name).toBe('North');
    expect(ctx.value).toBe(40);
    expect(ctx.percent).toBe(50);
  });

  it('leaves color undefined when params.color is missing', () => {
    const ctx = pieParamsToTooltipContext({
      name: 'X',
      value: 1,
      dataIndex: 0,
    });
    expect(ctx.color).toBeUndefined();
  });

  it('ignores non-string params.color (defensive guard)', () => {
    const ctx = pieParamsToTooltipContext({
      name: 'X',
      value: 1,
      dataIndex: 0,
      color: { type: 'linear' } as unknown,
    });
    expect(ctx.color).toBeUndefined();
  });
});

describe('sankeyChordParamsToTooltipContext (edge branch)', () => {
  const nameToColor = new Map<string, string>([
    ['A', '#aa0000'],
    ['B', '#00bb00'],
  ]);

  it('maps source/target node colors from the nameToColor map', () => {
    const ctx = sankeyChordParamsToTooltipContext(
      {
        dataType: 'edge',
        dataIndex: 2,
        data: { source: 'A', target: 'B', value: 7 },
      },
      nameToColor,
    );
    expect(ctx.kind).toBe('edge');
    if (ctx.kind !== 'edge') return;
    expect(ctx.sourceColor).toBe('#aa0000');
    expect(ctx.targetColor).toBe('#00bb00');
    expect(ctx.source).toBe('A');
    expect(ctx.target).toBe('B');
    expect(ctx.value).toBe(7);
  });

  it('leaves sourceColor/targetColor undefined when nameToColor is not passed', () => {
    const ctx = sankeyChordParamsToTooltipContext({
      dataType: 'edge',
      data: { source: 'A', target: 'B', value: 1 },
    });
    if (ctx.kind !== 'edge') throw new Error('unexpected kind');
    expect(ctx.sourceColor).toBeUndefined();
    expect(ctx.targetColor).toBeUndefined();
  });

  it('IGNORES params.color for edges (it is literal "gradient" by default)', () => {
    // No nameToColor → both endpoint colors stay undefined even though the
    // raw ECharts `params.color` would be the string "gradient" in real
    // sankey/chord usage. We deliberately do NOT propagate that string —
    // it's not a real color and would be useless to consumers.
    const ctx = sankeyChordParamsToTooltipContext({
      dataType: 'edge',
      data: { source: 'A', target: 'B', value: 1 },
      color: 'gradient',
    });
    if (ctx.kind !== 'edge') throw new Error('unexpected kind');
    expect(ctx.sourceColor).toBeUndefined();
    expect(ctx.targetColor).toBeUndefined();
  });

  it('returns undefined for endpoint colors when names are not in the map', () => {
    const ctx = sankeyChordParamsToTooltipContext(
      {
        dataType: 'edge',
        data: { source: 'A', target: 'unknown', value: 1 },
      },
      nameToColor,
    );
    if (ctx.kind !== 'edge') throw new Error('unexpected kind');
    expect(ctx.sourceColor).toBe('#aa0000');
    expect(ctx.targetColor).toBeUndefined();
  });
});

describe('sankeyChordParamsToTooltipContext (item branch)', () => {
  const nameToColor = new Map<string, string>([['A', '#aa0000']]);

  it('prefers nameToColor over params.color for node hovers', () => {
    const ctx = sankeyChordParamsToTooltipContext(
      { name: 'A', value: 10, dataIndex: 0, color: '#ffffff' },
      nameToColor,
    );
    if (ctx.kind !== 'item') throw new Error('unexpected kind');
    expect(ctx.color).toBe('#aa0000');
    expect(ctx.name).toBe('A');
    expect(ctx.value).toBe(10);
  });

  it('falls back to params.color when the name is not in nameToColor', () => {
    const ctx = sankeyChordParamsToTooltipContext(
      { name: 'Z', value: 1, dataIndex: 0, color: '#abcdef' },
      nameToColor,
    );
    if (ctx.kind !== 'item') throw new Error('unexpected kind');
    expect(ctx.color).toBe('#abcdef');
  });

  it('leaves color undefined when neither map nor params.color provides one', () => {
    const ctx = sankeyChordParamsToTooltipContext({
      name: 'X',
      value: 1,
      dataIndex: 0,
    });
    if (ctx.kind !== 'item') throw new Error('unexpected kind');
    expect(ctx.color).toBeUndefined();
  });

  it('forwards marker untouched', () => {
    const ctx = sankeyChordParamsToTooltipContext(
      { name: 'A', value: 1, dataIndex: 0, marker: '<svg/>', color: '#fff' },
      nameToColor,
    );
    if (ctx.kind !== 'item') throw new Error('unexpected kind');
    expect(ctx.marker).toBe('<svg/>');
  });
});
