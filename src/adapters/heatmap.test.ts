import { describe, it, expect } from 'vitest';
import type { HeatmapData, TooltipContext } from '../types.js';
import { isHeatmapData } from '../types.js';
import { resolveHeatmapOptions } from './heatmap.js';

type TooltipFormatter = (
  params: unknown,
  ticket: string,
  callback: (t: string, h: string) => void,
) => string | undefined;

function getSeries(option: Record<string, unknown>): Record<string, unknown> {
  return (option.series as Record<string, unknown>[])[0];
}

const sample: HeatmapData = {
  xCategories: ['Mon', 'Tue', 'Wed'],
  yCategories: ['Morning', 'Afternoon'],
  data: [
    { x: 0, y: 0, value: 5 },
    { x: 1, y: 0, value: 12 },
    { x: 2, y: 0, value: 7 },
    { x: 0, y: 1, value: 3 },
    { x: 1, y: 1, value: 20 },
    { x: 2, y: 1, value: 9 },
  ],
};

describe('isHeatmapData', () => {
  it('accepts the grid shape', () => {
    expect(isHeatmapData(sample)).toBe(true);
  });

  it('rejects non-object and malformed payloads', () => {
    expect(isHeatmapData(null as unknown as HeatmapData)).toBe(false);
    expect(isHeatmapData([] as unknown as HeatmapData)).toBe(false);
    expect(
      isHeatmapData({ categories: [], series: [] } as unknown as HeatmapData),
    ).toBe(false);
    expect(
      isHeatmapData({ xCategories: [], data: [] } as unknown as HeatmapData),
    ).toBe(false);
    expect(
      isHeatmapData({
        xCategories: [],
        yCategories: [],
        data: 'nope',
      } as unknown as HeatmapData),
    ).toBe(false);
  });
});

describe('heatmap adapter', () => {
  it('emits a single heatmap series with two category axes', () => {
    const option = resolveHeatmapOptions(sample, {});
    expect((option.series as unknown[]).length).toBe(1);
    expect(getSeries(option).type).toBe('heatmap');
    expect(option.xAxis).toEqual({
      type: 'category',
      data: sample.xCategories,
      splitArea: { show: false },
      splitLine: { show: false },
    });
    expect(option.yAxis).toEqual({
      type: 'category',
      data: sample.yCategories,
      splitArea: { show: false },
      splitLine: { show: false },
      inverse: true,
    });
  });

  it('maps cells to [xIndex, yIndex, value] tuples', () => {
    const option = resolveHeatmapOptions(sample, {});
    const data = getSeries(option).data as [number, number, number][];
    expect(data[0]).toEqual([0, 0, 5]);
    expect(data[5]).toEqual([2, 1, 9]);
  });

  it('accepts category labels instead of indices', () => {
    const option = resolveHeatmapOptions(
      {
        xCategories: ['A', 'B'],
        yCategories: ['C', 'D'],
        data: [{ x: 'B', y: 'D', value: 4 }],
      },
      {},
    );
    const data = getSeries(option).data as [number, number, number][];
    expect(data[0]).toEqual([1, 1, 4]);
  });

  it('keeps numeric category labels distinguishable from indices', () => {
    const option = resolveHeatmapOptions(
      {
        xCategories: [1990, 1991],
        yCategories: ['low', 'high'],
        data: [
          { x: 1990, y: 'high', value: 8 },
          { x: 1, y: 0, value: 9 },
        ],
      },
      {},
    );
    const data = getSeries(option).data as [number, number, number][];
    expect(data[0]).toEqual([0, 1, 8]); // 1990 is a label, not an index
    expect(data[1]).toEqual([1, 0, 9]); // 1 is a valid index
  });

  it('auto-enables a vertical visualMap from the data range', () => {
    const option = resolveHeatmapOptions(sample, {});
    const vm = option.visualMap as Record<string, unknown>;
    expect(vm).toBeDefined();
    expect(vm.min).toBe(3);
    expect(vm.max).toBe(20);
    expect(vm.orient).toBe('vertical');
    expect(vm.left).toBe('right');
    expect(vm.bottom).toBe(12);
    expect(vm.itemWidth).toBe(10);
    expect(vm.itemHeight).toBe(90);
  });

  it('orders visualMap end labels [max, min] (ECharts convention)', () => {
    const option = resolveHeatmapOptions(sample, {});
    const vm = option.visualMap as Record<string, unknown>;
    expect(vm.text).toEqual(['20', '3']);
  });

  it('reserves grid space for the vertical visualMap', () => {
    const option = resolveHeatmapOptions(sample, {});
    const grid = option.grid as Record<string, unknown>;
    // vertical visualMap reserves the right edge (12 default padding + 100)
    expect(grid.right).toBe(112);
    expect(grid.bottom).toBe(12);
  });

  it('supports horizontal orient (thickness/length swapped for the 90° rotation) + bottom reserve', () => {
    const option = resolveHeatmapOptions(sample, {
      visualMap: { orient: 'horizontal' },
    });
    const vm = option.visualMap as Record<string, unknown>;
    expect(vm.left).toBe('center');
    expect(vm.bottom).toBe(8);
    // ECharts rotates the horizontal bar 90°: itemWidth = thickness, itemHeight = length.
    expect(vm.itemWidth).toBe(12);
    expect(vm.itemHeight).toBe(120);
    const grid = option.grid as Record<string, unknown>;
    expect(grid.bottom).toBe(52); // 12 default padding + 40 reserve
  });

  it('honors visualMap.width (horizontal length / vertical thickness)', () => {
    const h = resolveHeatmapOptions(sample, {
      visualMap: { orient: 'horizontal', width: 200 },
    }).visualMap as Record<string, unknown>;
    expect(h.itemHeight).toBe(200); // horizontal length after 90° rotation
    expect(h.itemWidth).toBe(12);   // thickness unchanged

    const v = resolveHeatmapOptions(sample, {
      visualMap: { width: 24 },
    }).visualMap as Record<string, unknown>;
    expect(v.itemWidth).toBe(24);  // vertical thickness
    expect(v.itemHeight).toBe(90); // length unchanged
  });

  it('derives the default inRange ramp from the resolved color', () => {
    const option = resolveHeatmapOptions(sample, {
      colors: ['#111111'],
    });
    const vm = option.visualMap as Record<string, unknown>;
    expect((vm.inRange as Record<string, unknown>).color).toEqual([
      'rgb(207, 207, 207)',
      'rgb(17, 17, 17)',
    ]);
  });

  it('honors visualMap overrides (including vertical orientation)', () => {
    const option = resolveHeatmapOptions(sample, {
      visualMap: { min: 0, max: 50, orient: 'vertical', left: 'left' },
    });
    const vm = option.visualMap as Record<string, unknown>;
    expect(vm.min).toBe(0);
    expect(vm.max).toBe(50);
    expect(vm.orient).toBe('vertical');
    expect(vm.left).toBe('left');
    expect(vm.itemWidth).toBe(10);
    expect(vm.itemHeight).toBe(90);
  });

  it('omits visualMap and falls back to a single palette color when disabled', () => {
    const option = resolveHeatmapOptions(sample, {
      colors: ['#00ff00'],
      visualMap: { show: false },
    });
    expect(option.visualMap).toBeUndefined();
    const itemStyle = getSeries(option).itemStyle as Record<string, unknown>;
    expect(itemStyle.color).toBe('#00ff00');
    expect(option.color).toEqual(['#00ff00']);
  });

  it('reserves the title slot on the grid top edge', () => {
    const noTitle = resolveHeatmapOptions(sample, {});
    const withTitle = resolveHeatmapOptions(sample, { title: 'Activity' });
    const gridA = noTitle.grid as Record<string, unknown>;
    const gridB = withTitle.grid as Record<string, unknown>;
    expect(gridB.top as number).toBeGreaterThan(gridA.top as number);
  });

  it('wires showCellLabel + labelFontSize into the series label', () => {
    const option = resolveHeatmapOptions(sample, {
      showCellLabel: true,
      labelFontSize: 18,
    });
    const label = getSeries(option).label as Record<string, unknown>;
    expect(label.show).toBe(true);
    expect(label.fontSize).toBe(18);
  });

  it('customHtml receives an item context with name / value / color', async () => {
    let captured: TooltipContext | undefined;
    const option = resolveHeatmapOptions(sample, {
      tooltip: {
        customHtml: async (ctx) => {
          captured = ctx;
          return 'ok';
        },
      },
    });
    const formatter = (option.tooltip as Record<string, unknown>)
      .formatter as TooltipFormatter;
    formatter(
      { dataIndex: 1, value: [1, 0, 12], marker: 'x', color: '#123456' },
      't0',
      () => {},
    );
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
    expect(captured?.kind).toBe('item');
    if (captured?.kind === 'item') {
      expect(captured.name).toBe('Tue × Morning');
      expect(captured.value).toBe(12);
      expect(captured.color).toBe('#123456');
    }
  });
});
