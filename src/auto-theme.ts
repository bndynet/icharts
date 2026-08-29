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

/**
 * Options for {@link syncThemeWithPreference}.
 */
export interface SyncThemeWithPreferenceOptions {
  /** Attribute watched on `target`. Default `'data-theme'`. */
  attribute?: string;
  /** Element carrying the attribute. Default `document.documentElement`. */
  target?: Element;
  /** OS-preference media query. Default `'(prefers-color-scheme: dark)'`. */
  mediaQuery?: string;
  /**
   * Map the attribute value to a theme name. Return `undefined` to defer to
   * the media query.
   *
   * Defaults to the attribute value itself, except `null`, `'auto'` and
   * `'system'` — those defer to the media query.
   */
  resolveAttribute?: (value: string | null) => string | undefined;
  /**
   * Map the media-query match to a theme name.
   * Defaults to `'dark'` on match, `'light'` otherwise.
   */
  resolveMedia?: (matches: boolean) => string | undefined;
}

/** `data-theme` values that mean "follow the OS preference". */
const AUTO_THEME_VALUES = new Set(['auto', 'system']);

/**
 * Sync charts with **both** a DOM attribute and the OS color-scheme
 * preference, using one deterministic precedence rule: **the attribute wins
 * whenever it maps to a theme; otherwise the media query decides.**
 *
 * ```ts
 * const stop = syncThemeWithPreference({
 *   attribute: 'data-theme',            // default
 *   mediaQuery: '(prefers-color-scheme: dark)', // default
 * });
 * ```
 *
 * With that setup `<html data-theme="dark">` always wins, while
 * `data-theme="auto"` (or a missing attribute) follows the OS. The current
 * state is applied once immediately, then on attribute changes and on
 * `change` events from the media query.
 *
 * Charts that pin their own theme (`options.theme` / `chart.setTheme()`) are
 * left untouched — same precedence as `switchTheme()`. Browser-only: without
 * a DOM **and** without `matchMedia` this returns a no-op stop handle.
 *
 * @returns A stop function that disconnects the observer and the listener.
 */
export function syncThemeWithPreference(
  options: SyncThemeWithPreferenceOptions = {},
): () => void {
  const hasDom = typeof document !== 'undefined';
  const hasObserver = typeof MutationObserver !== 'undefined';
  const mediaSupported =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function';

  if (!hasDom && !mediaSupported) {
    return () => {};
  }

  const attribute = options.attribute ?? 'data-theme';
  const target =
    options.target ?? (hasDom ? document.documentElement : undefined);
  const media = mediaSupported
    ? window.matchMedia(options.mediaQuery ?? DEFAULT_DARK_MEDIA_QUERY)
    : undefined;

  if (!target && !media) {
    return () => {};
  }

  const resolveAttribute =
    options.resolveAttribute ??
    ((value: string | null) =>
      value && !AUTO_THEME_VALUES.has(value) ? value : undefined);
  const resolveMedia =
    options.resolveMedia ?? ((matches: boolean) => (matches ? 'dark' : 'light'));

  const apply = (): void => {
    const fromAttribute = target
      ? resolveAttribute(target.getAttribute(attribute))
      : undefined;
    const name =
      fromAttribute ?? (media ? resolveMedia(media.matches) : undefined);
    if (!name) return;
    if (name !== getCurrentTheme().name) {
      switchTheme(name);
    }
  };

  // Apply the initial combination so charts created before this call match.
  apply();

  let observer: MutationObserver | undefined;
  if (target && hasObserver) {
    observer = new MutationObserver(() => apply());
    observer.observe(target, { attributes: true, attributeFilter: [attribute] });
  }

  const onChange = (): void => apply();
  if (media) {
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
    } else {
      // Safari < 14
      media.addListener(onChange);
    }
  }

  return () => {
    observer?.disconnect();
    if (!media) return;
    if (typeof media.removeEventListener === 'function') {
      media.removeEventListener('change', onChange);
    } else {
      media.removeListener(onChange);
    }
  };
}
