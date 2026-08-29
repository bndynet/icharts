/**
 * P0-1 regression net — rendering must never mutate the active theme.
 *
 * Before the fix, `resolveColors()` called `syncColorHubTheme()`, so every
 * render wrote the chart's theme into the module-global ColorHub. That made
 * `getCurrentTheme()` report "whatever rendered last" and let a single
 * `options.theme: 'dark'` chart become the default for every later chart
 * (and, on the server, for every later request in the same process).
 *
 * These tests pin the post-fix contract:
 *   1. `getCurrentTheme()` / `getThemeColors()` only change via
 *      `switchTheme()` / `configure({ theme })`.
 *   2. A per-chart theme resolves that chart's palette without leaking.
 *   3. App-level switching still applies to subsequent charts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// `themes/index.ts` statically imports echarts (for registerTheme). Stub it so
// this suite runs under the node-only Vitest environment.
vi.mock('echarts', () => ({
  registerTheme: vi.fn(),
}));

import {
  getCurrentTheme,
  getThemeColors,
  resetColorMap,
  switchTheme,
  chartLightTheme,
} from './index.js';
import { resolveColors, resolveColorsForNodes } from '../utils.js';
import { configure, resetConfiguration } from '../config.js';

const LIGHT_FIRST = '#3b82f6'; // light palette[0]
const DARK_FIRST = '#60a5fa'; // dark palette[0]

beforeEach(() => {
  resetConfiguration(); // also switches back to light
  resetColorMap(); // wipe auto assignments from previous tests
});

describe('theme isolation — rendering never mutates the active theme', () => {
  it('keeps the active theme reference stable while resolving a per-chart theme', () => {
    const active = getCurrentTheme();
    resolveColors(['iso-a'], { theme: 'dark' });
    expect(getCurrentTheme()).toBe(active);
    expect(getCurrentTheme().name).toBe('light');
  });

  it('does not leak a per-chart dark theme into later default resolution', () => {
    expect(resolveColors(['leak-a'], { theme: 'dark' })).toEqual([DARK_FIRST]);
    expect(resolveColors(['leak-b'], {})).toEqual([LIGHT_FIRST]);
  });

  it('does not leak in consistentColors mode either', () => {
    configure({ consistentColors: true });
    resetColorMap();

    expect(resolveColors(['iso-cc-a'], { theme: 'dark' })).toEqual([DARK_FIRST]);
    expect(getCurrentTheme().name).toBe('light');
    expect(resolveColors(['iso-cc-b'], {})).toEqual([LIGHT_FIRST]);
  });

  it('still resolves the explicit theme for the chart that asked for it', () => {
    expect(resolveColors(['iso-explicit'], { theme: 'dark' })).toEqual([
      DARK_FIRST,
    ]);
    expect(getCurrentTheme().name).toBe('light');
  });

  it('falls back to the active theme for unknown theme names without switching', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(
        resolveColors(['iso-unknown'], { theme: 'no-such-theme' }),
      ).toEqual([LIGHT_FIRST]);
      expect(getCurrentTheme().name).toBe('light');

      // The fallback follows the active theme, not a hardcoded light.
      switchTheme('dark');
      expect(
        resolveColors(['iso-unknown-dark'], { theme: 'no-such-theme' }),
      ).toEqual([DARK_FIRST]);
      expect(getCurrentTheme().name).toBe('dark');
    } finally {
      warn.mockRestore();
      switchTheme('light');
    }
  });

  it('node resolvers use the chart theme too', () => {
    const nodes = [{ name: 'iso-node-a' }, { name: 'iso-node-b' }];
    expect(resolveColorsForNodes(nodes, { theme: 'dark' })).toEqual([
      DARK_FIRST,
      '#34d399', // dark palette[1]
    ]);
    expect(getCurrentTheme().name).toBe('light');
  });

  it('reads tokens of a non-active theme without switching', () => {
    expect(getThemeColors('dark')?.textPrimary).toBe('#f1f5f9');
    expect(getThemeColors()?.textPrimary).toBe(
      chartLightTheme.colors?.textPrimary,
    );
    expect(getCurrentTheme().name).toBe('light');
  });
});

describe('theme isolation — app-level switching still works', () => {
  it('switchTheme changes the default for later charts', () => {
    switchTheme('dark');
    try {
      expect(getCurrentTheme().name).toBe('dark');
      expect(resolveColors(['iso-switch'], {})).toEqual([DARK_FIRST]);
    } finally {
      switchTheme('light');
    }
  });
});
