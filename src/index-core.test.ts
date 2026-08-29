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
  listThemes,
  syncThemeWithPreference,
  onThemeChange,
  THEME_CHANGE_EVENT,
  type ThemeChangeDetail,
  type ThemeChangeListener,
  hasTheme,
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

describe('@bndynet/icharts/core — auto-sync helpers', () => {
  it('exposes syncThemeWithPreference()', () => {
    expect(typeof syncThemeWithPreference).toBe('function');
  });
});

describe('@bndynet/icharts/core — theme-change notifications', () => {
  it('exposes onThemeChange() and the DOM event name', () => {
    expect(typeof onThemeChange).toBe('function');
    expect(THEME_CHANGE_EVENT).toBe('icharts:themechange');

    const detail: ThemeChangeDetail = {
      name: 'dark',
      previous: 'light',
      colorMode: 'dark',
    };
    const listener: ThemeChangeListener = () => {};
    const off = onThemeChange(listener);
    expect(typeof off).toBe('function');
    off();
    expect(detail.name).toBe('dark');
  });

  it('types window listeners through WindowEventMap', () => {
    // Type-level only (never invoked in node): `event.detail` must be
    // `ThemeChangeDetail` thanks to the global augmentation.
    const subscribe = (): void => {
      window.addEventListener(THEME_CHANGE_EVENT, (event) => {
        const detail: ThemeChangeDetail = event.detail;
        void detail;
      });
    };
    void subscribe;
  });
});

describe('@bndynet/icharts/core — theme registry introspection', () => {
  it('lists registered themes and answers hasTheme()', () => {
    expect(listThemes().slice(0, 2)).toEqual(['light', 'dark']);
    expect(hasTheme('light')).toBe(true);
    expect(hasTheme('no-such-theme')).toBe(false);
  });
});
