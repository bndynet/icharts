import { describe, it, expect } from 'vitest';
import type { XYData } from '../types.js';
import { resolveLineOptions } from './line.js';

const racers = ['China', 'India', 'USA', 'Nigeria', 'Pakistan'];

/** Build a growing-trail frame: each series carries the same number of points
 *  as `years` (typical line-race shape — trails extend each frame). */
function frame(years: number[], trails: Record<string, number[]>): XYData {
  return {
    categories: years,
    series: racers.map((name) => ({ name, data: trails[name] })),
  };
}

const smallFrame: XYData = frame([1960, 1961, 1962], {
  China:    [660, 676, 693],
  India:    [449, 462, 476],
  USA:      [186, 189, 193],
  Nigeria:  [45,  48,  51],
  Pakistan: [45,  47,  50],
});

const defaultFrame: XYData = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Sales', data: [10, 12, 14, 18] },
    { name: 'Costs', data: [6, 7, 8, 9] },
  ],
};

describe('line adapter', () => {
  describe('default variant', () => {
    it('returns a ChartSetupResult with notMerge undefined', () => {
      const result = resolveLineOptions(defaultFrame, {});
      expect(result.option).toBeDefined();
      expect(result.notMerge).toBeUndefined();
    });

    it('resolves a palette color per series', () => {
      const { option } = resolveLineOptions(defaultFrame, {});
      const color = option.color as string[];
      expect(color).toHaveLength(defaultFrame.series.length);
    });

    it('does not emit race-only animation fields', () => {
      const { option } = resolveLineOptions(defaultFrame, {});
      expect(option.animationDurationUpdate).toBeUndefined();
      expect(option.animationEasingUpdate).toBeUndefined();
    });
  });

  describe('race variant', () => {
    it('returns notMerge: false so ECharts animates between frames', () => {
      const result = resolveLineOptions(smallFrame, { variant: 'race' });
      expect(result.notMerge).toBe(false);
    });

    it('uses race.frameDuration for animationDurationUpdate (default 500)', () => {
      // No ctx + no explicit value → fallback. 500 is the picked default
      // because most ticker / live-stream demos sit in the 200..1000 ms band
      // and this is the closest single number that doesn't look frozen.
      const defaults = resolveLineOptions(smallFrame, { variant: 'race' });
      expect(defaults.option.animationDurationUpdate).toBe(500);

      const custom = resolveLineOptions(smallFrame, {
        variant: 'race',
        race: { frameDuration: 1500 },
      });
      expect(custom.option.animationDurationUpdate).toBe(1500);
    });

    describe('frameDuration auto-measure (ctx.observedFrameMs)', () => {
      it('uses observedFrameMs when race.frameDuration is unset', () => {
        const { option } = resolveLineOptions(
          smallFrame,
          { variant: 'race' },
          { observedFrameMs: 250 },
        );
        expect(option.animationDurationUpdate).toBe(250);
      });

      it('explicit race.frameDuration always wins over observation', () => {
        const { option } = resolveLineOptions(
          smallFrame,
          { variant: 'race', race: { frameDuration: 1200 } },
          { observedFrameMs: 250 },
        );
        expect(option.animationDurationUpdate).toBe(1200);
      });

      it('clamps absurdly small observations up to 80ms', () => {
        // A rapid burst of synchronous updates would otherwise drive
        // animationDurationUpdate toward 0 and freeze the chart visually.
        const { option } = resolveLineOptions(
          smallFrame,
          { variant: 'race' },
          { observedFrameMs: 5 },
        );
        expect(option.animationDurationUpdate).toBe(80);
      });

      it('clamps absurdly large observations down to 3000ms', () => {
        // Long idle followed by a single update would otherwise lock the
        // next several frames behind a multi-second animation.
        const { option } = resolveLineOptions(
          smallFrame,
          { variant: 'race' },
          { observedFrameMs: 30_000 },
        );
        expect(option.animationDurationUpdate).toBe(3000);
      });

      it('ignores non-finite observations and uses the 500ms fallback', () => {
        const { option } = resolveLineOptions(
          smallFrame,
          { variant: 'race' },
          { observedFrameMs: NaN },
        );
        expect(option.animationDurationUpdate).toBe(500);
      });
    });

    it('pins initial animationDuration to 0 and uses linear easing', () => {
      const { option } = resolveLineOptions(smallFrame, { variant: 'race' });
      expect(option.animationDuration).toBe(0);
      expect(option.animationEasing).toBe('linear');
      expect(option.animationEasingUpdate).toBe('linear');
    });

    it('attaches a value-animated endLabel to every series (default)', () => {
      const { option } = resolveLineOptions(smallFrame, { variant: 'race' });
      const series = option.series as Record<string, unknown>[];
      expect(series).toHaveLength(racers.length);
      for (const s of series) {
        const endLabel = s.endLabel as Record<string, unknown> | undefined;
        expect(endLabel).toBeDefined();
        expect(endLabel?.show).toBe(true);
        expect(endLabel?.valueAnimation).toBe(true);
        expect(typeof endLabel?.formatter).toBe('function');
      }
    });

    it('omits endLabel when race.showValueLabel is false', () => {
      const { option } = resolveLineOptions(smallFrame, {
        variant: 'race',
        race: { showValueLabel: false },
      });
      const series = option.series as Record<string, unknown>[];
      for (const s of series) {
        expect(s.endLabel).toBeUndefined();
      }
    });

    it('hides intermediate symbols on every line', () => {
      const { option } = resolveLineOptions(smallFrame, { variant: 'race' });
      const series = option.series as Record<string, unknown>[];
      for (const s of series) {
        expect(s.showSymbol).toBe(false);
      }
    });

    describe('adaptive label headroom', () => {
      it('reserves grid.right so end labels are not clipped', () => {
        const { option } = resolveLineOptions(smallFrame, { variant: 'race' });
        const grid = option.grid as Record<string, unknown>;
        // Floor (RACE_LABEL_MIN_PX) protects very short labels; anything
        // wider is fine — the exact value depends on whether canvas
        // measurement is available.
        expect(typeof grid.right).toBe('number');
        expect(grid.right as number).toBeGreaterThanOrEqual(32);
      });

      it('respects an explicit options.grid.right (no override)', () => {
        const { option } = resolveLineOptions(smallFrame, {
          variant: 'race',
          grid: { right: 24 },
        });
        const grid = option.grid as Record<string, unknown>;
        expect(grid.right).toBe(24);
      });

      it('skips headroom when race.showValueLabel is false', () => {
        const { option } = resolveLineOptions(smallFrame, {
          variant: 'race',
          race: { showValueLabel: false },
        });
        const grid = option.grid as Record<string, unknown>;
        // buildGrid's default right padding only
        expect(grid.right).toBe(12);
      });

      it('grows with longer "<name> <value>" strings', () => {
        const narrowData: XYData = {
          categories: ['t1'],
          series: [
            { name: 'A', data: [1] },
            { name: 'B', data: [2] },
          ],
        };
        const wideData: XYData = {
          categories: ['t1'],
          series: [
            { name: 'ALongerSeriesName', data: [1234567890] },
            { name: 'AnotherLongerSeriesName', data: [987654321] },
          ],
        };
        const { option: narrow } = resolveLineOptions(narrowData, { variant: 'race' });
        const { option: wide } = resolveLineOptions(wideData, { variant: 'race' });
        const narrowRight = (narrow.grid as Record<string, number>).right;
        const wideRight = (wide.grid as Record<string, number>).right;
        expect(wideRight).toBeGreaterThanOrEqual(narrowRight);
      });

      it('honors ctx.maxRaceGridRight as a monotonic floor', () => {
        const { option } = resolveLineOptions(
          smallFrame,
          { variant: 'race' },
          { maxRaceGridRight: 200 },
        );
        const grid = option.grid as Record<string, unknown>;
        expect(grid.right).toBeGreaterThanOrEqual(200);
      });
    });

    it('writes the resolved per-series palette into option.color', () => {
      const { option } = resolveLineOptions(smallFrame, {
        variant: 'race',
        colorMap: { China: '#de2910', India: '#ff9933' },
      });
      const color = option.color as string[];
      expect(color).toHaveLength(racers.length);
      expect(color[0]).toBe('#de2910');
      expect(color[1]).toBe('#ff9933');
    });

    it('renders one line per racer with the original series names', () => {
      const { option } = resolveLineOptions(smallFrame, { variant: 'race' });
      const series = option.series as Record<string, unknown>[];
      expect(series.map((s) => s.name)).toEqual(racers);
      for (const s of series) {
        expect(s.type).toBe('line');
      }
    });

    it('endLabel formatter shows seriesName and the latest value', () => {
      const { option } = resolveLineOptions(smallFrame, { variant: 'race' });
      const series = option.series as Record<string, unknown>[];
      const endLabel = series[0].endLabel as { formatter: (p: unknown) => string };
      // Non-time data: params.value is a scalar
      expect(endLabel.formatter({ seriesName: 'China', value: 693 })).toBe('China 693');
      // Time data: params.value is a [time, value] tuple — formatter pulls the last entry
      expect(endLabel.formatter({ seriesName: 'India', value: ['2020-01', 476] })).toBe('India 476');
    });

    describe('streaming axis pinning', () => {
      // 13-digit ms timestamps trigger isTimeCategories → time axis
      const timeFrame: XYData = {
        categories: [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 2), Date.UTC(2024, 0, 3)],
        series: [{ name: 'A', data: [10, 20, 15] }],
      };

      it('auto-pins xAxis.min to categories[0] on time-axis race', () => {
        const { option } = resolveLineOptions(timeFrame, { variant: 'race' });
        const xAxis = option.xAxis as Record<string, unknown>[];
        expect(xAxis[0].type).toBe('time');
        expect(xAxis[0].min).toBe(timeFrame.categories[0]);
      });

      it('does not override an explicit options.xAxis.min', () => {
        const { option } = resolveLineOptions(timeFrame, {
          variant: 'race',
          xAxis: { min: Date.UTC(2023, 0, 1) },
        });
        const xAxis = option.xAxis as Record<string, unknown>[];
        expect(xAxis[0].min).toBe(Date.UTC(2023, 0, 1));
      });

      it('passes through options.xAxis.max for full-domain pinning', () => {
        const { option } = resolveLineOptions(timeFrame, {
          variant: 'race',
          xAxis: { max: Date.UTC(2024, 11, 31) },
        });
        const xAxis = option.xAxis as Record<string, unknown>[];
        expect(xAxis[0].max).toBe(Date.UTC(2024, 11, 31));
      });

      it('does not auto-pin xAxis.min on category-axis race (no domain to pin)', () => {
        // Non-time categories → category axis → ECharts derives domain from
        // `data`, so `min` would be ignored. We explicitly skip the auto-pin
        // to avoid emitting dead config.
        const { option } = resolveLineOptions(smallFrame, { variant: 'race' });
        const xAxis = option.xAxis as Record<string, unknown>[];
        expect(xAxis[0].type).toBe('category');
        expect(xAxis[0].min).toBeUndefined();
      });

      it('treats NaN min/max as unset and still auto-pins min', () => {
        // Regression: if a user accidentally passes Date.UTC(undefined, ...)
        // (e.g. via a TDZ ordering bug), the resulting NaN must NOT be
        // forwarded to ECharts (it would collapse the axis to one tick).
        // The adapter strips NaN and falls back to its auto-pin default.
        const { option } = resolveLineOptions(timeFrame, {
          variant: 'race',
          xAxis: { min: NaN, max: NaN },
        });
        const xAxis = option.xAxis as Record<string, unknown>[];
        expect(xAxis[0].min).toBe(timeFrame.categories[0]);
        expect(xAxis[0].max).toBeUndefined();
      });

      it('keeps time axis when categories cross the epoch (contains 0)', () => {
        // Regression for the population-trail demo: as the trail grew past
        // year 1970, `categories` started including `Date.UTC(1970,0,1) = 0`.
        // The old isTimeCategories rejected 0 (length 1 != 10/13), causing
        // the axis to flip from `time` to `category` mid-stream and the
        // already-merged ECharts state to collapse all points onto a single
        // pixel column. Now 0 is allowed as long as another entry anchors
        // the array as time-like.
        const crossEpoch: XYData = {
          categories: [
            Date.UTC(1969, 0, 1),
            0, // epoch — the previously-fatal value
            Date.UTC(1971, 0, 1),
          ],
          series: [{ name: 'A', data: [1, 2, 3] }],
        };
        const { option } = resolveLineOptions(crossEpoch, { variant: 'race' });
        const xAxis = option.xAxis as Record<string, unknown>[];
        expect(xAxis[0].type).toBe('time');
      });

      it('honors dateFormat as an explicit time-axis opt-in', () => {
        // If the heuristic alone wouldn't detect time (e.g. small numeric
        // year labels like [1960, 1961, 1962]), `dateFormat` still forces
        // the time axis path. This is the recommended escape hatch for
        // demos that don't want to think about timestamp magnitudes.
        const { option } = resolveLineOptions(smallFrame, {
          variant: 'race',
          xAxis: { dateFormat: 'YYYY' },
        });
        const xAxis = option.xAxis as Record<string, unknown>[];
        expect(xAxis[0].type).toBe('time');
      });
    });
  });
});

describe('AxisOptions min/max propagation', () => {
  it('writes xAxis.min/max into the built axis', () => {
    const data: XYData = {
      categories: [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 2)],
      series: [{ name: 'A', data: [10, 20] }],
    };
    const { option } = resolveLineOptions(data, {
      xAxis: { min: 100, max: 200 },
    });
    const xAxis = option.xAxis as Record<string, unknown>[];
    expect(xAxis[0].min).toBe(100);
    expect(xAxis[0].max).toBe(200);
  });

  it('writes yAxis.min/max into the built first axis', () => {
    const { option } = resolveLineOptions(defaultFrame, {
      yAxis: { min: 0, max: 50 },
    });
    const yAxis = option.yAxis as Record<string, unknown>[];
    expect(yAxis[0].min).toBe(0);
    expect(yAxis[0].max).toBe(50);
  });

  it('accepts string values like "dataMin" / "dataMax"', () => {
    const { option } = resolveLineOptions(defaultFrame, {
      yAxis: { min: 'dataMin', max: 'dataMax' },
    });
    const yAxis = option.yAxis as Record<string, unknown>[];
    expect(yAxis[0].min).toBe('dataMin');
    expect(yAxis[0].max).toBe('dataMax');
  });
});
