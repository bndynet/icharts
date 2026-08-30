/**
 * Fixed extension palette for the `consistentColors` name→color allocator.
 *
 * When a theme's series palette is exhausted (more distinct names than
 * palette entries), the allocator previously fell back to
 * `@bndynet/color-hub`'s `randomDistinctColor()` — a Math.random-based,
 * golden-ratio-spread hue — so the same name picked a *different* color on
 * every render/refresh ("colors shuffle after refresh").
 *
 * This array replaces that random fallback with a deterministic, finite set
 * of colors. They are mid-luminance / mid-saturation (500–600-weight hues)
 * chosen to stay legible on **both** light and dark chart backgrounds, and
 * are kept distinct from the built-in `light` / `dark` series palettes so a
 * chart that exhausts its theme palette still gets fresh, distinguishable
 * colors instead of reusing an in-palette hue.
 */
export const EXTENSION_PALETTE = [
  '#dc2626', // red-600
  '#e11d48', // rose-600
  '#f43f5e', // rose-500
  '#db2777', // pink-600
  '#ea580c', // orange-600
  '#d97706', // amber-600
  '#ca8a04', // yellow-600
  '#65a30d', // lime-600
  '#16a34a', // green-600
  '#22c55e', // green-500
  '#059669', // emerald-600
  '#0d9488', // teal-600
  '#14b8a6', // teal-500
  '#0891b2', // cyan-600
  '#0ea5e9', // sky-500
  '#0284c7', // sky-600
  '#2563eb', // blue-600
  '#4f46e5', // indigo-600
  '#7c3aed', // violet-600
  '#9333ea', // purple-600
  '#a855f7', // purple-500
  '#c026d3', // fuchsia-600
  '#d946ef', // fuchsia-500
  '#64748b', // slate-500
] as const;

/**
 * Per-theme name → color state for the `consistentColors` pipeline.
 *
 * The maps are kept **explicitly separate** (unlike ColorHub's single mixed
 * `colorMap`) so that auto-assigned palette slots can be cleared or recycled
 * without ever touching user-supplied pins — the property that used to require
 * the `pinnedColorMaps` shadow map in `themes/index.ts`.
 *
 *  - `auto`  — names assigned a color from the palette on first encounter.
 *  - `pins`  — names pre-bound via `setColorMap`; permanent until overwritten.
 *  - `order` — first-seen order of `auto` names (stable allocation order).
 *  - `refs`  — refcount per auto name: how many live charts currently declare
 *              it. An auto entry whose refcount drops to 0 is recycled (its
 *              palette slot is freed for the next new name). Names assigned
 *              outside a render session (SSR one-shot render, `getSeriesColor`)
 *              never get a refcount and therefore linger — matching the old
 *              "names are never released" behavior for those paths.
 */
interface ThemeColorState {
  auto: Map<string, string>;
  pins: Map<string, string>;
  order: string[];
  refs: Map<string, number>;
}

/** What a single chart currently holds: a theme and the set of names leased from it. */
interface Lease {
  theme: string;
  names: Set<string>;
}

/**
 * Library-owned, SSR-safe (pure `Map`s — no browser globals) registry for
 * "same name → same color across charts" assignment, with lifecycle-owned
 * recycling.
 *
 * This replaces the stateful accumulator that used to live inside ColorHub's
 * `getColors(name)` call. Rendering a chart no longer mutates a shared
 * ColorHub singleton as a side effect; instead, the resolver explicitly asks
 * this registry for a color, and the state it keeps is introspectable and
 * owned by the chart lifecycle:
 *
 *   - Allocation is behavior-equivalent to the previous ColorHub
 *     implementation: pin wins; an already-seen auto name keeps its color; a
 *     new name gets the first palette color not already used by a pin or a
 *     prior auto assignment in the same theme; once the palette is exhausted a
 *     fixed, deterministic color from {@link EXTENSION_PALETTE} is used.
 *   - Reference counting is driven by render *sessions*. The engine brackets
 *     each chart render with {@link beginRender} / {@link endRender}; every
 *     `resolve` made in between is recorded as that chart's *lease*. When the
 *     chart re-renders without a name, or is disposed via
 *     {@link releaseOwner}, the name's refcount drops; at zero the auto slot
 *     is recycled. This makes `dispose()` the primary cleanup mechanism and
 *     demotes the registry / sentinel sweeps to a pure fallback.
 *
 * State is partitioned per theme name, matching ColorHub's per-theme
 * `colorMap`, so auto assignments never bleed across themes.
 */
export class PaletteRegistry {
  private readonly themes = new Map<string, ThemeColorState>();

  /** Names currently leased by each live chart (keyed by an opaque owner token). */
  private readonly leases = new Map<object, Lease>();

  /** The render session in progress (one at a time — renders are synchronous). */
  private current: { owner: object; theme: string; names: Set<string> } | null =
    null;

  private state(theme: string): ThemeColorState {
    let s = this.themes.get(theme);
    if (!s) {
      s = { auto: new Map(), pins: new Map(), order: [], refs: new Map() };
      this.themes.set(theme, s);
    }
    return s;
  }

  /**
   * Resolve `name` to a color for `theme`, assigning a new palette slot on
   * first encounter. Pins win over auto assignments. The `palette` is passed
   * in (rather than stored) so the registry stays a pure name→color allocator
   * and ColorHub remains the single owner of palette arrays.
   *
   * When called inside a {@link beginRender} session for the same theme, the
   * name is recorded into the active chart's lease so it participates in
   * refcounting; outside a session (SSR render, `getSeriesColor`) it is simply
   * assigned without a refcount.
   */
  resolve(theme: string, name: string, palette: readonly string[]): string {
    if (this.current && this.current.theme === theme) {
      this.current.names.add(name);
    }

    const s = this.state(theme);
    const pinned = s.pins.get(name);
    if (pinned !== undefined) return pinned;
    const existing = s.auto.get(name);
    if (existing !== undefined) return existing;

    const color = this.allocate(s, palette);
    s.auto.set(name, color);
    s.order.push(name);
    return color;
  }

  /**
   * First palette color not already used by a pin or auto assignment, then a
   * fixed deterministic color from {@link EXTENSION_PALETTE} on exhaustion.
   */
  private allocate(s: ThemeColorState, palette: readonly string[]): string {
    const used = new Set<string>();
    for (const c of s.pins.values()) used.add(c);
    for (const c of s.auto.values()) used.add(c);

    for (const c of palette) {
      if (!used.has(c)) return c;
    }

    // Palette exhausted — fall back to the fixed extension palette instead of
    // `randomDistinctColor()`, so the same name resolves to the same color on
    // every render/refresh instead of shuffling.
    for (const c of EXTENSION_PALETTE) {
      if (!used.has(c)) return c;
    }

    // Main palette AND extension palette both exhausted (requires more distinct
    // colors than both palettes combined). Deterministic guard: cycle the
    // extension palette by the number of colors already in use. This may repeat
    // a color, but it is never non-deterministic.
    return EXTENSION_PALETTE[used.size % EXTENSION_PALETTE.length];
  }

  /** Pre-bind a name to a color for `theme`. Overwrites any existing pin. */
  pin(theme: string, name: string, color: string): void {
    this.state(theme).pins.set(name, color);
  }

  // ── Render-session refcounting ────────────────────────────────────────────

  /**
   * Open a render session for `owner` against `theme`. Every {@link resolve}
   * for this theme until {@link endRender} is recorded as part of the owner's
   * new lease. Idempotent-safe: a stray `beginRender` without a matching
   * `endRender` is overwritten by the next `beginRender`.
   */
  beginRender(owner: object, theme: string): void {
    this.current = { owner, theme, names: new Set() };
  }

  /**
   * Close `owner`'s render session and reconcile its lease: acquire newly
   * declared names, release names it no longer declares (recycling auto slots
   * whose refcount hits 0). A no-op if no session is open for `owner`.
   */
  endRender(owner: object): void {
    const session = this.current;
    this.current = null;
    if (!session || session.owner !== owner) return;
    this.commitLease(owner, session.theme, session.names);
  }

  /**
   * Release every name `owner` holds (called on `dispose()`), recycling auto
   * slots whose refcount reaches 0. Pins are never recycled.
   */
  releaseOwner(owner: object): void {
    const lease = this.leases.get(owner);
    if (!lease) return;
    this.leases.delete(owner);
    const s = this.state(lease.theme);
    for (const name of lease.names) this.releaseName(s, name);
  }

  private commitLease(owner: object, theme: string, names: Set<string>): void {
    const prev = this.leases.get(owner);
    const s = this.state(theme);

    // Acquire names that are newly declared this pass.
    for (const name of names) {
      const heldBefore =
        prev !== undefined && prev.theme === theme && prev.names.has(name);
      if (!heldBefore) s.refs.set(name, (s.refs.get(name) ?? 0) + 1);
    }

    // Release names the owner previously held but no longer declares (a theme
    // change releases the entire previous lease).
    if (prev) {
      const sameTheme = prev.theme === theme;
      const prevState = sameTheme ? s : this.state(prev.theme);
      for (const name of prev.names) {
        if (sameTheme && names.has(name)) continue;
        this.releaseName(prevState, name);
      }
    }

    this.leases.set(owner, { theme, names });
  }

  /** Decrement a name's refcount; recycle the auto slot (not pins) at 0. */
  private releaseName(s: ThemeColorState, name: string): void {
    const count = s.refs.get(name);
    if (count === undefined) return;
    if (count > 1) {
      s.refs.set(name, count - 1);
      return;
    }
    s.refs.delete(name);
    if (s.pins.has(name)) return; // pins are durable — never recycled
    if (s.auto.delete(name)) {
      const idx = s.order.indexOf(name);
      if (idx >= 0) s.order.splice(idx, 1);
    }
  }

  // ── Resets ────────────────────────────────────────────────────────────────

  /** Clear a single theme's auto assignments + refcounts. Pins are preserved. */
  resetTheme(theme: string): void {
    const s = this.themes.get(theme);
    if (s) {
      s.auto.clear();
      s.order.length = 0;
      s.refs.clear();
    }
    // Drop the now-stale leased names for this theme so the next render of any
    // live owner re-acquires clean refcounts instead of double-counting.
    for (const lease of this.leases.values()) {
      if (lease.theme === theme) lease.names.clear();
    }
  }

  /** Clear every theme's auto assignments + refcounts. Pins are preserved. */
  resetAll(): void {
    for (const s of this.themes.values()) {
      s.auto.clear();
      s.order.length = 0;
      s.refs.clear();
    }
    for (const lease of this.leases.values()) lease.names.clear();
  }
}
