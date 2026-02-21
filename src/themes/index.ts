import { ColorHub, type StateColors } from '@bndynet/color-hub';
import * as echarts from 'echarts';
import { buildEChartsTheme } from './echarts-theme.js';
import { darkTheme, lightTheme, chartThemes } from './presets.js';
import type { ChartTheme, ChartThemeColors, ChartThemeConfig } from './types.js';
import { chartRegistry } from '../registry.js';

// ColorHub's sole responsibility here: assign palette colors to series by name.
// UI / structural colors (background, text, grid, …) are managed by ChartThemeColors.
let colorHub = new ColorHub<ChartThemeColors>(chartThemes);

const knownThemeNames = new Set<string>(chartThemes.map((t) => t.name));
const allThemes: ChartTheme[] = [...chartThemes];

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
  for (const chart of chartRegistry) {
    chart.setTheme(name);
  }
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
  knownThemeNames.add(theme.name);
  allThemes.push(theme);
  echarts.registerTheme(theme.name, buildEChartsTheme(theme.colors!, theme.palette!));
}

/**
 * Resolve the effective ECharts theme name.
 * When no explicit name is provided, falls back to the currently active
 * ColorHub theme so charts created after a theme switch pick up the right theme.
 */
export function resolveThemeName(name?: string): string {
  return name || colorHub.getCurrentTheme().name;
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

/**
 * Pre-register name → color mappings.
 * When `themeName` is provided, applies only to that theme.
 * When omitted, applies to every registered theme.
 * Only meaningful when `consistentColors` is enabled.
 */
export function setColorMap(
  map: Record<string, string>,
  themeName?: string,
): void {
  const prevName = colorHub.getCurrentTheme().name;

  const targets = themeName ? [themeName] : [...knownThemeNames];
  for (const name of targets) {
    colorHub.switchTheme(name);
    const theme = colorHub.getCurrentTheme();
    theme.colorMap = { ...theme.colorMap, ...map };
  }

  colorHub.switchTheme(prevName);
}

/**
 * Clear all name → color assignments accumulated by ColorHub.
 * Call this when navigating between dashboards to start fresh.
 *
 * When `themeName` is omitted (or not provided), rebuilds the entire ColorHub
 * so the internal palette index resets to 0 — the next dashboard starts
 * cleanly from `palette[0]`.
 *
 * When `themeName` is provided, only that theme's colorMap is cleared (the
 * palette index is NOT reset since it is shared across themes).
 */
export function resetColorMap(themeName?: string): void {
  if (themeName) {
    const prevName = colorHub.getCurrentTheme().name;
    colorHub.switchTheme(themeName);
    colorHub.getCurrentTheme().colorMap = {};
    colorHub.switchTheme(prevName);
    return;
  }

  const prevThemeName = colorHub.getCurrentTheme().name;
  const cleanThemes = allThemes.map((t) => ({ ...t, colorMap: {} }));
  colorHub = new ColorHub<ChartThemeColors>(cleanThemes);
  colorHub.switchTheme(prevThemeName);
}

/**
 * Resolve colors by palette position (index 0, 1, 2, …) independent of series names.
 * Each chart starts from palette[0], cycling if more names than palette entries.
 */
export function resolveColorsByPosition(
  seriesNames: string[],
  userColors?: string[],
  userColorMap?: Record<string, string>,
): string[] {
  if (userColors && userColors.length >= seriesNames.length) {
    return userColors.slice(0, seriesNames.length);
  }

  const palette = colorHub.getCurrentTheme().palette ?? [];
  return seriesNames.map((name, i) => {
    if (userColorMap?.[name]) return userColorMap[name];
    return palette[i % palette.length] ?? '#888888';
  });
}

/**
 * Sync ColorHub to the given theme before resolving colors.
 * Used internally by `applyChartColors` — avoids exporting the mutable
 * `colorHub` reference, which would break when the instance is rebuilt.
 */
export function syncColorHubTheme(name: string): void {
  colorHub.switchTheme(name);
}

export type { ChartTheme, ChartThemeColors, ChartThemeConfig };
export { lightTheme as chartLightTheme, darkTheme as chartDarkTheme, chartThemes } from './presets.js';
