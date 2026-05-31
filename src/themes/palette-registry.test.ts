/**
 * P2 — unit tests for {@link PaletteRegistry}'s refcount + recycle contract.
 *
 * These exercise the class directly with fresh instances (deterministic, no
 * module-global state, no DOM), so the allocation / lease / recycle logic is
 * pinned independently of the `themes/index.ts` singleton wiring.
 *
 * Core property under test: a chart's names are *leased* during a render
 * session (`beginRender` → `resolve`* → `endRender`) and *released* when the
 * chart re-renders without them or is disposed (`releaseOwner`). An auto slot
 * whose refcount hits zero is recycled and handed back to the next new name —
 * the "no drift without a sweep" guarantee. Pins are never recycled.
 */
import { describe, it, expect } from 'vitest';
import { PaletteRegistry } from './palette-registry.js';

const PAL = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] as const;
const DARK = ['#60a5fa', '#34d399'] as const;
const T = 'light';

/** Simulate one chart render pass: lease `names` under `owner` for `theme`. */
function render(
  reg: PaletteRegistry,
  owner: object,
  theme: string,
  names: string[],
  palette: readonly string[] = PAL,
): string[] {
  reg.beginRender(owner, theme);
  const colors = names.map((n) => reg.resolve(theme, n, palette));
  reg.endRender(owner);
  return colors;
}

describe('PaletteRegistry — base allocation', () => {
  it('assigns palette colors in first-seen order', () => {
    const reg = new PaletteRegistry();
    expect(render(reg, {}, T, ['A', 'B', 'C'])).toEqual([PAL[0], PAL[1], PAL[2]]);
  });

  it('keeps the same color for a name across renders, regardless of order', () => {
    const reg = new PaletteRegistry();
    const a = {};
    expect(render(reg, a, T, ['A', 'B'])).toEqual([PAL[0], PAL[1]]);
    expect(render(reg, a, T, ['B', 'A'])).toEqual([PAL[1], PAL[0]]);
  });
});

describe('PaletteRegistry — dispose-release recycle', () => {
  it('NO-DRIFT: releasing one owner frees its slots so the next owner restarts at palette[0] (no sweep needed)', () => {
    const reg = new PaletteRegistry();
    const a = {};
    const b = {};
    expect(render(reg, a, T, ['X', 'Y'])).toEqual([PAL[0], PAL[1]]);

    reg.releaseOwner(a); // page A disposed

    // Page B has brand-new names. A's slots were recycled, so B restarts at
    // palette[0]/[1] instead of drifting to [2]/[3].
    expect(render(reg, b, T, ['P', 'Q'])).toEqual([PAL[0], PAL[1]]);
  });

  it('a name shared by two owners survives until the LAST owner releases it', () => {
    const reg = new PaletteRegistry();
    const a = {};
    const b = {};
    render(reg, a, T, ['Shared']); // a → palette[0]
    render(reg, b, T, ['Shared']); // b → same palette[0] (refcount 2)

    reg.releaseOwner(a); // refcount 2 → 1, NOT recycled
    expect(render(reg, b, T, ['Shared'])).toEqual([PAL[0]]);

    // A new name while Shared is still alive must NOT reuse palette[0].
    const c = {};
    expect(render(reg, c, T, ['New'])).toEqual([PAL[1]]);

    reg.releaseOwner(b);
    reg.releaseOwner(c); // Shared + New both fully released → recycled
    const d = {};
    expect(render(reg, d, T, ['Fresh'])).toEqual([PAL[0]]);
  });

  it('re-rendering the same owner+names does not inflate the refcount (idempotent)', () => {
    const reg = new PaletteRegistry();
    const a = {};
    render(reg, a, T, ['A', 'B']);
    render(reg, a, T, ['A', 'B']); // same names again
    render(reg, a, T, ['B', 'A']); // again, reordered

    reg.releaseOwner(a); // a SINGLE release must free both slots
    const b = {};
    expect(render(reg, b, T, ['P', 'Q'])).toEqual([PAL[0], PAL[1]]);
  });

  it("dropping a name from an owner's next render releases just that name", () => {
    const reg = new PaletteRegistry();
    const a = {};
    render(reg, a, T, ['A', 'B']); // A=pal0, B=pal1
    render(reg, a, T, ['A']); // B dropped → its slot recycled

    const b = {};
    expect(render(reg, b, T, ['New'])).toEqual([PAL[1]]); // reuses B's freed slot
  });

  it('moving an owner to a different theme releases its old-theme names', () => {
    const reg = new PaletteRegistry();
    const a = {};
    render(reg, a, 'light', ['A', 'B']); // light pal0, pal1
    render(reg, a, 'dark', ['C'], DARK); // a now holds only dark → light A,B released

    const b = {};
    expect(render(reg, b, 'light', ['P', 'Q'])).toEqual([PAL[0], PAL[1]]);
  });
});

describe('PaletteRegistry — pins are durable', () => {
  it('a pin is never recycled even after every holder releases it', () => {
    const reg = new PaletteRegistry();
    reg.pin(T, 'Premium', '#ffd166');
    const a = {};
    expect(render(reg, a, T, ['Premium'])).toEqual(['#ffd166']);

    reg.releaseOwner(a);
    const b = {};
    expect(render(reg, b, T, ['Premium'])).toEqual(['#ffd166']);
  });

  it('a pinned palette-colored name reserves that slot for auto allocation', () => {
    const reg = new PaletteRegistry();
    reg.pin(T, 'Pinned', PAL[0]); // pin to a real palette color
    const a = {};
    // Auto names skip palette[0] because the pin already uses it.
    expect(render(reg, a, T, ['Pinned', 'Auto1', 'Auto2'])).toEqual([
      PAL[0],
      PAL[1],
      PAL[2],
    ]);
  });
});

describe('PaletteRegistry — reset interactions with live leases', () => {
  it('resetTheme clears auto + refcounts but keeps pins', () => {
    const reg = new PaletteRegistry();
    reg.pin(T, 'Premium', '#ffd166');
    const a = {};
    render(reg, a, T, ['A', 'Premium']);

    reg.resetTheme(T);

    const b = {};
    expect(render(reg, b, T, ['Premium', 'New'])).toEqual(['#ffd166', PAL[0]]);
  });

  it('resetAll then re-rendering all live owners reproduces today\u2019s accumulation across live charts (no premature recycle)', () => {
    // This mirrors the configure() path: resetColorMap() then chart.update()
    // on every live chart. Because all charts stay alive (refcount > 0), the
    // second chart still continues the palette — identical to pre-refactor.
    const reg = new PaletteRegistry();
    const a = {};
    const b = {};
    render(reg, a, T, ['A1', 'A2']);
    render(reg, b, T, ['B1', 'B2']);

    reg.resetAll();

    // Re-render both (both still alive).
    expect(render(reg, a, T, ['A1', 'A2'])).toEqual([PAL[0], PAL[1]]);
    expect(render(reg, b, T, ['B1', 'B2'])).toEqual([PAL[2], PAL[3]]);

    // Now dispose A — its slots free up; a new chart reuses them.
    reg.releaseOwner(a);
    const c = {};
    expect(render(reg, c, T, ['C1', 'C2'])).toEqual([PAL[0], PAL[1]]);
  });
});
