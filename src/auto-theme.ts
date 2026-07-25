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
 * Keep every live chart in sync with a DOM element attribute.
 *
 * Watches `attribute` on `options.target` (default `<html>`) with a
 * `MutationObserver` and calls {@link switchTheme} whenever the resolved
 * theme name differs from the active theme. The current value is applied
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
