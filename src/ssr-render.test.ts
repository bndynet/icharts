/**
 * Verifies the SSR-safe `renderChartToSVGString` helper:
 *
 *   1. The function actually exercises ECharts' real SSR pipeline
 *      (no `vi.mock('echarts')` here — unlike `core.test.ts`) and
 *      returns a complete `<svg>...</svg>` document in pure Node.
 *   2. Adapter outputs flow through cleanly: titles, legends, series
 *      names, theme-driven colors all reach the rendered markup.
 *   3. The headless instance is `dispose()`d on every code path
 *      (including thrown adapters) so a hot request loop doesn't
 *      accumulate engine state.
 *   4. Defensive guards reject obviously-bad inputs early with
 *      caller-actionable error messages.
 *
 * These tests run under the repo's default `environment: 'node'`
 * vitest config — no jsdom, no canvas, no DOM polyfills. That's the
 * whole point: this file is the regression net for "the lib actually
 * renders charts on the server".
 */

import { describe, it, expect } from 'vitest';
import {
  renderChartToSVGString,
  type RenderChartToSVGStringOptions,
} from './ssr-render.js';
import { registerAdapter } from './adapters/index.js';

const lineData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  series: [
    { name: 'Revenue', data: [120, 200, 150, 80, 270] },
    { name: 'Cost', data: [90, 170, 130, 60, 210] },
  ],
};

const pieData = [
  { name: 'Apple', value: 30 },
  { name: 'Banana', value: 50 },
  { name: 'Cherry', value: 20 },
];

describe('renderChartToSVGString — output shape', () => {
  it('returns a complete <svg>...</svg> document', () => {
    const svg = renderChartToSVGString('line', lineData, {
      width: 800,
      height: 400,
    });

    // Bare minimum: ECharts handed us back a real SVG, not an empty
    // string or a fragment. The tail check guards against truncated
    // streams (we've seen broken renderers emit `<svg>...` and stop).
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    // Threshold tuned against ECharts 6.0's empty-axes baseline of
    // ~3 KB; a real series + legend + axis labels comfortably clears
    // 4 KB. If this drops below 2 KB we're rendering an empty chart.
    expect(svg.length).toBeGreaterThan(2000);
  });

  it('emits width + height + viewBox on the root <svg> when useViewBox is omitted (CSS-overridable default)', () => {
    const svg = renderChartToSVGString('line', lineData, {
      width: 720,
      height: 360,
    });
    const rootMatch = svg.match(/^<svg\b[^>]*>/);
    expect(rootMatch).not.toBeNull();
    expect(rootMatch![0]).toMatch(/\bwidth="720"/);
    expect(rootMatch![0]).toMatch(/\bheight="360"/);
    // Default behavior matches ECharts' own default: include viewBox
    // so host CSS can override intrinsic dims without distorting the
    // chart coordinate system.
    expect(rootMatch![0]).toMatch(/\bviewBox="0 0 720 360"/);
  });

  it('drops viewBox when useViewBox: false (strictly fixed-size markup)', () => {
    const svg = renderChartToSVGString('line', lineData, {
      width: 800,
      height: 400,
      useViewBox: false,
    });
    const rootMatch = svg.match(/^<svg\b[^>]*>/);
    expect(rootMatch).not.toBeNull();
    expect(rootMatch![0]).toMatch(/\bwidth="800"/);
    expect(rootMatch![0]).toMatch(/\bheight="400"/);
    // No viewBox = the SVG cannot be scaled responsively; renders at
    // exactly its intrinsic 800 × 400 even if a host stylesheet
    // tries to override width/height.
    expect(rootMatch![0]).not.toMatch(/\bviewBox=/);
  });
});

describe('renderChartToSVGString — adapter output reaches the markup', () => {
  it('renders the configured title text', () => {
    const svg = renderChartToSVGString(
      'line',
      lineData,
      { width: 800, height: 400 },
      { title: 'Quarterly Revenue' },
    );
    // ECharts emits title as <text>...</text>; just check the literal
    // content lands somewhere in the SVG (encoding is normal ASCII so
    // direct includes() is safe).
    expect(svg).toContain('Quarterly Revenue');
  });

  it('renders series names (legend entries) for a multi-series line chart', () => {
    const svg = renderChartToSVGString(
      'line',
      lineData,
      { width: 800, height: 400 },
      { legend: { show: true, position: 'top' } },
    );
    expect(svg).toContain('Revenue');
    expect(svg).toContain('Cost');
  });

  it('renders pie title + legend entries through the pie adapter', () => {
    // Legend assertions are layout-stable; slice-label assertions
    // are NOT — ECharts truncates labels to ellipses when they
    // overflow the viewport (e.g. `Banana` -> `Ba...`), and the
    // truncation point depends on the active theme's font metrics.
    // We deliberately route the per-slice name check through the
    // legend so the test pins adapter→ECharts wiring rather than
    // text-fit heuristics.
    const svg = renderChartToSVGString(
      'pie',
      pieData,
      { width: 800, height: 600 },
      { title: 'Fruit Mix', legend: { show: true, position: 'bottom' } },
    );
    expect(svg).toContain('Fruit Mix');
    expect(svg).toContain('Apple');
    expect(svg).toContain('Banana');
    expect(svg).toContain('Cherry');
  });

  it('respects the requested theme (output differs from default)', () => {
    const defaultSvg = renderChartToSVGString('line', lineData, {
      width: 800,
      height: 400,
    });
    const darkSvg = renderChartToSVGString(
      'line',
      lineData,
      { width: 800, height: 400 },
      { theme: 'dark' },
    );
    // Don't assert specific hex codes (theme palettes evolve). The
    // contract we lock here is "themes actually flow through SSR" —
    // i.e. the same data + dimensions produce different SVG when only
    // the theme changes. If themes were silently dropped, both calls
    // would emit identical strings.
    expect(defaultSvg).not.toEqual(darkSvg);
  });
});

describe('renderChartToSVGString — argument guards', () => {
  it('throws when ssr.width is missing', () => {
    // Cast through `unknown` so we can exercise the *runtime* guard
    // even though the TS signature already forbids it at compile
    // time. The runtime check is independent insurance — JS callers,
    // dynamic dispatchers, and `// @ts-ignore` consumers all bypass
    // the type system, and a clear runtime error beats ECharts'
    // opaque "size not specified" warning.
    const badSsr = { height: 400 } as unknown as RenderChartToSVGStringOptions;
    expect(() => renderChartToSVGString('line', lineData, badSsr)).toThrow(
      /width.*height/i,
    );
  });

  it('throws when ssr.height is non-finite', () => {
    expect(() =>
      renderChartToSVGString('line', lineData, {
        width: 800,
        height: Number.NaN,
      }),
    ).toThrow(/positive finite/i);
  });

  it('throws when width is zero or negative', () => {
    expect(() =>
      renderChartToSVGString('line', lineData, { width: 0, height: 400 }),
    ).toThrow();
    expect(() =>
      renderChartToSVGString('line', lineData, { width: -10, height: 400 }),
    ).toThrow();
  });

  it('propagates "unknown chart type" errors from the adapter registry', () => {
    expect(() =>
      renderChartToSVGString(
        // No adapter registered for 'definitely-not-a-real-chart'.
        'definitely-not-a-real-chart',
        lineData,
        { width: 400, height: 300 },
      ),
    ).toThrow(/Unsupported chart type/);
  });

  it('propagates data validation errors from the adapter', () => {
    // `lineData` is structurally valid `ChartData` (it's the XY
    // shape, accepted by the union) but pie's runtime
    // `isPieData` validator rejects it. We cast through `unknown` so
    // the test exercises the *runtime* type-mismatch path that
    // adapters guard against (the static type check is fine because
    // the adapter contract takes the broad `ChartData` union — only
    // the registered adapter knows which shape it actually wants).
    expect(() =>
      renderChartToSVGString('pie', lineData, { width: 400, height: 300 }),
    ).toThrow(/Invalid data/);
  });
});

describe('renderChartToSVGString — engine cleanup contract', () => {
  it('disposes the headless instance even when the adapter throws', () => {
    // Custom adapter that always throws during resolve. If we leak the
    // ECharts instance on the error path, this loop would either throw
    // a different error (out-of-memory, "too many instances") or warn
    // on stdout. Survive 50 iterations cleanly = dispose contract holds.
    registerAdapter('throwing-adapter', {
      validate: () => true,
      resolve: () => {
        throw new Error('intentional adapter failure');
      },
    });
    for (let i = 0; i < 50; i += 1) {
      expect(() =>
        renderChartToSVGString('throwing-adapter', lineData, {
          width: 400,
          height: 300,
        }),
      ).toThrow(/intentional adapter failure/);
    }
  });

  it('handles a hot loop of successful renders without leaking state', () => {
    // Repeated invocations with different titles. If state leaked
    // (e.g. theme registration accumulated, or a cached option from
    // the previous call bled through), later renders would either
    // throw or contain stale text from earlier ones.
    const titles = ['Frame-0', 'Frame-1', 'Frame-2', 'Frame-3', 'Frame-4'];
    for (const title of titles) {
      const svg = renderChartToSVGString(
        'line',
        lineData,
        { width: 600, height: 300 },
        { title },
      );
      expect(svg).toContain(title);
      // Negative check: no other frame's title leaked in.
      for (const other of titles) {
        if (other === title) continue;
        expect(svg).not.toContain(other);
      }
    }
  });
});

describe('renderChartToSVGString — extensibility (registerAdapter)', () => {
  it('renders a custom-registered adapter end-to-end on the server', () => {
    registerAdapter('ssr-custom', {
      validate: () => true,
      resolve: () => ({
        option: {
          title: { text: 'Custom-SSR-Marker' },
          xAxis: { type: 'category', data: ['x'] },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: [42] }],
        },
      }),
    });
    const svg = renderChartToSVGString(
      'ssr-custom',
      // Custom adapter doesn't validate the shape — pass anything.
      { categories: [], series: [] },
      { width: 400, height: 300 },
    );
    expect(svg).toContain('Custom-SSR-Marker');
  });
});
