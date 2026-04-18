import { describe, it, expect } from 'vitest';
import type { ChordData, SankeyData, PieData, XYData } from './types.js';
import { resolveColors, resolveColorsForNodes } from './utils.js';
import { resolveChordOptions } from './adapters/chord.js';
import { resolveSankeyOptions } from './adapters/sankey.js';
import { resolvePieOptions } from './adapters/pie.js';
import { resolveLineOptions } from './adapters/line.js';

// ---------------------------------------------------------------------------
// Resolver primitives
// ---------------------------------------------------------------------------

describe('resolveColors', () => {
  it('returns one color per name and falls back to the theme palette', () => {
    const palette = resolveColors(['X', 'Y', 'Z'], {});
    expect(palette).toHaveLength(3);
    palette.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it('honors options.colorMap', () => {
    const palette = resolveColors(['A', 'B'], { colorMap: { A: '#00ff00' } });
    expect(palette[0]).toBe('#00ff00');
  });

  it('honors options.colors when length is sufficient', () => {
    const palette = resolveColors(['A', 'B'], {
      colors: ['#111111', '#222222', '#333333'],
    });
    expect(palette).toEqual(['#111111', '#222222']);
  });

  it('returns an empty array for empty input', () => {
    expect(resolveColors([], {})).toEqual([]);
  });
});

describe('resolveColorsForNodes', () => {
  it('uses node.color over palette', () => {
    const colors = resolveColorsForNodes(
      [{ name: 'A', color: '#ff0000' }, { name: 'B' }],
      {},
    );
    expect(colors[0]).toBe('#ff0000');
    expect(colors[1]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('honors options.colorMap when node.color is absent', () => {
    const colors = resolveColorsForNodes(
      [{ name: 'A' }, { name: 'B' }],
      { colorMap: { A: '#00ff00' } },
    );
    expect(colors[0]).toBe('#00ff00');
  });
});

// ---------------------------------------------------------------------------
// Adapter-level integration: each adapter assembles colors into the right
// ECharts option fields (option.color for series-indexed charts; per-node
// itemStyle.color for graph charts).
// ---------------------------------------------------------------------------

describe('line adapter color injection', () => {
  it('writes resolved palette into option.color', () => {
    const data: XYData = {
      categories: ['Q1', 'Q2'],
      series: [
        { name: 'Revenue', data: [10, 20] },
        { name: 'Cost', data: [5, 8] },
      ],
    };
    const option = resolveLineOptions(data, {
      colorMap: { Revenue: '#aabbcc' },
    });
    const color = option.color as string[];
    expect(color[0]).toBe('#aabbcc');
    expect(color[1]).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('pie adapter color injection', () => {
  it('writes resolved palette into option.color in slice order', () => {
    const data: PieData = [
      { name: 'A', value: 30 },
      { name: 'B', value: 70 },
    ];
    const option = resolvePieOptions(data, {
      colorMap: { A: '#112233' },
    });
    const color = option.color as string[];
    expect(color[0]).toBe('#112233');
    expect(color).toHaveLength(2);
  });
});

describe('chord adapter color injection', () => {
  it('assigns palette colors to every node via itemStyle', () => {
    const data: ChordData = {
      nodes: [{ name: 'Engineering' }, { name: 'Design' }],
      links: [{ source: 'Engineering', target: 'Design', value: 10 }],
    };
    const { option } = resolveChordOptions(data, {});
    const nodes = (option.series as Record<string, unknown>[])[0]
      .data as Record<string, unknown>[];
    expect((nodes[0].itemStyle as { color: string }).color).toMatch(/^#[0-9a-f]{6}$/i);
    expect((nodes[1].itemStyle as { color: string }).color).toMatch(/^#[0-9a-f]{6}$/i);
    expect((nodes[0].itemStyle as { color: string }).color).not.toBe(
      (nodes[1].itemStyle as { color: string }).color,
    );
  });

  it('respects an explicit node.color over the palette', () => {
    const data: ChordData = {
      nodes: [{ name: 'A', color: '#ff0000' }, { name: 'B' }],
      links: [{ source: 'A', target: 'B', value: 1 }],
    };
    const { option } = resolveChordOptions(data, {});
    const nodes = (option.series as Record<string, unknown>[])[0]
      .data as Record<string, unknown>[];
    expect((nodes[0].itemStyle as { color: string }).color).toBe('#ff0000');
    expect((nodes[1].itemStyle as { color: string }).color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('sankey adapter color injection', () => {
  it('respects options.colorMap for sankey nodes', () => {
    const data: SankeyData = {
      nodes: [{ name: 'A' }, { name: 'B' }],
      links: [{ source: 'A', target: 'B', value: 1 }],
    };
    const option = resolveSankeyOptions(data, {
      colorMap: { A: '#00ff00' },
    });
    const nodes = (option.series as Record<string, unknown>[])[0]
      .data as Record<string, unknown>[];
    expect((nodes[0].itemStyle as { color: string }).color).toBe('#00ff00');
  });
});
