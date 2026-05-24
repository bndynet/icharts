// Server-side chart rendering — produces a complete `<svg>...</svg>`
// document in pure Node without ever touching `window`, `document`,
// `customElements`, or a `<canvas>` element. Safe to call from
// Next.js / Nuxt / Astro / SvelteKit / Vite SSR / serverless / CLI
// scripts that import from `@bndynet/icharts/core`.
//
// This is the SSR counterpart of `IChart`: where `IChart` wraps an
// ECharts instance bound to a real `HTMLElement` (browser only),
// `renderChartToSVGString` wraps a headless ECharts instance using
// ECharts 6's built-in `ssr: true` mode + SVG renderer. The two paths
// share the same adapter pipeline (`resolveEChartsOption`), the same
// theme registration (`ensureThemesRegistered` / `resolveThemeName`),
// and the same global font-family guard
// (`applyConfiguredFontFamilyToOption`), so any chart that renders in
// the browser also renders here — modulo the canvas-based feature
// fallbacks documented below.
//
// Why a standalone helper instead of an `IChart` overload:
//
//   - `IChart`'s contract (`update`, `setTheme`, `resize`, `dispose`,
//     auto-dispose sentinel, theme propagation via `chartRegistry`) is
//     all built around a long-lived, container-bound chart. Server
//     rendering is the opposite shape: one-shot, no container, no
//     lifetime — get a string, dispose, return.
//   - Threading `null`-container handling through `IChart`'s
//     constructor would either widen its public type (breaking) or
//     introduce a parallel "headless mode" branch that consumers must
//     reason about. A separate function keeps each path simple.
//   - Running the engine in pure Node has different invariants
//     (`ResizeObserver` doesn't exist, `customElements` doesn't exist,
//     canvas-based text measurement falls back to char-count
//     estimates). Centralizing those expectations here means the
//     browser path of `IChart` can keep assuming a real DOM.
//
// The chart instance is fully `dispose()`d before the function returns
// (via `try`/`finally`), so no engine resources leak across
// invocations — the call site stays one-liner-safe even in a hot
// request loop.
//
// Plugin-backed chart types (`wordcloud`, `liquidprogress`) require
// their `@echarts-x/*` installer to be registered against the shared
// `echarts` global. The main entry (`@bndynet/icharts`) does this as a
// side-effect, but the SSR-safe entry (`@bndynet/icharts/core`) does
// not. SSR consumers who need those types must register the installer
// explicitly — see the function JSDoc for the exact incantation.

import * as echarts from 'echarts';
import type { ChartData, AnyChartOptions } from './types.js';
import { resolveEChartsOption } from './adapters/index.js';
import { applyConfiguredFontFamilyToOption } from './adapters/common/font-family.js';
import { getConfig } from './config.js';
import { ensureThemesRegistered, resolveThemeName } from './themes/index.js';

/**
 * Options forwarded to ECharts' SSR-mode `init` and `renderToSVGString`
 * for {@link renderChartToSVGString}.
 *
 * `width` and `height` are required because, unlike a browser chart
 * that can read its own container dimensions, a headless instance has
 * no DOM to size against — the caller must declare the SVG viewport
 * up front.
 */
export interface RenderChartToSVGStringOptions {
  /** Width of the rendered SVG viewport in pixels. */
  width: number;
  /** Height of the rendered SVG viewport in pixels. */
  height: number;
  /**
   * Locale forwarded to ECharts for date / time / number formatters.
   * Defaults to ECharts' built-in locale (`'EN'`).
   */
  locale?: string;
  /**
   * Controls whether the root `<svg>` element carries a `viewBox`
   * attribute. Both modes always emit `width` + `height` attrs.
   *
   * - `true` (default, matches ECharts) — root SVG has
   *   `width="W" height="H" viewBox="0 0 W H"`. The intrinsic
   *   dimensions are still `W × H`, but the `viewBox` lets a host
   *   stylesheet override `width` / `height` (or wrap the SVG in a
   *   responsive container) without distorting the chart geometry.
   *   This is the right default for HTML / web embeds.
   * - `false` — root SVG has only `width="W" height="H"` (no
   *   `viewBox`). The output renders at exactly the input dimensions
   *   and ignores any CSS resizing of the host element. Use this for
   *   strictly fixed-size output: print, PDF rasterizers that resolve
   *   intrinsic dims, screenshot diffs.
   *
   * Either way, the chart's internal coordinate system is laid out
   * against `ssr.width × ssr.height`, so font sizes / strokes / symbol
   * radii stay constant regardless of how the SVG is later scaled.
   *
   * Forwarded directly to ECharts' `renderToSVGString({ useViewBox })`.
   */
  useViewBox?: boolean;
}

/**
 * Render a chart to a full `<svg>...</svg>` string in a server / Node
 * runtime.
 *
 * Uses ECharts' built-in SSR mode (`ssr: true` + `renderer: 'svg'`) so
 * the whole call path is DOM-free and canvas-free — safe to invoke
 * from Next.js / Nuxt / Astro / SvelteKit / Vite SSR / serverless /
 * CLI scripts. The returned string is suitable for:
 *
 *   - Embedding inline in server-rendered HTML pages, emails, PDFs.
 *   - Saving to disk: `fs.writeFileSync('chart.svg', svg)`.
 *   - Converting to PNG via a standalone library, e.g.
 *     [`sharp`](https://sharp.pixelplumbing.com/) or
 *     [`@resvg/resvg-js`](https://github.com/yisibl/resvg-js).
 *     icharts deliberately stays SVG-only so SSR consumers don't pay
 *     for a native canvas dependency they may not need.
 *
 * The underlying ECharts instance is created and `dispose()`d entirely
 * inside this function (`try`/`finally`), so calling this in a hot
 * request loop doesn't leak engine resources.
 *
 * **Plugin-backed chart types.** `liquidprogress` requires the
 * `@echarts-x/custom-liquid-fill` plugin to be registered with the
 * shared ECharts global. The main entry (`@bndynet/icharts`)
 * registers it via side-effect on import, but the SSR-safe entry
 * (`@bndynet/icharts/core`) does NOT — server consumers opt in via
 * the {@link installLiquidProgress} helper, which keeps the
 * `echarts` and `@echarts-x/*` packages internal to this library:
 *
 * ```ts
 * import { installLiquidProgress, renderChartToSVGString } from '@bndynet/icharts/core';
 * installLiquidProgress(); // once at boot; idempotent
 * const svg = renderChartToSVGString(
 *   'liquidprogress',
 *   { value: 0.65 },
 *   { width: 400, height: 400 },
 * );
 * ```
 *
 * `wordcloud` is **not** SSR-renderable, no matter how you register
 * it. The `@echarts-x/custom-word-cloud` package touches `window` at
 * module-load and `canvas.addEventListener` at render-time — both
 * fundamental browser dependencies. Render wordcloud on the client
 * only, via `createChart('wordcloud', ...)` from the main
 * `@bndynet/icharts` entry. See `src/ssr-plugins.ts` for the full
 * rationale.
 *
 * **SSR fallbacks** (vs. browser rendering):
 *
 *   - `canvas.measureText` is unavailable, so adapters that measure
 *     label widths fall back to a `chars × 7px` estimate. Race
 *     `grid.right` headroom and tree label widths can drift by 1–2 px.
 *   - `ResizeObserver` is unavailable, so the pie adapter's resize-
 *     driven center/radius recompute is replaced by the static
 *     percent fallback (still legible, slightly less centered).
 *   - SVG renderer text width is approximated, not measured against a
 *     real canvas, so very long labels can wrap differently than in
 *     the browser. Pad your widths slightly if you depend on exact
 *     parity.
 *
 * @example
 * ```ts
 * import { renderChartToSVGString } from '@bndynet/icharts/core';
 * import { writeFileSync } from 'node:fs';
 *
 * const svg = renderChartToSVGString(
 *   'line',
 *   {
 *     categories: ['Jan', 'Feb', 'Mar'],
 *     series: [{ name: 'Sales', data: [10, 20, 30] }],
 *   },
 *   { width: 800, height: 400 },
 *   { title: 'Q1 Sales' },
 * );
 * writeFileSync('chart.svg', svg);
 * ```
 *
 * @param type    Chart type string (e.g. `'line'`, `'bar'`, `'pie'`).
 *                Must match a registered adapter.
 * @param data    Chart data — same shape consumed by `createChart`.
 * @param ssr     Required SSR-render options (`width`, `height`,
 *                `locale?`, `useViewBox?`). Replaces the DOM
 *                container that the browser API would take.
 * @param options Optional `XxxChartOptions` (theme, title, legend,
 *                tooltip, …). Same shape as the fourth argument to
 *                `createChart`.
 * @returns Full `<svg>...</svg>` markup as a single string.
 * @throws Error when `ssr.width` / `ssr.height` are missing or
 *         non-finite, when `type` has no registered adapter, or when
 *         `data` fails the adapter's `validate` check (same errors
 *         the browser path would surface).
 */
export function renderChartToSVGString(
  type: string,
  data: ChartData,
  ssr: RenderChartToSVGStringOptions,
  options: AnyChartOptions = {},
): string {
  // Defensive: width/height are the one input we can't reasonably
  // default. Surface a clear error rather than letting ECharts emit
  // an opaque "size not specified" warning into stderr.
  if (
    !ssr ||
    typeof ssr.width !== 'number' ||
    !Number.isFinite(ssr.width) ||
    ssr.width <= 0 ||
    typeof ssr.height !== 'number' ||
    !Number.isFinite(ssr.height) ||
    ssr.height <= 0
  ) {
    throw new Error(
      'renderChartToSVGString: `ssr.width` and `ssr.height` are required and must be positive finite numbers (in px).',
    );
  }

  ensureThemesRegistered();
  const themeName = resolveThemeName(options.theme);

  // SSR-mode init: pass `null` for the DOM (ECharts 6 explicitly
  // supports this when `ssr: true`), forward locale + dimensions, pin
  // the SVG renderer.
  const ec = echarts.init(null, themeName, {
    renderer: 'svg',
    ssr: true,
    width: ssr.width,
    height: ssr.height,
    locale: ssr.locale,
  });

  try {
    const { option, onInit, notMerge } = resolveEChartsOption(
      type,
      data,
      options,
      {
        // Headless: never in shadow DOM, no observed-frame interval.
        // Container dims are surfaced from the SSR options so adapters
        // that compute pixel-derived sizing (e.g. gauge `percentage`)
        // get the same input they would in the browser.
        inShadowDom: false,
        containerWidth: ssr.width,
        containerHeight: ssr.height,
      },
    );
    applyConfiguredFontFamilyToOption(option, getConfig().fontFamily);
    ec.setOption(option, notMerge ?? true);
    // Run the adapter's post-init hook (e.g. pie's pixel-perfect
    // center/radius recompute). The hook is required to short-circuit
    // when DOM-only APIs are missing (`ResizeObserver`, `getDom()` on
    // a headless instance) — every built-in adapter already does, and
    // the SSR fallbacks listed in the JSDoc above are the trade-offs.
    onInit?.(ec);
    return ec.renderToSVGString({ useViewBox: ssr.useViewBox });
  } finally {
    // Always dispose, even on a thrown adapter / setOption — leaving
    // a headless ECharts instance alive in a request handler would
    // accumulate across calls and silently drift memory.
    ec.dispose();
  }
}
