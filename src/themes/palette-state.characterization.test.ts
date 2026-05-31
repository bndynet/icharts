/**
 * P0 — Characterization tests for the `consistentColors` color-state pipeline.
 *
 * These tests pin the *exact* behavior the library exhibits TODAY, before the
 * "render-as-side-effect" refactor (P2 #2). They are a golden-master safety
 * net: they pass against the current ColorHub-backed implementation and MUST
 * stay green across the P1 PaletteRegistry extraction (zero behavior change).
 *
 * They deliberately exercise behavior through the *public-ish* resolver entry
 * points (`resolveColors`, `configure`, `switchTheme`, `setColorMap`,
 * `resetColorMap`, `getSeriesColor`) rather than ColorHub internals, so the
 * contract they lock down is implementation-agnostic.
 *
 * Symptoms captured (see the task brief):
 *   - cross-chart palette drift when `consistentColors` is on (the root cause)
 *   - pin survival across `resetColorMap` / `switchTheme`
 *   - `switchTheme` auto-resetting the target theme's auto assignments
 *   - positional (consistentColors=false) vs name-based (consistentColors=true)
 *   - idempotency: re-rendering the same names never advances the palette cursor
 *   - `getSeriesColor`'s StateColors are derived from the resolved base color
 *
 * Test isolation: the color state is a module-global. Each test starts from a
 * clean auto-assignment state via `resetConfiguration()` + `resetColorMap()` +
 * `switchTheme('light')`, and uses unique series names so leftover pins from
 * other suites (which survive `resetColorMap` by design) can't interfere.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { lighten, darken, alpha } from '@bndynet/color-hub';

// `themes/index.ts` statically imports echarts (for registerTheme). Stub it so
// this suite runs under the node-only Vitest environment without pulling the
// full ECharts engine.
vi.mock('echarts', () => ({
  registerTheme: vi.fn(),
}));

import {
  switchTheme,
  setColorMap,
  resetColorMap,
  getSeriesColor,
} from './index.js';
import { resolveColors } from '../utils.js';
import { configure, resetConfiguration } from '../config.js';

// Light palette, in order (see presets.ts). The first four are all we assert.
const P0 = '#3b82f6'; // blue
const P1 = '#10b981'; // emerald
const P2 = '#f59e0b'; // amber
const P3 = '#ef4444'; // red

function cleanState(): void {
  resetConfiguration(); // consistentColors=false, theme back to light
  resetColorMap();      // wipe auto assignments (pins survive by design)
  switchTheme('light'); // anchor the active theme + palette
}

// ──────────────────────────────────────────────────────────────────────────
// consistentColors = true → name-based accumulation
// ──────────────────────────────────────────────────────────────────────────

describe('characterization: consistentColors=true name→color accumulation', () => {
  beforeEach(() => {
    cleanState();
    configure({ consistentColors: true });
  });

  it('resolves the same name to the same color across separate charts', () => {
    const chartA = resolveColors(['acc-revenue', 'acc-expenses'], {});
    const chartB = resolveColors(['acc-expenses', 'acc-revenue'], {});
    // chartB sees the names in reverse but each keeps its first-assigned color.
    expect(chartB).toEqual([chartA[1], chartA[0]]);
  });

  it('DRIFT SYMPTOM: a later chart with brand-new names continues from where the previous chart left the palette cursor (no auto-release today)', () => {
    const pageA = resolveColors(['drift-X', 'drift-Y'], {});
    expect(pageA).toEqual([P0, P1]);

    // Page B uses entirely different names. Nothing releases page A's slots,
    // so page B drifts to palette[2]/[3] instead of restarting at [0]/[1].
    // This is the exact symptom the refactor targets.
    const pageB = resolveColors(['drift-P', 'drift-Q'], {});
    expect(pageB).toEqual([P2, P3]);
  });

  it('idempotent: re-resolving the same names does not advance the palette cursor', () => {
    const first = resolveColors(['idem-A', 'idem-B'], {});
    resolveColors(['idem-A', 'idem-B'], {}); // second render, same names
    resolveColors(['idem-B', 'idem-A'], {}); // again, reordered

    // A brand-new name still gets palette[2], proving the repeat renders
    // consumed no extra slots.
    const next = resolveColors(['idem-C'], {});
    expect(first).toEqual([P0, P1]);
    expect(next).toEqual([P2]);
  });

  it('switchTheme(light) clears auto assignments so the next chart restarts at palette[0]', () => {
    resolveColors(['rst-A', 'rst-B', 'rst-C'], {});
    switchTheme('light');
    const after = resolveColors(['rst-D', 'rst-E'], {});
    expect(after).toEqual([P0, P1]);
  });

  it('does not bleed auto assignments between themes', () => {
    const onLight = resolveColors(['bleed-A', 'bleed-B'], {});
    expect(onLight).toEqual([P0, P1]);

    switchTheme('dark');
    const onDark = resolveColors(['bleed-C', 'bleed-D'], { theme: 'dark' });
    // dark palette [0], [1]
    expect(onDark).toEqual(['#60a5fa', '#34d399']);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// setColorMap pins are sticky
// ──────────────────────────────────────────────────────────────────────────

describe('characterization: setColorMap pins survive resets', () => {
  beforeEach(() => {
    cleanState();
    configure({ consistentColors: true });
  });

  it('a pin wins over auto-assignment and survives resetColorMap()', () => {
    setColorMap({ 'pin-char': '#ffd166' }, 'light');
    expect(resolveColors(['pin-char'], {})).toEqual(['#ffd166']);

    resetColorMap();
    switchTheme('light');
    expect(resolveColors(['pin-char'], {})).toEqual(['#ffd166']);
  });

  it('a pin survives switchTheme to another theme and back', () => {
    setColorMap({ 'pin-bounce-char': '#abc123' }, 'light');
    switchTheme('dark');
    switchTheme('light');
    expect(resolveColors(['pin-bounce-char'], {})).toEqual(['#abc123']);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// consistentColors = false → positional resolution (no name state)
// ──────────────────────────────────────────────────────────────────────────

describe('characterization: consistentColors=false positional resolution', () => {
  beforeEach(() => {
    cleanState(); // leaves consistentColors=false (the default)
  });

  it('every chart restarts at palette[0] regardless of names seen elsewhere', () => {
    const a = resolveColors(['pos-A', 'pos-B'], {});
    const b = resolveColors(['pos-C', 'pos-D'], {});
    expect(a).toEqual([P0, P1]);
    expect(b).toEqual([P0, P1]); // no drift — positional, ignores name state
  });

  it('honors options.colorMap as a per-chart override', () => {
    const colors = resolveColors(['pm-1', 'pm-2', 'pm-3'], {
      colorMap: { 'pm-2': '#bada55' },
    });
    expect(colors).toEqual([P0, '#bada55', P2]);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// getSeriesColor — StateColors derived from the resolved base color
// ──────────────────────────────────────────────────────────────────────────

describe('characterization: getSeriesColor StateColors derivation', () => {
  beforeEach(() => {
    cleanState();
    configure({ consistentColors: true });
  });

  it('default state equals the consistentColors base color and derives hover/active/disabled from it', () => {
    const base = resolveColors(['state-char'], {})[0];
    expect(getSeriesColor('state-char')).toEqual({
      default: base,
      hover: lighten(base, 0.05),
      active: darken(base, 0.1),
      disabled: alpha(base, 0.4),
    });
  });
});
