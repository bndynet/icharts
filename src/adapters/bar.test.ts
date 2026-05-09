import { describe, it, expect } from 'vitest';
import type { XYData } from '../types.js';
import { resolveBarOptions } from './bar.js';

const racers = ['USA', 'China', 'India', 'Brazil', 'Japan'];

function frame(values: number[]): XYData {
  return {
    categories: racers,
    series: [{ name: 'Population', data: values }],
  };
}

const singleSeriesData: XYData = {
  categories: ['Chrome', 'Firefox', 'Safari', 'Edge'],
  series: [{ name: 'Share', data: [65, 15, 12, 8] }],
};

describe('bar adapter', () => {
  describe('default variant', () => {
    it('reserves bottom grid space only when the legend is shown', () => {
      const hidden = resolveBarOptions(singleSeriesData, {
        legend: { show: false },
      }).option.grid as Record<string, unknown>;
      const shown = resolveBarOptions(singleSeriesData, {
        legend: { show: true, position: 'bottom' },
      }).option.grid as Record<string, unknown>;
      expect(hidden.bottom).toBe(12);
      expect(shown.bottom).toBe(48);
    });

    it('returns a ChartSetupResult with notMerge undefined', () => {
      const result = resolveBarOptions(
        { categories: ['Q1', 'Q2'], series: [{ name: 'Sales', data: [10, 20] }] },
        {},
      );
      expect(result.option).toBeDefined();
      expect(result.notMerge).toBeUndefined();
    });
  });

  describe('bar sizing options', () => {
    it('propagates barWidth / barMaxWidth / barMinWidth to each series', () => {
      const { option } = resolveBarOptions(singleSeriesData, {
        barWidth: 24,
        barMaxWidth: '60%',
        barMinWidth: 4,
      });
      const series = (option.series as Record<string, unknown>[])[0];
      expect(series.barWidth).toBe(24);
      expect(series.barMaxWidth).toBe('60%');
      expect(series.barMinWidth).toBe(4);
    });

    it('propagates barGap / barCategoryGap to each series', () => {
      const data: XYData = {
        categories: ['Q1', 'Q2'],
        series: [
          { name: 'A', data: [10, 20] },
          { name: 'B', data: [15, 25] },
        ],
      };
      const { option } = resolveBarOptions(data, {
        barGap: '10%',
        barCategoryGap: '40%',
      });
      const seriesArr = option.series as Record<string, unknown>[];
      for (const s of seriesArr) {
        expect(s.barGap).toBe('10%');
        expect(s.barCategoryGap).toBe('40%');
      }
    });

    it('omits sizing fields when bar options are absent', () => {
      const { option } = resolveBarOptions(singleSeriesData, {});
      const series = (option.series as Record<string, unknown>[])[0];
      expect(series.barWidth).toBeUndefined();
      expect(series.barGap).toBeUndefined();
      expect(series.barCategoryGap).toBeUndefined();
    });

    it('propagates sizing fields to the race variant series', () => {
      const result = resolveBarOptions(singleSeriesData, {
        variant: 'race',
        barWidth: '60%',
        barCategoryGap: '20%',
      });
      const series = (result.option.series as Record<string, unknown>[])[0];
      expect(series.barWidth).toBe('60%');
      expect(series.barCategoryGap).toBe('20%');
    });
  });

  describe('colorByCategory (single-series, non-race)', () => {
    it('emits one color per category drawn from the resolver', () => {
      const { option } = resolveBarOptions(singleSeriesData, {
        colorByCategory: true,
      });
      const color = option.color as string[];
      expect(color).toHaveLength(singleSeriesData.categories.length);
      color.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
    });

    it('marks the series with colorBy: "data" so ECharts cycles option.color', () => {
      const { option } = resolveBarOptions(singleSeriesData, {
        colorByCategory: true,
      });
      const series = (option.series as Record<string, unknown>[])[0];
      expect(series.colorBy).toBe('data');
    });

    it('hides the legend (its series-color marker would mislead)', () => {
      const { option } = resolveBarOptions(singleSeriesData, {
        colorByCategory: true,
      });
      const legend = option.legend as Record<string, unknown>;
      expect(legend.show).toBe(false);
    });

    it('does not reserve bottom legend space when the legend is hidden', () => {
      const { option } = resolveBarOptions(singleSeriesData, {
        colorByCategory: true,
      });
      const grid = option.grid as Record<string, unknown>;
      expect(grid.bottom).toBe(12);
    });

    it('honors colorMap keyed by category name', () => {
      const { option } = resolveBarOptions(singleSeriesData, {
        colorByCategory: true,
        colorMap: { Chrome: '#4285F4', Firefox: '#FF7139' },
      });
      const color = option.color as string[];
      expect(color[0]).toBe('#4285F4');
      expect(color[1]).toBe('#FF7139');
    });

    it('is silently ignored when stacked: true', () => {
      const data: XYData = {
        categories: ['Q1', 'Q2'],
        series: [
          { name: 'A', data: [10, 20] },
          { name: 'B', data: [15, 25] },
        ],
      };
      const { option } = resolveBarOptions(data, {
        stacked: true,
        colorByCategory: true,
      });
      const color = option.color as string[];
      expect(color).toHaveLength(2); // one per series, not per category
      const series = (option.series as Record<string, unknown>[])[0];
      expect(series.colorBy).toBeUndefined();
      const legend = option.legend as Record<string, unknown>;
      expect(legend.show).not.toBe(false);
    });

    it('is silently ignored when the chart has multiple series', () => {
      const data: XYData = {
        categories: ['Q1', 'Q2'],
        series: [
          { name: 'A', data: [10, 20] },
          { name: 'B', data: [15, 25] },
        ],
      };
      const { option } = resolveBarOptions(data, {
        colorByCategory: true,
      });
      const color = option.color as string[];
      expect(color).toHaveLength(2); // one per series
      const series = (option.series as Record<string, unknown>[])[0];
      expect(series.colorBy).toBeUndefined();
    });
  });

  describe('race variant', () => {
    it('returns notMerge: false so ECharts animates between frames', () => {
      const result = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
      });
      expect(result.notMerge).toBe(false);
    });

    it('sets yAxis as inverse category axis with stable racer order', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
      });
      const yAxis = option.yAxis as Record<string, unknown>;
      expect(yAxis.type).toBe('category');
      expect(yAxis.inverse).toBe(true);
      expect(yAxis.data).toEqual(racers);
    });

    it('enables realtimeSort and value-animated labels on the series', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
      });
      const series = (option.series as Record<string, unknown>[])[0];
      expect(series.type).toBe('bar');
      expect(series.realtimeSort).toBe(true);
      const label = series.label as Record<string, unknown>;
      expect(label.show).toBe(true);
      expect(label.valueAnimation).toBe(true);
      expect(label.position).toBe('right');
    });

    it('passes raw values to series.data (no per-bar itemStyle wrapping)', () => {
      const values = [100, 200, 150, 80, 60];
      const { option } = resolveBarOptions(frame(values), { variant: 'race' });
      const series = (option.series as Record<string, unknown>[])[0];
      expect(series.data).toEqual(values);
    });

    it('sets xAxis.max to "dataMax"', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
      });
      const xAxis = option.xAxis as Record<string, unknown>;
      expect(xAxis.max).toBe('dataMax');
    });

    it('maps race.topN to yAxis.max = topN - 1', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
        race: { topN: 3 },
      });
      const yAxis = option.yAxis as Record<string, unknown>;
      expect(yAxis.max).toBe(2);
    });

    it('omits yAxis.max when race.topN is unset', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
      });
      const yAxis = option.yAxis as Record<string, unknown>;
      expect(yAxis.max).toBeUndefined();
    });

    it('uses race.frameDuration for animationDurationUpdate (default 500)', () => {
      // No ctx + no explicit value → fallback. See LineRaceOptions for the
      // reasoning behind 500ms as the picked default.
      const defaultResult = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
      });
      expect(defaultResult.option.animationDurationUpdate).toBe(500);

      const customResult = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
        race: { frameDuration: 1000 },
      });
      expect(customResult.option.animationDurationUpdate).toBe(1000);
    });

    it('auto-measures animationDurationUpdate from ctx.observedFrameMs', () => {
      // Engine threads the inter-update gap through RenderContext so callers
      // don't have to mirror their setInterval value as race.frameDuration.
      const { option } = resolveBarOptions(
        frame([100, 200, 150, 80, 60]),
        { variant: 'race' },
        { observedFrameMs: 200 },
      );
      expect(option.animationDurationUpdate).toBe(200);
    });

    it('explicit race.frameDuration overrides ctx.observedFrameMs', () => {
      const { option } = resolveBarOptions(
        frame([100, 200, 150, 80, 60]),
        { variant: 'race', race: { frameDuration: 2000 } },
        { observedFrameMs: 200 },
      );
      expect(option.animationDurationUpdate).toBe(2000);
    });

    it('pins initial animationDuration to 0 and uses linear easing', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
      });
      expect(option.animationDuration).toBe(0);
      expect(option.animationEasing).toBe('linear');
      expect(option.animationEasingUpdate).toBe('linear');
    });

    it('honors race.showValueLabel = false', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
        race: { showValueLabel: false },
      });
      const series = (option.series as Record<string, unknown>[])[0];
      const label = series.label as Record<string, unknown>;
      expect(label.show).toBe(false);
    });

    describe('adaptive label headroom', () => {
      it('reserves grid.right so value labels are not clipped', () => {
        const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
        });
        const grid = option.grid as Record<string, unknown>;
        // Floor (RACE_LABEL_MIN_PX) prevents anyone from going below ~32px;
        // anything larger is fine — the exact value depends on whether a
        // canvas is available for measurement.
        expect(typeof grid.right).toBe('number');
        expect(grid.right as number).toBeGreaterThanOrEqual(32);
      });

      it('respects an explicit options.grid.right (no override)', () => {
        const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
          grid: { right: 24 },
        });
        const grid = option.grid as Record<string, unknown>;
        expect(grid.right).toBe(24);
      });

      it('skips headroom when showValueLabel is false (nothing to make room for)', () => {
        const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
          race: { showValueLabel: false },
        });
        const grid = option.grid as Record<string, unknown>;
        // buildGrid's default right padding (no extra headroom)
        expect(grid.right).toBe(12);
      });

      it('grows with longer value strings', () => {
        const { option: narrow } = resolveBarOptions(frame([1, 2, 3, 4, 5]), {
          variant: 'race',
        });
        const { option: wide } = resolveBarOptions(
          frame([1234567890, 2345678901, 1, 1, 1]),
          { variant: 'race' },
        );
        const narrowRight = (narrow.grid as Record<string, number>).right;
        const wideRight = (wide.grid as Record<string, number>).right;
        expect(wideRight).toBeGreaterThanOrEqual(narrowRight);
      });

      it('honors ctx.maxRaceGridRight as a monotonic floor', () => {
        const { option } = resolveBarOptions(
          frame([1, 2, 3, 4, 5]),
          { variant: 'race' },
          { maxRaceGridRight: 200 },
        );
        const grid = option.grid as Record<string, unknown>;
        expect(grid.right).toBeGreaterThanOrEqual(200);
      });
    });

    it('writes the resolved palette into option.color', () => {
      const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
        variant: 'race',
        colorMap: { Population: '#abcdef' },
      });
      const color = option.color as string[];
      expect(color[0]).toBe('#abcdef');
    });

    describe('with colorByCategory', () => {
      it('emits one color per racer (categories palette)', () => {
        const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
          colorByCategory: true,
        });
        const color = option.color as string[];
        expect(color).toHaveLength(racers.length);
      });

      it('sets series[0].colorBy to "data" so each racer is painted distinctly', () => {
        const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
          colorByCategory: true,
        });
        const series = (option.series as Record<string, unknown>[])[0];
        expect(series.colorBy).toBe('data');
      });

      it('hides the legend in race mode too', () => {
        const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
          colorByCategory: true,
        });
        const legend = option.legend as Record<string, unknown>;
        expect(legend.show).toBe(false);
      });

      it('preserves notMerge: false (frame-to-frame animation still works)', () => {
        const result = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
          colorByCategory: true,
        });
        expect(result.notMerge).toBe(false);
      });

      it('honors colorMap keyed by racer name', () => {
        const { option } = resolveBarOptions(frame([100, 200, 150, 80, 60]), {
          variant: 'race',
          colorByCategory: true,
          colorMap: { USA: '#3c3b6e', China: '#de2910' },
        });
        const color = option.color as string[];
        expect(color[0]).toBe('#3c3b6e');
        expect(color[1]).toBe('#de2910');
      });
    });
  });
});
