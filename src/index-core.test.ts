/**
 * Public API surface for the SSR-safe entry (`@bndynet/icharts/core`).
 *
 * Locks the theme-introspection exports added for "is the current theme
 * light or dark?" so they cannot be dropped from `index-core.ts` (which
 * `index.ts` re-exports in full) without a failing test.
 */
import { describe, it, expect } from 'vitest';
import {
  getTheme,
  getThemeMode,
  isDarkTheme,
  getCurrentTheme,
  getThemeColors,
  switchTheme,
  type ChartTheme,
  type ChartThemeColors,
  type ColorMode,
} from './index-core.js';

describe('@bndynet/icharts/core — theme introspection API', () => {
  it('exposes the explicit light/dark helpers', () => {
    // Type-level: these annotations fail typecheck if the types are not
    // re-exported from the package root.
    const theme: ChartTheme = getTheme('dark');
    const mode: ColorMode = getThemeMode('dark');
    // Non-optional: `getThemeColors()` always returns a complete token set.
    const colors: ChartThemeColors = getThemeColors('light');

    expect(theme.name).toBe('dark');
    expect(mode).toBe('dark');
    expect(isDarkTheme('dark')).toBe(true);
    expect(isDarkTheme('light')).toBe(false);
    expect(colors.textPrimary).toBe('#111827');
  });

  it('defaults to the active theme', () => {
    switchTheme('light');
    expect(getThemeMode()).toBe('light');
    expect(getTheme().name).toBe(getCurrentTheme().name);

    switchTheme('dark');
    try {
      expect(getThemeMode()).toBe('dark');
      expect(getThemeColors()).toBe(getThemeColors('dark'));
    } finally {
      switchTheme('light');
    }
  });
});
