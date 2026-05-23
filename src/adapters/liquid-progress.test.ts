import { describe, it, expect } from 'vitest';
import type {
  LiquidProgressData,
  LiquidProgressChartOptions,
} from '../types.js';
import { resolveLiquidProgressOptions } from './liquid-progress.js';
import { DEFAULT_LABEL_FONT_SIZE } from './common/index.js';
import { getCurrentTheme } from '../themes/index.js';
import { hexToRgb } from '../utils.js';

const sample: LiquidProgressData = { value: 72, max: 100, label: 'Storage' };

const seriesOf = (
  option: ReturnType<typeof resolveLiquidProgressOptions>,
): Record<string, unknown> => (option.series as Record<string, unknown>[])[0];

const payloadOf = (
  option: ReturnType<typeof resolveLiquidProgressOptions>,
): Record<string, unknown> =>
  (seriesOf(option).itemPayload as Record<string, unknown>) ?? {};

describe('liquid-progress adapter', () => {
  it('builds a custom liquidFill series', () => {
    const result = resolveLiquidProgressOptions(sample, {});
    const series = seriesOf(result);
    expect(series.type).toBe('custom');
    expect(series.renderItem).toBe('liquidFill');
    expect(series.coordinateSystem).toBe('none');
    expect(series.data).toEqual([[0.72], [0.69], [0.66]]);
    expect((series.itemStyle as { color: string }).color).toMatch(/^#/);
    const label = series.label as Record<string, unknown>;
    expect(label.fontSize).toBe(24);
    expect(label.formatter).toBe('{primary|72%}\n{secondary|Storage}');
    const rich = label.rich as Record<string, Record<string, unknown>>;
    expect(rich.primary.fontSize).toBe(24);
    expect(rich.secondary.fontSize).toBe(DEFAULT_LABEL_FONT_SIZE);
    // For better readability, the adapter prefers textSecondary but can
    // automatically fall back to textPrimary when contrast with the liquid
    // fill color is too low.
    expect(rich.secondary.color).toBe(getCurrentTheme().colors?.textPrimary);
  });

  it('uses the default radius and center without title reserve', () => {
    const result = resolveLiquidProgressOptions(sample, {});
    const payload = payloadOf(result);
    const series = seriesOf(result);
    const seriesColor = (series.itemStyle as { color: string }).color;
    const expectedAlpha = getCurrentTheme().colorMode === 'dark' ? 0.24 : 0.14;
    expect(payload.radius).toBe('70%');
    expect(payload.center).toEqual(['50%', '50%']);
    const bg = payload.backgroundStyle as Record<string, unknown>;
    expect(bg.color).toBe(`rgba(${hexToRgb(seriesColor)}, ${expectedAlpha})`);
  });

  it('shifts center down when title is present', () => {
    const result = resolveLiquidProgressOptions(sample, { title: 'Storage Usage' });
    const payload = payloadOf(result);
    expect(payload.center).toEqual(['50%', '58%']);
  });

  it('honors waveCount and clamps wave data into [0,1]', () => {
    const result = resolveLiquidProgressOptions(
      { value: 150, max: 100, label: 'Storage' },
      { waveCount: 5 },
    );
    expect(seriesOf(result).data).toEqual([[1], [0.97], [0.94], [0.91], [0.88]]);
  });

  it('renders 0% when max is invalid', () => {
    const result = resolveLiquidProgressOptions(
      { value: 42, max: 0, label: 'Storage' },
      {},
    );
    const label = seriesOf(result).label as Record<string, unknown>;
    expect(label.formatter).toBe('{primary|0%}\n{secondary|Storage}');
    expect(seriesOf(result).data).toEqual([[0], [0], [0]]);
  });

  it('merges options.echarts last while palette still wins on color', () => {
    const options: LiquidProgressChartOptions = {
      colorMap: { Storage: '#10b981' },
      echarts: {
        series: [{ z: 9 }],
        color: ['#111111'],
      },
    };
    const result = resolveLiquidProgressOptions(sample, options);
    const series = seriesOf(result);
    expect(series.z).toBe(9);
    expect(result.color).toEqual(['#10b981']);
  });

  it('honors labelFontSize via shared getLabelFontSize contract', () => {
    const result = resolveLiquidProgressOptions(sample, { labelFontSize: 18 });
    const label = seriesOf(result).label as Record<string, unknown>;
    expect(label.fontSize).toBe(18);
    const rich = label.rich as Record<string, Record<string, unknown>>;
    expect(rich.primary.fontSize).toBe(18);
    expect(rich.secondary.fontSize).toBe(18);
  });

  it('auto-sizes first-line font from container dimensions when labelFontSize is not set', () => {
    const result = resolveLiquidProgressOptions(
      sample,
      {},
      { containerWidth: 320, containerHeight: 320 },
    );
    const label = seriesOf(result).label as Record<string, unknown>;
    expect(label.fontSize).toBe(35);
  });
});
