/**
 * Locks in the contract around `setColorMap` / `resetColorMap` /
 * `switchTheme` interactions with ColorHub:
 *
 * 1. `setColorMap` pins survive both `switchTheme(name)` (target-theme reset)
 *    and `resetColorMap()` (full rebuild). This is the property that lets
 *    consumers reliably pin "Premium → gold" at app startup and forget
 *    about it.
 *
 * 2. `switchTheme(name)` clears the target theme's *auto-assigned* entries
 *    so the next page starts cleanly from `palette[0]` instead of inheriting
 *    palette slots consumed by a previously visited page. This is the
 *    behavior that fixes "colors get disordered when switching between
 *    multiple dashboards" without any caller-side `resetColorMap()` call.
 *
 * 3. `resolveColorsByPosition` is unaffected by either — it's positional and
 *    must not leak ColorHub state. Lock that explicitly so a future
 *    refactor doesn't accidentally start reading the colorMap there.
 *
 * Note on test isolation: ColorHub is a module-global. We avoid cross-test
 * interference by (a) using unique series names per test, and (b) calling
 * `resetColorMap()` at the top of each test to wipe auto-assignments.
 * Pinned state from previous tests is intentionally left alone — each test
 * either pins under its own unique names or asserts behavior that doesn't
 * read pre-existing pins.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// `echarts.registerTheme` is called by `registerTheme()` below. Stub it so
// the test can run under the existing node-only Vitest environment.
vi.mock('echarts', () => ({
  registerTheme: vi.fn(),
}));

import {
  switchTheme,
  setColorMap,
  resetColorMap,
  registerTheme,
  resolveSeriesColors,
  resolveColorsByPosition,
} from './index.js';
import { configure, resetConfiguration } from '../config.js';

beforeEach(() => {
  resetConfiguration();
  // Start each test from a known-clean auto-assignment state. Pins from
  // prior tests survive (by design) but each test uses unique names so
  // they don't clash. Anchor on 'light' so resolveSeriesColors reads the
  // built-in light palette.
  resetColorMap();
  switchTheme('light');
});

// ──────────────────────────────────────────────────────────────────────────
// Auto-assignment baseline
// ──────────────────────────────────────────────────────────────────────────

describe('resolveSeriesColors — palette auto-assignment', () => {
  it('assigns names from palette in encounter order', () => {
    const colors = resolveSeriesColors(['baseline-A', 'baseline-B', 'baseline-C']);
    // Light palette starts with blue/emerald/amber (see presets.ts).
    expect(colors).toEqual(['#3b82f6', '#10b981', '#f59e0b']);
  });

  it('caches subsequent lookups so the same name keeps its color', () => {
    const first  = resolveSeriesColors(['cache-A', 'cache-B']);
    const second = resolveSeriesColors(['cache-B', 'cache-A']);
    // Same names → same colors, regardless of order on the second call.
    expect(second).toEqual([first[1], first[0]]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// switchTheme auto-resets the target theme's auto-assigned entries
// ──────────────────────────────────────────────────────────────────────────

describe('switchTheme — auto-reset of target theme', () => {
  it('clears auto-assigned entries so the next call restarts at palette[0]', () => {
    // Page 1 consumes the first 3 palette slots.
    const page1 = resolveSeriesColors(['page1-A', 'page1-B', 'page1-C']);
    expect(page1).toEqual(['#3b82f6', '#10b981', '#f59e0b']);

    // Simulate SPA navigation: page mount calls switchTheme.
    switchTheme('light');

    // Page 2's names are unique → they MUST start from palette[0] again,
    // not from palette[3] (which is what would happen without the reset).
    const page2 = resolveSeriesColors(['page2-X', 'page2-Y']);
    expect(page2).toEqual(['#3b82f6', '#10b981']);
  });

  it('does not bleed auto-assignments between themes', () => {
    // Consume some slots on light.
    const lightSide = resolveSeriesColors(['bleed-A', 'bleed-B']);
    expect(lightSide).toEqual(['#3b82f6', '#10b981']);

    // Switch to dark — dark's auto-assignments must start fresh, not
    // continue from where light left off.
    switchTheme('dark');
    const darkSide = resolveSeriesColors(['bleed-C', 'bleed-D']);
    expect(darkSide).toEqual(['#60a5fa', '#34d399']); // dark palette [0], [1]
  });

  it('switching back to a previous theme also restarts at palette[0]', () => {
    // Some auto-assignments on light.
    resolveSeriesColors(['cycle-A', 'cycle-B']);
    // Bounce through dark and back.
    switchTheme('dark');
    resolveSeriesColors(['cycle-C']);
    switchTheme('light');

    // Light's prior auto-assignments are gone. A *new* name resolves to
    // palette[0]. (Auto-state is intentionally not preserved — pins are
    // the durable layer, see below.)
    const fresh = resolveSeriesColors(['cycle-new']);
    expect(fresh).toEqual(['#3b82f6']);
  });
});

describe('configure({ theme }) integration', () => {
  it('sets the configured theme as fallback for subsequent color resolution', () => {
    configure({
      theme: {
        name: 'configured-theme-fallback',
        palette: ['#101010', '#202020'],
      },
    });

    expect(resolveSeriesColors(['configured-fallback-a'])).toEqual(['#101010']);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// setColorMap pins survive switchTheme + resetColorMap
// ──────────────────────────────────────────────────────────────────────────

describe('setColorMap — pinned entries are sticky', () => {
  it('pins are honored by the resolver immediately (no theme switch needed)', () => {
    setColorMap({ 'pin-immediate': '#deadbe' }, 'light');
    expect(resolveSeriesColors(['pin-immediate'])).toEqual(['#deadbe']);
  });

  it('pins survive switchTheme(sameTheme) — target-theme auto-reset does not touch pins', () => {
    setColorMap({ 'pin-survive-switch': '#ffd166' }, 'light');
    // Mutate some auto state so the reset has something to clear.
    resolveSeriesColors(['unrelated-1', 'unrelated-2']);

    switchTheme('light'); // explicit reset

    // Pin is still resolved.
    expect(resolveSeriesColors(['pin-survive-switch'])).toEqual(['#ffd166']);
    // ...and the unrelated names DID get cleared (proves the reset ran).
    const refreshed = resolveSeriesColors(['post-reset-A']);
    expect(refreshed).toEqual(['#3b82f6']); // palette[0], not palette[2]
  });

  it('pins survive switchTheme to a different theme and back', () => {
    setColorMap({ 'pin-bounce': '#abc123' }, 'light');

    switchTheme('dark');
    switchTheme('light');

    expect(resolveSeriesColors(['pin-bounce'])).toEqual(['#abc123']);
  });

  it('pins survive resetColorMap() (full rebuild)', () => {
    setColorMap({ 'pin-full-reset': '#cafe42' }, 'light');
    resolveSeriesColors(['noise-1', 'noise-2']); // accumulate auto state

    resetColorMap(); // rebuild ColorHub from scratch
    switchTheme('light'); // anchor back to light

    expect(resolveSeriesColors(['pin-full-reset'])).toEqual(['#cafe42']);
    // Auto state is wiped — fresh names start at palette[0].
    expect(resolveSeriesColors(['post-full-reset'])).toEqual(['#3b82f6']);
  });

  it('pins survive resetColorMap(themeName) (single-theme rebuild)', () => {
    setColorMap({ 'pin-single-reset': '#feed42' }, 'light');
    resolveSeriesColors(['noise-A']);

    resetColorMap('light');

    expect(resolveSeriesColors(['pin-single-reset'])).toEqual(['#feed42']);
  });

  it('per-theme pins do not bleed into other themes', () => {
    setColorMap({ 'theme-scoped': '#aabbcc' }, 'light');

    switchTheme('dark');
    const onDark = resolveSeriesColors(['theme-scoped']);
    // On dark, 'theme-scoped' has no pin → falls through to palette[0] of dark.
    expect(onDark).toEqual(['#60a5fa']);

    switchTheme('light');
    expect(resolveSeriesColors(['theme-scoped'])).toEqual(['#aabbcc']);
  });

  it('omitting themeName pins across every registered theme', () => {
    setColorMap({ 'all-themes-pin': '#112233' });

    switchTheme('light');
    expect(resolveSeriesColors(['all-themes-pin'])).toEqual(['#112233']);

    switchTheme('dark');
    expect(resolveSeriesColors(['all-themes-pin'])).toEqual(['#112233']);
  });

  it('subsequent setColorMap calls overwrite an existing pin', () => {
    setColorMap({ 'pin-overwrite': '#111111' }, 'light');
    expect(resolveSeriesColors(['pin-overwrite'])).toEqual(['#111111']);

    setColorMap({ 'pin-overwrite': '#222222' }, 'light');
    expect(resolveSeriesColors(['pin-overwrite'])).toEqual(['#222222']);

    // And it stays overwritten across a reset.
    resetColorMap();
    switchTheme('light');
    expect(resolveSeriesColors(['pin-overwrite'])).toEqual(['#222222']);
  });

  it('skips unknown themeName instead of silently polluting the fallback theme', () => {
    // Pre-existing bug surface: `colorHub.switchTheme(unknown)` falls back
    // to themes[0]. We must not write the pin into that wrong theme.
    setColorMap({ 'pin-unknown': '#ff00ff' }, 'theme-that-does-not-exist');

    // light (the fallback target) must be unaffected.
    switchTheme('light');
    expect(resolveSeriesColors(['pin-unknown'])).toEqual(['#3b82f6']); // palette[0], not the pin
  });

  it('pins on a theme registered via registerTheme also survive switchTheme', () => {
    registerTheme({
      name: 'pinned-themes-test',
      colorMode: 'light',
      palette: ['#000001', '#000002', '#000003'],
    });
    setColorMap({ 'custom-pin': '#abcdef' }, 'pinned-themes-test');

    switchTheme('pinned-themes-test');
    expect(resolveSeriesColors(['custom-pin'])).toEqual(['#abcdef']);

    switchTheme('light');
    switchTheme('pinned-themes-test');
    expect(resolveSeriesColors(['custom-pin'])).toEqual(['#abcdef']);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// resolveColorsByPosition stays positional (consistentColors=false path)
// ──────────────────────────────────────────────────────────────────────────

describe('resolveColorsByPosition — unaffected by name state', () => {
  it('always starts at palette[0] regardless of prior consistentColors activity', () => {
    // Consume some auto slots via the name-based resolver.
    resolveSeriesColors(['by-pos-A', 'by-pos-B', 'by-pos-C']);

    // Positional resolver must NOT see those — it returns palette[i] for
    // each name, ignoring any cached name → color mapping.
    const colors = resolveColorsByPosition(['by-pos-X', 'by-pos-Y']);
    expect(colors).toEqual(['#3b82f6', '#10b981']);
  });

  it('honors options.colorMap as a per-chart override', () => {
    const colors = resolveColorsByPosition(
      ['o1', 'o2', 'o3'],
      undefined,
      { o2: '#bada55' },
    );
    expect(colors).toEqual(['#3b82f6', '#bada55', '#f59e0b']);
  });

  it('honors options.colors as a positional override when long enough', () => {
    const colors = resolveColorsByPosition(
      ['c1', 'c2'],
      ['#aaaaaa', '#bbbbbb'],
    );
    expect(colors).toEqual(['#aaaaaa', '#bbbbbb']);
  });
});
