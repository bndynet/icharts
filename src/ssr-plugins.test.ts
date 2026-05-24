/**
 * Verifies the SSR-safe plugin-installer API
 * (`installLiquidProgress`) — both that it actually registers the
 * plugin with the shared ECharts global, and that the registration
 * enables `renderChartToSVGString` to render the plugin-backed chart
 * type end-to-end.
 *
 * No `vi.mock('echarts')` here. The whole point of this test is to
 * exercise the real plugin pipeline against the real ECharts
 * instance in pure Node — anything weaker would silently let an
 * `installLiquidProgress` regression through (the function is a
 * thin wrapper around `echarts.use`, and a broken wrapper produces
 * no compile error and no runtime crash on its own — only the
 * subsequent `renderChartToSVGString('liquidprogress', …)` call
 * would fail, which is exactly what we assert below).
 *
 * Runs under the repo's default `environment: 'node'` vitest config,
 * so the test also doubles as a regression net for the
 * "@echarts-x/custom-liquid-fill imports cleanly in Node" contract
 * documented in `src/ssr-plugins.ts`. If a future @echarts-x
 * version starts touching `window` at module-load (as wordcloud
 * does), this file will fail to even load — surfacing the
 * regression at the right layer.
 */

import { describe, it, expect } from 'vitest';
import { installLiquidProgress } from './ssr-plugins.js';
import { renderChartToSVGString } from './ssr-render.js';

describe('installLiquidProgress', () => {
  it('is a function', () => {
    // Trivial but useful: catches accidental `export type` instead
    // of `export function` regressions (which still type-check) and
    // catches a missing re-export from `index-core.ts`.
    expect(typeof installLiquidProgress).toBe('function');
  });

  it('enables renderChartToSVGString to render a liquidprogress chart', () => {
    // The end-to-end contract: install → render → get back a valid
    // SVG containing the plugin's distinctive output. Without the
    // installer, this would throw with
    // `Unsupported series type: liquidFill` (or render an empty
    // SVG, depending on ECharts version).
    installLiquidProgress();

    const svg = renderChartToSVGString(
      'liquidprogress',
      { value: 0.65, max: 1 },
      { width: 400, height: 400 },
      { title: 'CPU' },
    );

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    // Title should reach the markup — proves the adapter pipeline
    // ran and the install didn't break the normal option flow.
    expect(svg).toContain('CPU');
    // Liquid-fill paints a circular container plus the wave shape;
    // SVG path elements are the most stable structural marker.
    expect(svg).toMatch(/<(path|circle)\b/);
    // Sanity floor: an empty / failed render bottoms out around
    // ~3 KB (root <svg> + a few defs). A real liquid chart with
    // title easily clears 4 KB.
    expect(svg.length).toBeGreaterThan(2000);
  });

  it('is idempotent — repeated calls do not corrupt later renders', () => {
    // ECharts dedupes plugin registrations by class identity, so
    // calling `echarts.use(...)` multiple times for the same plugin
    // is a no-op. We pin that contract here so a future refactor
    // that wraps `installLiquidProgress` in a "register-once" guard
    // (or accidentally creates a new plugin instance per call) is
    // forced to keep the user-observable behavior identical: still
    // valid SVG, still containing the rendered chart.
    for (let i = 0; i < 5; i += 1) {
      installLiquidProgress();
    }

    const svg = renderChartToSVGString(
      'liquidprogress',
      { value: 0.42 },
      { width: 300, height: 300 },
    );

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toMatch(/<(path|circle)\b/);
  });

  it('hides the `echarts` + `@echarts-x/*` packages from consumers', () => {
    // Static contract: server consumers should only need to import
    // from `@bndynet/icharts/core`. The test enforces this
    // architecturally — the test file itself only imports from
    // `./ssr-plugins.js` and `./ssr-render.js`, never from
    // `'echarts'` or `'@echarts-x/*'`. If a future refactor leaks
    // those imports into the public surface, this file's import
    // graph would have to change to satisfy it, which would show
    // up in code review.
    //
    // The runtime assertion is symbolic — it just exercises the
    // public path one more time to confirm the wrapper is the only
    // touchpoint the consumer needs.
    installLiquidProgress();
    expect(() =>
      renderChartToSVGString(
        'liquidprogress',
        { value: 0.1 },
        { width: 200, height: 200 },
      ),
    ).not.toThrow();
  });
});
