import { describe, it, expect } from 'vitest';
import type {
  MapData,
  TooltipContext,
  TooltipContextItem,
} from '../types.js';
import { isMapData } from '../types.js';
import { resolveMapOptions } from './map.js';

type TooltipFormatter = (
  params: unknown,
  ticket: string,
  callback: (t: string, h: string) => void,
) => string | undefined;

function getSeries(option: Record<string, unknown>): Record<string, unknown> {
  return (option.series as Record<string, unknown>[])[0];
}

const sample: MapData = [
  { name: 'A', value: 12 },
  { name: 'B', value: 28 },
  { name: 'C', value: 8 },
];

describe('isMapData', () => {
  it('accepts a non-empty array of named values', () => {
    expect(isMapData(sample)).toBe(true);
  });

  it('rejects empty arrays and non-array payloads', () => {
    expect(isMapData([] as unknown as MapData)).toBe(false);
    expect(
      isMapData({ categories: [], series: [] } as unknown as MapData),
    ).toBe(false);
  });

  it('rejects entries missing required fields', () => {
    expect(isMapData([{ name: 'A' }] as unknown as MapData)).toBe(false);
    expect(isMapData([{ value: 10 }] as unknown as MapData)).toBe(false);
  });
});

describe('map adapter', () => {
  it('emits a single map series bound to mapName', () => {
    const option = resolveMapOptions(sample, { mapName: 'demo-map' });
    const s = getSeries(option);
    expect((option.series as unknown[]).length).toBe(1);
    expect(s.type).toBe('map');
    expect(s.map).toBe('demo-map');
  });

  it('uses default map controls (nameProperty/roam/showLabel)', () => {
    const s = getSeries(resolveMapOptions(sample, { mapName: 'demo-map' }));
    expect(s.nameProperty).toBe('name');
    expect(s.roam).toBe(false);
    expect(s.zoom).toBe(1.08);
    expect((s.label as Record<string, unknown>).show).toBe(false);
  });

  it('honors map options overrides', () => {
    const s = getSeries(
      resolveMapOptions(sample, {
        mapName: 'demo-map',
        nameProperty: 'region_name',
        roam: 'scale',
        showLabel: true,
        center: [120, 30],
        zoom: 1.5,
      }),
    );
    expect(s.nameProperty).toBe('region_name');
    expect(s.roam).toBe('scale');
    expect((s.label as Record<string, unknown>).show).toBe(true);
    expect(s.center).toEqual([120, 30]);
    expect(s.zoom).toBe(1.5);
  });

  it('wires built-in overflow label hiding when enabled', () => {
    const s = getSeries(
      resolveMapOptions(sample, {
        mapName: 'demo-map',
        showLabel: true,
        autoHideOverflowLabel: true,
      }),
    );
    const labelLayout = s.labelLayout as (params: unknown) => Record<string, unknown>;
    const labelFormatter = (s.label as Record<string, unknown>)
      .formatter as (params: unknown) => string;
    expect(
      labelLayout({
        rect: { width: 20, height: 10 },
        labelRect: { width: 40, height: 12 },
      }),
    ).toEqual({ hide: true });
    expect(
      labelLayout({
        rect: { width: 40, height: 14 },
        labelRect: { width: 20, height: 10 },
      }),
    ).toEqual({ hide: false });
    expect(labelFormatter({ name: 'A', value: 10 })).toBe('A');
    expect(labelFormatter({ name: 'NoValue', value: Number.NaN })).toBe('');
  });

  it('does not emit labelLayout when autoHideOverflowLabel is disabled', () => {
    const s = getSeries(
      resolveMapOptions(sample, {
        mapName: 'demo-map',
        showLabel: true,
      }),
    );
    expect(s.labelLayout).toBeUndefined();
    expect((s.label as Record<string, unknown>).formatter).toBeUndefined();
  });

  it('resolves visualMap domain from data by default', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: {},
    });
    const visualMap = option.visualMap as Record<string, unknown>;
    expect(visualMap.min).toBe(8);
    expect(visualMap.max).toBe(28);
    expect(visualMap.orient).toBe('vertical');
    expect(visualMap.left).toBe('right');
    expect(visualMap.bottom).toBe(12);
    expect(visualMap.itemWidth).toBe(10);
    expect(visualMap.itemHeight).toBe(90);
    expect((visualMap.textStyle as Record<string, unknown>).fontSize).toBe(10);
    expect((visualMap.inRange as Record<string, unknown>).color).toEqual([
      'rgb(216, 230, 253)',
      'rgb(59, 130, 246)',
    ]);
  });

  it('honors visualMap overrides', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: {
        min: 0,
        max: 50,
        orient: 'horizontal',
        top: 24,
        left: 'center',
      },
    });
    const visualMap = option.visualMap as Record<string, unknown>;
    expect(visualMap.min).toBe(0);
    expect(visualMap.max).toBe(50);
    expect(visualMap.orient).toBe('horizontal');
    expect(visualMap.top).toBe(24);
    expect(visualMap.left).toBe('center');
    expect('bottom' in visualMap).toBe(false);
  });

  it('honors visualMap.inRangeColors override', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: {
        inRangeColors: ['rgba(0,0,255,0.1)', 'rgba(0,0,255,1)'],
      },
    });
    const visualMap = option.visualMap as Record<string, unknown>;
    expect((visualMap.inRange as Record<string, unknown>).color).toEqual([
      'rgba(0,0,255,0.1)',
      'rgba(0,0,255,1)',
    ]);
  });

  it('derives default visualMap alpha ramp from resolved color logic', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: {},
      colors: ['#111111'],
    });
    const visualMap = option.visualMap as Record<string, unknown>;
    expect((visualMap.inRange as Record<string, unknown>).color).toEqual([
      'rgb(207, 207, 207)',
      'rgb(17, 17, 17)',
    ]);
  });

  it('omits visualMap when disabled', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: { show: false },
    });
    expect(option.visualMap).toBeUndefined();
  });

  it('auto-enables visualMap by default when data has numeric values', () => {
    const option = resolveMapOptions(sample, { mapName: 'demo-map' });
    const visualMap = option.visualMap as Record<string, unknown>;
    expect(visualMap.min).toBe(8);
    expect(visualMap.max).toBe(28);
    expect(visualMap.show).toBe(true);
  });

  it('omits visualMap when values are non-finite and config is absent', () => {
    const option = resolveMapOptions(
      [{ name: 'A', value: Number.NaN }, { name: 'B', value: Number.NaN }],
      { mapName: 'demo-map' },
    );
    expect(option.visualMap).toBeUndefined();
  });

  it('uses one default area color when visualMap is not active', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: { show: false },
      colors: ['#111111', '#222222'],
    });
    const s = getSeries(option);
    const data = getSeries(option).data as Array<Record<string, unknown>>;
    expect((s.itemStyle as Record<string, unknown>).areaColor).toBe('#111111');
    expect(data.every((d) => d.itemStyle === undefined)).toBe(true);
    expect(option.color).toEqual(['#111111']);
  });

  it('lets per-item color override the default area color', () => {
    const option = resolveMapOptions(
      [{ name: 'A', value: 10, color: '#ff00ff' }, { name: 'B', value: 20 }],
      {
        mapName: 'demo-map',
        visualMap: { show: false },
        colors: ['#111111', '#222222'],
      },
    );
    const data = getSeries(option).data as Array<Record<string, unknown>>;
    expect((data[0].itemStyle as Record<string, unknown>).color).toBe('#ff00ff');
    expect((data[0].itemStyle as Record<string, unknown>).areaColor).toBe('#ff00ff');
    expect(data[1].itemStyle).toBeUndefined();
  });

  it('applies options.colorMap as per-region override', () => {
    const option = resolveMapOptions(
      [{ name: 'A', value: 10 }, { name: 'B', value: 20 }],
      {
        mapName: 'demo-map',
        visualMap: { show: false },
        colorMap: { B: '#22c55e' },
      },
    );
    const data = getSeries(option).data as Array<Record<string, unknown>>;
    expect(data[0].itemStyle).toBeUndefined();
    expect((data[1].itemStyle as Record<string, unknown>).color).toBe('#22c55e');
    expect((data[1].itemStyle as Record<string, unknown>).areaColor).toBe('#22c55e');
  });

  it('lets visualMap drive map coloring (does not force series.areaColor)', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: { min: 0, max: 30 },
      colors: ['#111111'],
    });
    const s = getSeries(option);
    expect(s.itemStyle).toBeUndefined();
  });

  it('honors labelFontSize via getLabelFontSize on series.label', () => {
    const s = getSeries(
      resolveMapOptions(sample, { mapName: 'demo-map', labelFontSize: 18 }),
    );
    expect((s.label as Record<string, unknown>).fontSize).toBe(18);
  });

  it('does not emit label.color (theme owns canvas-rendered text)', () => {
    const label = getSeries(resolveMapOptions(sample, { mapName: 'demo-map' }))
      .label as Record<string, unknown>;
    expect('color' in label).toBe(false);
  });

  it('formats default sync tooltip as `marker name: value`', () => {
    const tooltip = resolveMapOptions(sample, { mapName: 'demo-map' })
      .tooltip as Record<string, unknown>;
    const formatter = tooltip.formatter as (params: unknown) => string;
    expect(
      formatter({
        name: 'A',
        value: 12,
        marker: '<span/>',
        dataIndex: 0,
      }),
    ).toBe('<span/>A: 12');
  });

  it('treats non-finite map value as missing (no `NaN` in tooltip)', () => {
    const tooltip = resolveMapOptions(sample, { mapName: 'demo-map' })
      .tooltip as Record<string, unknown>;
    const formatter = tooltip.formatter as (params: unknown) => string;
    expect(
      formatter({
        name: 'Unknown Region',
        value: Number.NaN,
        marker: '<span/>',
        dataIndex: 99,
      }),
    ).toBe('<span/>Unknown Region');
  });

  it('routes user-defined tooltip.formatValue through the sync body', () => {
    const tooltip = resolveMapOptions(sample, {
      mapName: 'demo-map',
      tooltip: { formatValue: (v) => `${v} users` },
    }).tooltip as Record<string, unknown>;
    const formatter = tooltip.formatter as (params: unknown) => string;
    expect(
      formatter({
        name: 'B',
        value: 28,
        marker: '<span/>',
        dataIndex: 1,
      }),
    ).toBe('<span/>B: 28 users');
  });

  it('threads name/value/color into customHtml via TooltipContextItem', async () => {
    let captured: TooltipContext | undefined;
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      tooltip: {
        customHtml: async (ctx) => {
          captured = ctx;
          return 'ok';
        },
      },
    });
    const tooltip = option.tooltip as Record<string, unknown>;
    const formatter = tooltip.formatter as TooltipFormatter;
    formatter(
      {
        name: 'A',
        value: 12,
        marker: '<span/>',
        color: '#ff00ff',
        dataIndex: 4,
      },
      't0',
      () => {},
    );
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
    expect(captured?.kind).toBe('item');
    const item = captured as TooltipContextItem;
    expect(item.name).toBe('A');
    expect(item.value).toBe(12);
    expect(item.color).toBe('#ff00ff');
    expect(item.dataIndex).toBe(4);
  });

  it('normalizes NaN to empty value in customHtml context', async () => {
    let captured: TooltipContext | undefined;
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      tooltip: {
        customHtml: async (ctx) => {
          captured = ctx;
          return 'ok';
        },
      },
    });
    const tooltip = option.tooltip as Record<string, unknown>;
    const formatter = tooltip.formatter as TooltipFormatter;
    formatter(
      {
        name: 'No Data Region',
        value: Number.NaN,
        marker: '<span/>',
        color: '#cccccc',
        dataIndex: 7,
      },
      't1',
      () => {},
    );
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
    expect(captured?.kind).toBe('item');
    const item = captured as TooltipContextItem;
    expect(item.value).toBe('');
  });

  it('merges options.echarts last as escape hatch', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      echarts: { backgroundColor: '#fafafa' },
    });
    expect(option.backgroundColor).toBe('#fafafa');
  });

  it('palette wins over user echarts.color', () => {
    const option = resolveMapOptions(sample, {
      mapName: 'demo-map',
      visualMap: { show: false },
      colors: ['#111111', '#222222', '#333333'],
      echarts: { color: ['#999999'] },
    });
    expect(option.color).toEqual(['#111111']);
  });
});
