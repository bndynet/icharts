import { describe, it, expect } from 'vitest';
import {
  pieParamsToTooltipContext,
  sankeyChordParamsToTooltipContext,
  buildChartEventContext,
  formatPieTooltipSyncHtml,
  type PieRingTooltipValue,
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

describe('formatPieTooltipSyncHtml', () => {
  const marker = '●';

  it('single series without name: label + value + percent on one line', () => {
    const html = formatPieTooltipSyncHtml(
      { marker, name: 'Search', value: 60, percent: 60 },
      {},
    );
    expect(html).toBe(`${marker}Search&nbsp;&nbsp;60 (60%)`);
  });

  it('single series with a real series.name: header line then label line', () => {
    const html = formatPieTooltipSyncHtml(
      { marker, name: 'Search', value: 60, percent: 60, seriesName: '2025' },
      {},
    );
    expect(html).toBe(`2025<br/>${marker}Search&nbsp;&nbsp;60 (60%)`);
  });

  it('ignores the ECharts auto-generated series name sentinel', () => {
    const html = formatPieTooltipSyncHtml(
      { marker, name: 'Search', value: 60, percent: 60, seriesName: 'series\u00000' },
      {},
    );
    expect(html).toBe(`${marker}Search&nbsp;&nbsp;60 (60%)`);
  });

  it('concentric: category header + one row per ring, no percent', () => {
    const rings = new Map<string, PieRingTooltipValue[]>([
      [
        'Search',
        [
          { name: '2024', value: 55 },
          { name: '2025', value: 60 },
          { name: '2026', value: 25 },
        ],
      ],
    ]);
    const html = formatPieTooltipSyncHtml(
      { marker, name: 'Search', value: 60, percent: 60, seriesName: '2025' },
      {},
      rings,
    );
    expect(html).toBe(
      `Search<br/>${marker}2024&nbsp;&nbsp;55<br/>${marker}2025&nbsp;&nbsp;60<br/>${marker}2026&nbsp;&nbsp;25`,
    );
  });

  it('concentric omits rings that lack the hovered category', () => {
    const rings = new Map<string, PieRingTooltipValue[]>([
      [
        'Search',
        [
          { name: '2024', value: 55 },
          { name: '2026', value: 25 },
        ],
      ],
    ]);
    const html = formatPieTooltipSyncHtml(
      { marker, name: 'Search', value: 55, seriesName: '2024' },
      {},
      rings,
    );
    expect(html).toBe(`Search<br/>${marker}2024&nbsp;&nbsp;55<br/>${marker}2026&nbsp;&nbsp;25`);
  });

  it('honors options.tooltip.formatValue', () => {
    const html = formatPieTooltipSyncHtml(
      { marker, name: 'Search', value: 60, percent: 60 },
      { tooltip: { formatValue: (v) => `${v} 次` } },
    );
    expect(html).toBe(`${marker}Search&nbsp;&nbsp;60 次 (60%)`);
  });

  it('drops a trailing ".0" but keeps real decimals', () => {
    const whole = formatPieTooltipSyncHtml(
      { marker, name: 'A', value: 60, percent: 60 },
      {},
    );
    expect(whole).toBe(`${marker}A&nbsp;&nbsp;60 (60%)`);

    const fractional = formatPieTooltipSyncHtml(
      { marker, name: 'A', value: 60, percent: 37.5 },
      {},
    );
    expect(fractional).toBe(`${marker}A&nbsp;&nbsp;60 (37.5%)`);
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

describe('buildChartEventContext', () => {
  it('normalizes a series data-item click into an item context', () => {
    const ctx = buildChartEventContext('click', {
      componentType: 'series',
      seriesType: 'pie',
      seriesIndex: 0,
      dataIndex: 2,
      name: 'North',
      value: 40,
      percent: 25,
      marker: '<span></span>',
      color: '#5470c6',
    });
    expect(ctx.type).toBe('click');
    expect(ctx.componentType).toBe('series');
    expect(ctx.seriesType).toBe('pie');
    expect(ctx.seriesIndex).toBe(0);
    expect(ctx.data).toEqual({
      kind: 'item',
      dataIndex: 2,
      name: 'North',
      value: 40,
      percent: 25,
      marker: '<span></span>',
      color: '#5470c6',
    });
  });

  it('normalizes an edge (link) hit into an edge context', () => {
    const ctx = buildChartEventContext('click', {
      componentType: 'series',
      seriesType: 'sankey',
      dataType: 'edge',
      dataIndex: 3,
      data: { source: 'A', target: 'B', value: 7 },
      color: 'gradient',
    });
    expect(ctx.data).toEqual({
      kind: 'edge',
      dataIndex: 3,
      source: 'A',
      target: 'B',
      value: 7,
    });
  });

  it('unpacks a tuple value (scatter / word-cloud) to its trailing magnitude', () => {
    const ctx = buildChartEventContext('mouseover', {
      componentType: 'series',
      seriesType: 'wordCloud',
      name: 'hello',
      value: ['hello', 128],
      dataIndex: 0,
    });
    if (ctx.data?.kind !== 'item') throw new Error('expected item');
    expect(ctx.data.value).toBe(128);
  });

  it('drops the literal "gradient" color (not a usable hex)', () => {
    const ctx = buildChartEventContext('click', {
      componentType: 'series',
      name: 'X',
      value: 1,
      color: 'gradient',
    });
    if (ctx.data?.kind !== 'item') throw new Error('expected item');
    expect(ctx.data.color).toBeUndefined();
  });

  it('leaves data undefined for non-series hits (legend / title / empty canvas)', () => {
    const ctx = buildChartEventContext('click', {
      componentType: 'title',
    });
    expect(ctx.data).toBeUndefined();
    expect(ctx.componentType).toBe('title');
    expect(ctx.raw).toEqual({ componentType: 'title' });
  });

  it('tolerates null / undefined params', () => {
    const ctx = buildChartEventContext('mouseout', undefined);
    expect(ctx.type).toBe('mouseout');
    expect(ctx.data).toBeUndefined();
    expect(ctx.raw).toBeUndefined();
  });
});
