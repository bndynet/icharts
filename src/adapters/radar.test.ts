import { describe, it, expect } from 'vitest';
import type { RadarData } from '../types.js';
import { isRadarData } from '../types.js';
import { resolveRadarOptions } from './radar.js';

const sample: RadarData = {
  indicators: [
    { name: 'Sales', max: 6500 },
    { name: 'Admin', max: 16000 },
    { name: 'IT', max: 30000 },
  ],
  series: [
    { name: 'Budget', values: [4200, 3000, 20000] },
    { name: 'Actual', values: [5000, 14000, 28000] },
  ],
};

describe('radar adapter', () => {
  describe('resolveRadarOptions', () => {
    it('builds a single radar series with one data item per series row', () => {
      const option = resolveRadarOptions(sample, {});
      const series = option.series as Record<string, unknown>[];
      expect(series).toHaveLength(1);
      expect(series[0].type).toBe('radar');
      const data = series[0].data as Array<{ name: string; value: number[] }>;
      expect(data).toEqual([
        { name: 'Budget', value: [4200, 3000, 20000] },
        { name: 'Actual', value: [5000, 14000, 28000] },
      ]);
    });

    it('builds the radar component from indicators with shape polygon by default', () => {
      const option = resolveRadarOptions(sample, {});
      const radar = option.radar as Record<string, unknown>;
      expect(radar.shape).toBe('polygon');
      expect(radar.indicator).toEqual([
        { name: 'Sales', max: 6500 },
        { name: 'Admin', max: 16000 },
        { name: 'IT', max: 30000 },
      ]);
    });

    it('uses circle shape when variant is "circle"', () => {
      const option = resolveRadarOptions(sample, { variant: 'circle' });
      const radar = option.radar as Record<string, unknown>;
      expect(radar.shape).toBe('circle');
    });

    it('omits undefined indicator bounds rather than emitting min/max keys', () => {
      const option = resolveRadarOptions(
        {
          indicators: [{ name: 'A' }, { name: 'B', max: 10 }, { name: 'C', min: -5 }],
          series: [{ name: 'X', values: [1, 2, 3] }],
        },
        {},
      );
      const radar = option.radar as Record<string, unknown>;
      const indicators = radar.indicator as Array<Record<string, unknown>>;
      expect(indicators[0]).toEqual({ name: 'A' });
      expect(indicators[1]).toEqual({ name: 'B', max: 10 });
      expect(indicators[2]).toEqual({ name: 'C', min: -5 });
    });

    it('fills the polygon area by default and removes the fill when filled is false', () => {
      const filled = resolveRadarOptions(sample, {});
      const unfilled = resolveRadarOptions(sample, { filled: false });
      expect(
        ((filled.series as Record<string, unknown>[])[0] as Record<string, unknown>).areaStyle,
      ).toBeDefined();
      expect(
        ((unfilled.series as Record<string, unknown>[])[0] as Record<string, unknown>).areaStyle,
      ).toBeUndefined();
    });

    it('hides the legend for a single-series radar by default and shows it otherwise', () => {
      const single = resolveRadarOptions(
        {
          indicators: sample.indicators,
          series: [{ name: 'Only', values: [1, 2, 3] }],
        },
        {},
      );
      const multi = resolveRadarOptions(sample, {});
      expect((single.legend as Record<string, unknown>).show).toBe(false);
      expect((multi.legend as Record<string, unknown>).show).toBe(true);
    });

    it('honors options.legend.show overrides', () => {
      const explicitOff = resolveRadarOptions(sample, { legend: { show: false } });
      const explicitOn = resolveRadarOptions(
        { indicators: sample.indicators, series: [{ name: 'Only', values: [1, 2, 3] }] },
        { legend: { show: true } },
      );
      expect((explicitOff.legend as Record<string, unknown>).show).toBe(false);
      expect((explicitOn.legend as Record<string, unknown>).show).toBe(true);
    });

    it('applies a palette color array sized to the number of series', () => {
      const option = resolveRadarOptions(sample, {});
      const colors = option.color as string[];
      expect(Array.isArray(colors)).toBe(true);
      expect(colors).toHaveLength(2);
      for (const c of colors) {
        expect(c).toMatch(/^#/);
      }
    });

    it('respects options.colorMap by series name', () => {
      const option = resolveRadarOptions(sample, {
        colorMap: { Budget: '#ff0000', Actual: '#00ff00' },
      });
      expect(option.color).toEqual(['#ff0000', '#00ff00']);
    });

    it('uses the configured radius when provided, otherwise the 65% baseline', () => {
      // Single-series radar hides the legend by default → no edge reserves
      // → radius lands on the baseline.
      const singleSeries = {
        indicators: sample.indicators,
        series: [{ name: 'Only', values: [1, 2, 3] }],
      };
      const def = resolveRadarOptions(singleSeries, {});
      const custom = resolveRadarOptions(singleSeries, { radius: '80%' });
      expect((def.radar as Record<string, unknown>).radius).toBe('65%');
      expect((custom.radar as Record<string, unknown>).radius).toBe('80%');
    });

    it('shifts radar center down when a title is set', () => {
      const singleSeries = {
        indicators: sample.indicators,
        series: [{ name: 'Only', values: [1, 2, 3] }],
      };
      const noTitle = resolveRadarOptions(singleSeries, {});
      const withTitle = resolveRadarOptions(singleSeries, { title: 'Hello' });
      const noTitleCenter = (noTitle.radar as Record<string, unknown>).center as string[];
      const withTitleCenter = (withTitle.radar as Record<string, unknown>).center as string[];
      expect(noTitleCenter).toEqual(['50%', '50%']);
      expect(withTitleCenter[0]).toBe('50%');
      // y center should drop past 50% to make room for the title.
      const yPct = parseInt(String(withTitleCenter[1]).replace('%', ''), 10);
      expect(yPct).toBeGreaterThan(50);
    });

    it('shifts center up and shrinks radius when legend reserves space at the bottom', () => {
      // Multi-series → legend shows by default at the bottom.
      const layout = resolveRadarOptions(sample, {}).radar as Record<string, unknown>;
      const center = layout.center as string[];
      expect(center[0]).toBe('50%');
      const yPct = parseInt(String(center[1]).replace('%', ''), 10);
      // Center pulled UP past the canvas midpoint to make room for the legend.
      expect(yPct).toBeLessThan(50);
      // Radius shrinks below the 65% baseline.
      const radiusPct = parseInt(String(layout.radius).replace('%', ''), 10);
      expect(radiusPct).toBeLessThan(65);
      expect(radiusPct).toBeGreaterThanOrEqual(45);
    });

    it('mirrors the same center shift on each legend position', () => {
      const top = resolveRadarOptions(sample, { legend: { show: true, position: 'top' } })
        .radar as Record<string, unknown>;
      const bottom = resolveRadarOptions(sample, { legend: { show: true, position: 'bottom' } })
        .radar as Record<string, unknown>;
      const left = resolveRadarOptions(sample, { legend: { show: true, position: 'left' } })
        .radar as Record<string, unknown>;
      const right = resolveRadarOptions(sample, { legend: { show: true, position: 'right' } })
        .radar as Record<string, unknown>;

      const yOf = (r: Record<string, unknown>) =>
        parseInt(String((r.center as string[])[1]).replace('%', ''), 10);
      const xOf = (r: Record<string, unknown>) =>
        parseInt(String((r.center as string[])[0]).replace('%', ''), 10);

      // top legend → center drops; bottom legend → center rises.
      expect(yOf(top)).toBeGreaterThan(50);
      expect(yOf(bottom)).toBeLessThan(50);
      // left legend → center moves right; right legend → center moves left.
      expect(xOf(left)).toBeGreaterThan(50);
      expect(xOf(right)).toBeLessThan(50);
    });

    it('does not reserve legend space when the legend is hidden', () => {
      const hidden = resolveRadarOptions(sample, { legend: { show: false } })
        .radar as Record<string, unknown>;
      expect(hidden.center).toEqual(['50%', '50%']);
      expect(hidden.radius).toBe('65%');
    });

    it('keeps user-supplied radius even when the legend is shown', () => {
      const r = resolveRadarOptions(sample, { radius: '70%' }).radar as Record<string, unknown>;
      expect(r.radius).toBe('70%');
    });

    it('hides the tooltip when tooltip.enabled is false', () => {
      const off = resolveRadarOptions(sample, { tooltip: { enabled: false } });
      expect((off.tooltip as Record<string, unknown>).show).toBe(false);
    });

    it('merges options.echarts last and lets the palette win on color', () => {
      const option = resolveRadarOptions(sample, {
        colorMap: { Budget: '#aaaaaa', Actual: '#bbbbbb' },
        echarts: {
          color: ['#111111'],
          radar: { splitNumber: 6 },
        },
      });
      expect((option.radar as Record<string, unknown>).splitNumber).toBe(6);
      // resolved palette replaces user-supplied echarts.color
      expect(option.color).toEqual(['#aaaaaa', '#bbbbbb']);
    });
  });

  describe('isRadarData', () => {
    it('accepts well-formed radar data', () => {
      expect(isRadarData(sample)).toBe(true);
    });

    it('rejects XY-shaped data with categories', () => {
      expect(
        isRadarData({
          categories: ['A', 'B'],
          series: [{ name: 'S', data: [1, 2] }],
          // cast around the union for the test fixture
        } as unknown as RadarData),
      ).toBe(false);
    });

    it('rejects pie-shaped data (plain array)', () => {
      expect(
        isRadarData([{ name: 'A', value: 1 }] as unknown as RadarData),
      ).toBe(false);
    });

    it('rejects graph-shaped data with nodes/links', () => {
      expect(
        isRadarData({
          nodes: [{ name: 'A' }],
          links: [],
        } as unknown as RadarData),
      ).toBe(false);
    });

    it('rejects gauge-shaped data', () => {
      expect(
        isRadarData({ value: 42, max: 100 } as unknown as RadarData),
      ).toBe(false);
    });

    it('rejects empty indicators or series', () => {
      expect(
        isRadarData({
          indicators: [],
          series: [{ name: 'S', values: [] }],
        } as unknown as RadarData),
      ).toBe(false);
      expect(
        isRadarData({
          indicators: [{ name: 'A' }],
          series: [],
        } as unknown as RadarData),
      ).toBe(false);
    });
  });
});
