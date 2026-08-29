/**
 * Theme-change notifications: the `onThemeChange()` callback API and the
 * `icharts:themechange` DOM event dispatched by `switchTheme()`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// `themes/index.ts` imports echarts (registerTheme) — stub it for node env.
vi.mock('echarts', () => ({
  registerTheme: vi.fn(),
}));

import { switchTheme } from './themes/index.js';
import {
  onThemeChange,
  THEME_CHANGE_EVENT,
  type ThemeChangeDetail,
} from './theme-events.js';

beforeEach(() => {
  vi.unstubAllGlobals();
  switchTheme('light');
});

afterEach(() => {
  vi.unstubAllGlobals();
  switchTheme('light');
});

describe('onThemeChange', () => {
  it('fires with name / previous / colorMode after a real change', () => {
    const seen: ThemeChangeDetail[] = [];
    const off = onThemeChange((detail) => seen.push(detail));
    try {
      switchTheme('dark');
      expect(seen).toEqual([
        { name: 'dark', previous: 'light', colorMode: 'dark' },
      ]);
    } finally {
      off();
    }
  });

  it('does not fire when the active theme does not change', () => {
    const listener = vi.fn();
    const off = onThemeChange(listener);
    try {
      switchTheme('light');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      off();
    }
  });

  it('does not fire for an unknown theme (switch is a no-op)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = vi.fn();
    const off = onThemeChange(listener);
    try {
      switchTheme('no-such-theme-event');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      off();
      warn.mockRestore();
    }
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const off = onThemeChange(listener);
    off();

    switchTheme('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a throwing listener from the others', () => {
    const good = vi.fn();
    const offBad = onThemeChange(() => {
      throw new Error('boom');
    });
    const offGood = onThemeChange(good);
    try {
      expect(() => switchTheme('dark')).not.toThrow();
      expect(good).toHaveBeenCalledTimes(1);
    } finally {
      offBad();
      offGood();
    }
  });

  it('dispatches the icharts:themechange DOM event on window', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });

    switchTheme('dark');

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent<ThemeChangeDetail>;
    expect(event.type).toBe(THEME_CHANGE_EVENT);
    expect(event.type).toBe('icharts:themechange');
    expect(event.detail).toEqual({
      name: 'dark',
      previous: 'light',
      colorMode: 'dark',
    });
  });
});
