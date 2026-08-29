import { switchTheme, getCurrentTheme } from './themes/index.js';

/**
 * Options for {@link syncThemeWithElementAttribute}.
 */
export interface SyncThemeWithElementAttributeOptions {
  /**
   * The element whose attribute is observed.
   * Defaults to `document.documentElement` (`<html>`) — the conventional
   * home of a site-wide `data-theme` attribute.
   */
  target?: Element;
  /**
   * Map the observed attribute value to a registered theme name.
   * Return `undefined` to skip the switch (keep the current theme).
   * Defaults to using the attribute value directly as the theme name;
   * a `null` value (the attribute was removed) is always skipped.
   */
  resolve?: (value: string | null) => string | undefined;
}

/**
 * Keep every unpinned live chart in sync with a DOM element attribute.
 *
 * Watches `attribute` on `options.target` (default `<html>`) with a
 * `MutationObserver` and calls {@link switchTheme} whenever the resolved
 * theme name differs from the active theme. Charts that pin their own theme
 * (`options.theme` / `chart.setTheme()`) are left untouched — same
 * precedence as a manual `switchTheme()` call. The current value is applied
 * once immediately, so charts created before this call (and the very first
 * paint) already match the document state.
 *
 * The resolved name must be a registered theme (`light` / `dark` built-in,
 * or one added via {@link registerTheme}). Use `options.resolve` when the
 * attribute value isn't a theme name (e.g. `'dark'` → `'my-dark'`).
 *
 * Browser-only: in SSR / non-DOM environments (no `MutationObserver` /
 * `document`) this returns a no-op stop handle instead of throwing, so it is
 * safe to call unconditionally from client entry code.
 *
 * @example
 * ```ts
 * const stop = syncThemeWithElementAttribute('data-theme');
 * // later, when unmounting the app:
 * stop();
 * ```
 *
 * @returns A stop function that disconnects the observer.
 */
export function syncThemeWithElementAttribute(
  attribute: string,
  options: SyncThemeWithElementAttributeOptions = {},
): () => void {
  if (
    typeof MutationObserver === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return () => {};
  }

  const target = options.target ?? document.documentElement;
  if (!target) {
    return () => {};
  }

  const resolve = options.resolve ?? ((value) => value ?? undefined);

  const apply = (): void => {
    const value = target.getAttribute(attribute);
    const name = resolve(value);
    if (!name) return;
    if (name !== getCurrentTheme().name) {
      switchTheme(name);
    }
  };

  // Apply the current value once so charts created before this call (and the
  // first paint) already match the document state.
  apply();

  const observer = new MutationObserver(() => apply());
  observer.observe(target, {
    attributes: true,
    attributeFilter: [attribute],
  });

  return () => observer.disconnect();
}

/**
 * Options for {@link syncThemeWithMediaQuery}.
 */
export interface SyncThemeWithMediaQueryOptions {
  /**
   * Map the boolean media-query match to a registered theme name. Return
   * `undefined` to keep the current theme.
   *
   * Defaults to `'dark'` when the query matches (e.g. the OS prefers dark)
   * and `'light'` otherwise — the two built-in themes.
   */
  resolve?: (matches: boolean) => string | undefined;
}

/** Default query: the OS / browser dark-mode preference. */
const DEFAULT_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Keep every unpinned live chart in sync with a CSS media query — most
 * commonly the OS / browser color-scheme preference.
 *
 * ```ts
 * const stop = syncThemeWithMediaQuery();
 * // '(prefers-color-scheme: dark)' matches → switchTheme('dark')
 * //                              no match → switchTheme('light')
 *
 * // Custom themes:
 * const stopCustom = syncThemeWithMediaQuery('(prefers-color-scheme: dark)', {
 *   resolve: (isDark) => (isDark ? 'ocean-dark' : 'ocean-light'),
 * });
 * ```
 *
 * The current value is applied once immediately, then again on every
 * `change` event. Charts that pin their own theme (`options.theme` /
 * `chart.setTheme()`) are left untouched — same precedence as a manual
 * `switchTheme()` call. Browser-only: without `window.matchMedia` (SSR,
 * older environments) this returns a no-op stop handle instead of throwing.
 *
 * @returns A stop function that removes the listener.
 */
export function syncThemeWithMediaQuery(
  query: string = DEFAULT_DARK_MEDIA_QUERY,
  options: SyncThemeWithMediaQueryOptions = {},
): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }

  const media = window.matchMedia(query);
  if (!media) {
    return () => {};
  }

  const resolve =
    options.resolve ?? ((matches: boolean) => (matches ? 'dark' : 'light'));

  const apply = (): void => {
    const name = resolve(media.matches);
    if (!name) return;
    if (name !== getCurrentTheme().name) {
      switchTheme(name);
    }
  };

  // Apply the current preference once so charts created before this call
  // already match the OS state.
  apply();

  const onChange = (): void => apply();
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }

  // Safari < 14
  media.addListener(onChange);
  return () => media.removeListener(onChange);
}
