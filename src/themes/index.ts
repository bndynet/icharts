import { ColorHub, type StateColors } from '@bndynet/color-hub';
import * as echarts from 'echarts';
import { buildEChartsTheme } from './echarts-theme.js';
import { darkTheme, lightTheme, chartThemes } from './presets.js';
import type { ChartTheme, ChartThemeColors, ChartThemeConfig } from './types.js';
import { chartRegistry, pruneDetachedCharts } from '../registry.js';

// ColorHub's sole responsibility here: assign palette colors to series by name.
// UI / structural colors (background, text, grid, …) are managed by ChartThemeColors.
let colorHub = new ColorHub<ChartThemeColors>(chartThemes);

const knownThemeNames = new Set<string>(chartThemes.map((t) => t.name));
const allThemes: ChartTheme[] = [...chartThemes];

// ---------------------------------------------------------------------------
// Pinned color maps
// ---------------------------------------------------------------------------
//
// ColorHub stores a single `theme.colorMap` per theme, where both
// auto-assigned (from palette) and explicitly pinned (via `setColorMap`)
// entries live together. That makes it impossible for `resetColorMap()` to
// wipe only the auto-assigned ones — and therefore impossible for
// `switchTheme()` to safely reset the target theme's auto state without
// also losing user pins.
//
// `pinnedColorMaps` keeps the *pinned* set per theme, separate from
// ColorHub's mutable working map. Whenever we rebuild ColorHub or clear a
// theme's colorMap, we seed it back with the pinned entries so:
//
//   - `setColorMap({ Premium: '#FFD166' })` survives `switchTheme(...)`
//   - `setColorMap({ Premium: '#FFD166' })` survives `resetColorMap()`
//   - auto-assigned palette slots from a previous page do NOT survive
//
// Keyed by theme name (string) so it correctly handles `registerTheme()`
// adding themes after construction and `resetColorMap()` rebuilding the
// ColorHub instance.
// ---------------------------------------------------------------------------
const pinnedColorMaps = new Map<string, Record<string, string>>();

function getPinned(themeName: string): Record<string, string> {
  let m = pinnedColorMaps.get(themeName);
  if (!m) {
    m = {};
    pinnedColorMaps.set(themeName, m);
  }
  return m;
}

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

/**
 * Switch ColorHub to `name`, clear the target theme's *auto-assigned* color
 * map (palette restarts at index 0), and re-apply the theme to every live
 * chart.
 *
 * Pinned entries from {@link setColorMap} are preserved — they live in the
 * module-private `pinnedColorMaps` and are seeded back into the target
 * theme's `colorMap` immediately after the reset, so a `setColorMap` pin
 * survives every `switchTheme` cycle.
 *
 * This is the canonical way for SPA pages to get a clean palette without
 * leaking name → color assignments from a previously visited page.
 * Consumers no longer need to call {@link resetColorMap} manually before
 * each page mount; `switchTheme` does the right thing automatically.
 */
export function switchTheme(name: string): void {
  colorHub.switchTheme(name);
  resetThemeColorMap(name);
  // Drop charts whose container is no longer attached BEFORE re-themeing —
  // otherwise a leaked chart from a previously visited SPA page would run
  // its adapter, write its series names into the target theme's colorMap,
  // and starve the current page of palette slots. See registry.ts for the
  // full rationale.
  pruneDetachedCharts();
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
 * Pre-bind name → color mappings ("pins").
 * When `themeName` is provided, applies only to that theme.
 * When omitted, applies to every registered theme.
 *
 * Pins are sticky: they survive {@link switchTheme} and {@link resetColorMap}
 * because they live in a separate per-theme pinned map that is seeded back
 * into ColorHub whenever the working colorMap is cleared. Calling
 * `setColorMap` again with the same name overwrites the existing pin; pins
 * are additive across calls (no public API to remove a single pin — start a
 * fresh session if you really need to drop one).
 *
 * Only meaningful when `consistentColors` is enabled — without it, the
 * resolver path is positional and never reads ColorHub's stored map.
 */
export function setColorMap(
  map: Record<string, string>,
  themeName?: string,
): void {
  const prevName = colorHub.getCurrentTheme().name;

  const targets = themeName ? [themeName] : [...knownThemeNames];
  for (const name of targets) {
    // Guard against unregistered themes: `colorHub.switchTheme(unknown)`
    // silently falls back to themes[0], which would otherwise (a) write
    // the pin into the wrong theme's working colorMap, and (b) leave a
    // pinned entry under a name that never gets seeded back into any
    // real theme. Skip with a no-op instead.
    if (!knownThemeNames.has(name)) continue;

    // 1. Persist into the pinned map so the entries survive resetColorMap
    //    and switchTheme cycles.
    Object.assign(getPinned(name), map);

    // 2. Mirror into ColorHub's working map so the *current* resolver call
    //    sees the pin without having to wait for the next reset to pick it
    //    up. (`getColorByKey` returns colorMap[name] verbatim if present.)
    colorHub.switchTheme(name);
    const theme = colorHub.getCurrentTheme();
    theme.colorMap = { ...theme.colorMap, ...map };
  }

  colorHub.switchTheme(prevName);
}

/**
 * Reset a single theme's working colorMap to just its pinned entries.
 * Used by both {@link switchTheme} and {@link resetColorMap}; not exported
 * because callers should go through one of those two entry points.
 */
function resetThemeColorMap(themeName: string): void {
  const prevName = colorHub.getCurrentTheme().name;
  colorHub.switchTheme(themeName);
  // Seed with the pinned entries (clone so future setColorMap calls don't
  // accidentally mutate ColorHub's working map through the pinned reference).
  colorHub.getCurrentTheme().colorMap = { ...getPinned(themeName) };
  colorHub.switchTheme(prevName);
}

/**
 * Clear ColorHub's auto-assigned name → color map.
 *
 * - When `themeName` is omitted, rebuilds the entire ColorHub so every
 *   theme's palette index resets to 0 — the next chart starts cleanly
 *   from `palette[0]` in whichever theme it renders against.
 * - When `themeName` is provided, only that theme's working colorMap is
 *   cleared (palette index reset happens implicitly on the next
 *   `colorHub.switchTheme(themeName)` call).
 *
 * In both cases, entries previously written by {@link setColorMap} are
 * **preserved** — they live in `pinnedColorMaps` and are seeded back into
 * the working map. Call {@link setColorMap} again to add new pins; there
 * is no public API to remove a pin (use a fresh app load if you really
 * need that — pins are intentionally sticky).
 *
 * Since `switchTheme(name)` now automatically clears the target theme's
 * auto-assigned entries, most consumers don't need to call this directly.
 * It remains useful for:
 *   - Manually wiping state mid-page without changing theme.
 *   - Wiping ALL themes' auto-assignments at once (the no-arg form).
 */
export function resetColorMap(themeName?: string): void {
  if (themeName) {
    resetThemeColorMap(themeName);
    return;
  }

  const prevThemeName = colorHub.getCurrentTheme().name;
  // Rebuild ColorHub so the palette index counter is also reset to 0 (not
  // just the colorMap). Seed each theme's working map with its pinned
  // entries so user pins survive the rebuild.
  const cleanThemes = allThemes.map((t) => ({
    ...t,
    colorMap: { ...(pinnedColorMaps.get(t.name) ?? {}) },
  }));
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
 *
 * Internal-only — does NOT trigger the auto-reset behavior of the public
 * {@link switchTheme}. This is used by `resolveColors` on every adapter
 * call to set the right theme context, and must NOT clear the working
 * colorMap (doing so would defeat `consistentColors`).
 */
export function syncColorHubTheme(name: string): void {
  colorHub.switchTheme(name);
}

export type { ChartTheme, ChartThemeColors, ChartThemeConfig };
export { lightTheme as chartLightTheme, darkTheme as chartDarkTheme, chartThemes } from './presets.js';
