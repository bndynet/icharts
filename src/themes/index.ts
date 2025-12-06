import { ColorHub, type StateColors } from '@bndynet/color-hub';
import * as echarts from 'echarts';
import { buildEChartsTheme } from './echarts-theme.js';
import { darkTheme, lightTheme, chartThemes } from './presets.js';
import type { ChartTheme, ChartThemeColors, ChartThemeConfig } from './types.js';

// ColorHub's sole responsibility here: assign palette colors to series by name.
// UI / structural colors (background, text, grid, …) are managed by ChartThemeColors.
const colorHub = new ColorHub<ChartThemeColors>(chartThemes);

let registered = false;

/**
 * Register all built-in chart themes with ECharts.
 * Called lazily on first chart render.
 */
export function ensureThemesRegistered(): void {
  if (registered) return;
  registered = true;

  for (const theme of chartThemes) {
    if (theme.colors && theme.palette) {
      echarts.registerTheme(theme.name, buildEChartsTheme(theme.colors, theme.palette));
    }
  }
}

export function switchTheme(name: string): void {
  colorHub.switchTheme(name);
}

export function getSeriesColor(name: string): StateColors {
  return colorHub.getColors(name);
}

export function getCurrentTheme(): ChartTheme {
  return colorHub.getCurrentTheme();
}

export function getThemeColors(): ChartThemeColors | undefined {
  return colorHub.getCurrentTheme().colors;
}

/**
 * Register a custom chart theme with both ColorHub and ECharts.
 *
 * Missing `colors` tokens are automatically inherited from the built-in
 * `light` or `dark` base theme according to `colorMode` (defaults to `light`).
 * A missing `palette` is also inherited from the base.
 */
export function registerTheme(config: ChartThemeConfig): void {
  const base = config.colorMode === 'dark' ? darkTheme : lightTheme;
  const theme: ChartTheme = {
    ...config,
    colors: { ...base.colors!, ...config.colors },
    palette: config.palette ?? base.palette!,
  };
  colorHub.appendTheme(theme);
  echarts.registerTheme(theme.name, buildEChartsTheme(theme.colors!, theme.palette!));
}

/**
 * Resolve the effective ECharts theme name.
 * Defaults to the built-in light theme when none is specified.
 */
export function resolveThemeName(name?: string): string {
  return name || lightTheme.name;
}

/**
 * Build the palette color array for a chart given series names, user colors/colorMap,
 * and the active ColorHub theme.
 */
export function resolveSeriesColors(
  seriesNames: string[],
  userColors?: string[],
  userColorMap?: Record<string, string>,
): string[] {
  if (userColors && userColors.length >= seriesNames.length) {
    return userColors.slice(0, seriesNames.length);
  }

  return seriesNames.map((name) => {
    if (userColorMap?.[name]) return userColorMap[name];
    return colorHub.getColors(name).default;
  });
}

export { colorHub };
export type { ChartTheme, ChartThemeColors, ChartThemeConfig };
export { lightTheme as chartLightTheme, darkTheme as chartDarkTheme, chartThemes } from './presets.js';
