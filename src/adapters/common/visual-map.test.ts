import { describe, it, expect } from 'vitest';
import { buildVisualMap } from './visual-map.js';
import { chartDarkTheme, chartLightTheme, switchTheme } from '../../themes/index.js';

type VisualMapOption = Record<string, unknown>;

function lowStop(option: Record<string, unknown> | undefined): string {
  const inRange = option?.inRange as { color: string[] } | undefined;
  return inRange?.color[0] ?? '';
}

function build(
  themeColors: typeof chartLightTheme.colors,
): VisualMapOption | undefined {
  return buildVisualMap(
    [0, 100],
    undefined,
    '#3b82f6',
    'vertical',
    true,
    themeColors,
  );
}

describe('buildVisualMap — theme tokens', () => {
  it('blends the low stop over the supplied theme surface', () => {
    const light = build(chartLightTheme.colors);
    const dark = build(chartDarkTheme.colors);

    // Light surface is #ffffff, dark surface #1e293b — the 20 % blend must
    // differ, proving the passed tokens (not the active theme) drive it.
    expect(lowStop(light)).not.toBe(lowStop(dark));
    expect(lowStop(light)).toMatch(/^rgb\(/);
    expect(lowStop(dark)).toMatch(/^rgb\(/);
  });

  it('falls back to the active theme tokens when themeColors is omitted', () => {
    switchTheme('dark');
    try {
      const implicit = buildVisualMap(
        [0, 100],
        undefined,
        '#3b82f6',
        'vertical',
      );
      expect(implicit).toEqual(build(chartDarkTheme.colors));
    } finally {
      switchTheme('light');
    }
  });
});
