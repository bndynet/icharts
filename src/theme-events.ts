import type { ColorMode } from '@bndynet/color-hub';

/**
 * Payload of a theme-change notification (callback + DOM event).
 */
export interface ThemeChangeDetail {
  /** Theme name that is now active. */
  name: string;
  /** Theme name that was active before the switch. */
  previous: string;
  /** Resolved light/dark mode of the new theme. */
  colorMode: ColorMode;
}

/** Listener signature accepted by {@link onThemeChange}. */
export type ThemeChangeListener = (detail: ThemeChangeDetail) => void;

/** DOM event name dispatched on `window` (browser only). */
export const THEME_CHANGE_EVENT = 'icharts:themechange';

declare global {
  interface WindowEventMap {
    [THEME_CHANGE_EVENT]: CustomEvent<ThemeChangeDetail>;
  }
}

const listeners = new Set<ThemeChangeListener>();

/**
 * Subscribe to changes of the **active application theme**.
 *
 * Fires after `switchTheme()` / `configure({ theme })` / the auto-sync
 * helpers have actually changed the active theme and every unpinned chart
 * has been repainted. Per-chart switches (`chart.setTheme()`,
 * `update(_, { theme })`) do not fire — they only affect one chart.
 *
 * The current theme is read synchronously from the callback, so
 *
 * ```ts
 * onThemeChange(({ name }) => {
 *   document.documentElement.dataset.theme = name;
 * });
 * ```
 *
 * works without extra state. SSR-safe: listeners are kept in memory and the
 * browser `window` event is simply skipped when there is no `window`.
 *
 * @returns An unsubscribe function (idempotent).
 */
export function onThemeChange(listener: ThemeChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify every subscriber and dispatch the `icharts:themechange` DOM event.
 *
 * @internal Used by `switchTheme()`; not re-exported from the package entry.
 */
export function emitThemeChange(detail: ThemeChangeDetail): void {
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent !== 'undefined'
  ) {
    window.dispatchEvent(
      new CustomEvent<ThemeChangeDetail>(THEME_CHANGE_EVENT, { detail }),
    );
  }

  // Snapshot so a listener that (un)subscribes during the call can't affect
  // this dispatch. One throwing listener must not break the others or the
  // theme switch that triggered the event.
  for (const listener of [...listeners]) {
    try {
      listener(detail);
    } catch {
      // Swallow: a consumer's bug should not abort switchTheme().
    }
  }
}
