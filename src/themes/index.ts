import {
  ColorHub,
  lighten,
  darken,
  alpha,
  type StateColors,
} from '@bndynet/color-hub';
import * as echarts from 'echarts';
import { buildEChartsTheme } from './echarts-theme.js';
import { darkTheme, lightTheme, chartThemes } from './presets.js';
import type { ChartTheme, ChartThemeColors, ChartThemeConfig } from './types.js';
import { chartRegistry, pruneDetachedCharts } from '../registry.js';
import { PaletteRegistry } from './palette-registry.js';

// ---------------------------------------------------------------------------
// ColorHub — now a READ-ONLY theme / palette / token repository.
// ---------------------------------------------------------------------------
//
// ColorHub used to do four things here: (1) store themes, (2) hold palette
// arrays, (3) hold `ChartThemeColors` tokens, and (4) act as a *stateful*
// name → color accumulator (its `getColors(name)` advanced a palette index
// and wrote into a shared `colorMap` as a side effect of every chart render).
//
// Responsibility (4) has moved out to `paletteRegistry` below — an explicit,
// introspectable object with separate auto/pin maps that the resolver calls
// directly. We no longer call `colorHub.getColors`, so this instance never
// mutates and never needs rebuilding. It is kept purely for (1)–(3): theme
// storage + switching, palette arrays, and UI tokens — and as the deriver of
// hover/active/disabled state colors via the color-math helpers below.
const colorHub = new ColorHub<ChartThemeColors>(chartThemes);

// ---------------------------------------------------------------------------
// PaletteRegistry — the single owner of consistentColors name→color state.
// ---------------------------------------------------------------------------
//
// Holds auto-assigned and pinned maps separately, per theme, so resetting the
// auto slots never touches user pins. This is what made the old
// `pinnedColorMaps` shadow-map hack unnecessary.
const paletteRegistry = new PaletteRegistry();

const knownThemeNames = new Set<string>(chartThemes.map((t) => t.name));

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
 * Switch the active theme, clear that theme's *auto-assigned* color slots
 * (the palette restarts at index 0 for the next chart), and re-apply the
 * theme to every live chart.
 *
 * Pinned entries from {@link setColorMap} are preserved — they live in a
 * dedicated `pins` map inside {@link PaletteRegistry}, untouched by the auto
 * reset, so a `setColorMap` pin survives every `switchTheme` cycle.
 *
 * This is the canonical way for SPA pages to get a clean palette without
 * leaking name → color assignments from a previously visited page.
 * Consumers no longer need to call {@link resetColorMap} manually before
 * each page mount; `switchTheme` does the right thing automatically.
 */
export function switchTheme(name: string): void {
  colorHub.switchTheme(name);
  paletteRegistry.resetTheme(name);
  // Drop charts whose container is no longer attached BEFORE re-themeing —
  // otherwise a leaked chart from a previously visited SPA page would run
  // its adapter, re-declare its series names into the target theme's auto
  // assignments, and starve the current page of palette slots. With the
  // registry-backed pipeline this prune is a belt-and-suspenders fallback;
  // see registry.ts for the full rationale.
  pruneDetachedCharts();
  for (const chart of chartRegistry) {
    chart.setTheme(name);
  }
}

/**
 * State colors ({@link StateColors}) for `name` in the active theme.
 *
 * The base (`default`) color is resolved through {@link PaletteRegistry} — the
 * same source the chart resolver uses — so `getSeriesColor(name).default`
 * always equals the consistentColors color assigned to that name. The
 * hover / active / disabled variants are derived from the base with the
 * color-math helpers (matching ColorHub's default state recipe:
 * lighten 0.05 / darken 0.1 / alpha 0.4).
 */
export function getSeriesColor(name: string): StateColors {
  const theme = colorHub.getCurrentTheme();
  const base = paletteRegistry.resolve(theme.name, name, theme.palette ?? []);
  return deriveStateColors(base);
}

function deriveStateColors(base: string): StateColors {
  return {
    default: base,
    hover: lighten(base, 0.05),
    active: darken(base, 0.1),
    disabled: alpha(base, 0.4),
  };
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
 * and the active theme.
 *
 * This is the `consistentColors: true` resolver — names map to colors through
 * {@link PaletteRegistry} so the same name keeps the same color across charts.
 */
export function resolveSeriesColors(
  seriesNames: string[],
  userColors?: string[],
  userColorMap?: Record<string, string>,
): string[] {
  if (userColors && userColors.length >= seriesNames.length) {
    return userColors.slice(0, seriesNames.length);
  }

  const theme = colorHub.getCurrentTheme();
  const themeName = theme.name;
  const palette = theme.palette ?? [];
  return seriesNames.map((name) => {
    if (userColorMap?.[name]) return userColorMap[name];
    return paletteRegistry.resolve(themeName, name, palette);
  });
}

/**
 * Pre-bind name → color mappings ("pins").
 * When `themeName` is provided, applies only to that theme.
 * When omitted, applies to every registered theme.
 *
 * Pins are sticky: they survive {@link switchTheme} and {@link resetColorMap}
 * because they live in {@link PaletteRegistry}'s dedicated `pins` map, which
 * the auto-reset paths never touch. Calling `setColorMap` again with the same
 * name overwrites the existing pin; pins are additive across calls (no public
 * API to remove a single pin — start a fresh session if you really need to).
 *
 * Only meaningful when `consistentColors` is enabled — without it, the
 * resolver path is positional ({@link resolveColorsByPosition}) and never
 * reads the registry's stored map.
 */
export function setColorMap(
  map: Record<string, string>,
  themeName?: string,
): void {
  const targets = themeName ? [themeName] : [...knownThemeNames];
  for (const name of targets) {
    // Guard against unregistered themes: pinning under a name that no real
    // theme will ever resolve against would silently strand the entry.
    // Skip with a no-op instead.
    if (!knownThemeNames.has(name)) continue;
    for (const key of Object.keys(map)) {
      paletteRegistry.pin(name, key, map[key]);
    }
  }
}

/**
 * Clear auto-assigned name → color slots.
 *
 * - When `themeName` is omitted, clears every theme's auto assignments so the
 *   next chart starts cleanly from `palette[0]` in whichever theme it renders
 *   against.
 * - When `themeName` is provided, only that theme's auto slots are cleared.
 *
 * In both cases, entries previously written by {@link setColorMap} are
 * **preserved** — they live in {@link PaletteRegistry}'s `pins` map. Call
 * {@link setColorMap} again to add new pins; there is no public API to remove
 * a pin (use a fresh app load if you really need that — pins are
 * intentionally sticky).
 *
 * Since `switchTheme(name)` now automatically clears the target theme's
 * auto-assigned entries, most consumers don't need to call this directly.
 * It remains useful for:
 *   - Manually wiping state mid-page without changing theme.
 *   - Wiping ALL themes' auto-assignments at once (the no-arg form).
 */
export function resetColorMap(themeName?: string): void {
  if (themeName) {
    paletteRegistry.resetTheme(themeName);
    return;
  }
  paletteRegistry.resetAll();
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
 * Sync the active theme before resolving colors.
 *
 * Internal-only — does NOT trigger the auto-reset behavior of the public
 * {@link switchTheme}. This is used by `resolveColors` on every adapter
 * call to set the right theme context, and must NOT clear auto assignments
 * (doing so would defeat `consistentColors`).
 */
export function syncColorHubTheme(name: string): void {
  colorHub.switchTheme(name);
}

// ---------------------------------------------------------------------------
// Render-session refcounting (internal — not part of the public package API)
// ---------------------------------------------------------------------------
//
// The chart engine (`src/core.ts`) brackets each render with
// `beginColorRender` / `endColorRender` so the names a chart resolves become a
// refcounted *lease*; `releaseColorOwner` (called from `dispose()`) frees that
// chart's names and recycles any auto slot whose refcount hits zero. This is
// what demotes `pruneDetachedCharts` / the disconnect sentinel from a
// load-bearing wall to a pure fallback — dispose now releases palette slots
// directly, with no dependency on a registry sweep.
//
// `owner` is an opaque token (the IChart instance). These are no-ops for the
// positional (`consistentColors: false`) path because that resolver never
// calls into the registry, so a render session simply records zero names.

export function beginColorRender(owner: object, themeName: string): void {
  paletteRegistry.beginRender(owner, themeName);
}

export function endColorRender(owner: object): void {
  paletteRegistry.endRender(owner);
}

export function releaseColorOwner(owner: object): void {
  paletteRegistry.releaseOwner(owner);
}

export type { ChartTheme, ChartThemeColors, ChartThemeConfig };
export { lightTheme as chartLightTheme, darkTheme as chartDarkTheme, chartThemes } from './presets.js';
