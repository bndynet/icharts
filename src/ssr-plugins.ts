// SSR-safe plugin installers — named functions that hide the
// `echarts` and `@echarts-x/*` package boundaries from server-side
// consumers of `@bndynet/icharts/core`.
//
// Why this file exists, and how it differs from `src/installers/index.ts`:
//
//   `src/installers/index.ts` is a *side-effect* module: importing it
//   immediately calls `echarts.use(...)` for every browser-friendly
//   `@echarts-x/*` plugin. It's the single entry the browser-first
//   main entry (`src/index.ts`) pulls in, which is why
//   `import '@bndynet/icharts'` "just works" for wordcloud and
//   liquid-progress on the client. But that file STATICALLY imports
//   `@echarts-x/custom-word-cloud`, whose module body references
//   `window` — so it cannot be imported on the server.
//
//   This file, by contrast:
//
//     1. Exposes **named functions**, not side effects. Consumers
//        call them explicitly, so registration costs nothing for
//        request handlers that don't need the plugin.
//     2. Only re-exports plugins that are actually SSR-renderable.
//        Currently that's `installLiquidProgress` only — see the
//        large comment at the bottom for why `wordcloud` is
//        deliberately not exposed.
//     3. Keeps the `echarts` and `@echarts-x/*` packages internal.
//        Consumers of `@bndynet/icharts/core` never have to
//        `import * as echarts from 'echarts'` or
//        `import x from '@echarts-x/...'` — the package boundary
//        stays clean.
//
// `echarts.use(...)` is idempotent (it dedupes by class identity),
// so calling these installers on every request, in every concurrent
// handler, or from multiple modules is harmless. The fast path after
// the first call is a `Map.has` lookup inside ECharts.

import * as echarts from 'echarts';
import liquidFillInstaller from '@echarts-x/custom-liquid-fill';

/**
 * Register the `@echarts-x/custom-liquid-fill` plugin so
 * {@link renderChartToSVGString} can render `'liquidprogress'` charts
 * on the server.
 *
 * Call this **once, before the first `renderChartToSVGString` call**
 * that targets `'liquidprogress'`. Subsequent calls are idempotent
 * (ECharts dedupes plugin registrations by class identity), so
 * sprinkling it at the top of every handler is safe but unnecessary.
 *
 * The wrapper exists so SSR consumers never have to import `echarts`
 * or `@echarts-x/*` directly — the public surface stays
 * `@bndynet/icharts/core`. The implementation is intentionally tiny
 * (a single `echarts.use(...)` call); the value is the API boundary,
 * not the code.
 *
 * @example
 * ```ts
 * import { installLiquidProgress, renderChartToSVGString } from '@bndynet/icharts/core';
 *
 * installLiquidProgress();
 *
 * const svg = renderChartToSVGString(
 *   'liquidprogress',
 *   { value: 0.65 },
 *   { width: 400, height: 400 },
 *   { title: 'CPU' },
 * );
 * ```
 *
 * @example Express handler with per-request rendering
 * ```ts
 * import express from 'express';
 * import { installLiquidProgress, renderChartToSVGString } from '@bndynet/icharts/core';
 *
 * // Register once at boot time — idempotent, but no reason to repeat.
 * installLiquidProgress();
 *
 * app.get('/chart.svg', (req, res) => {
 *   const svg = renderChartToSVGString('liquidprogress', { value: Number(req.query.v) }, { width: 400, height: 400 });
 *   res.type('image/svg+xml').send(svg);
 * });
 * ```
 */
export function installLiquidProgress(): void {
  echarts.use(liquidFillInstaller);
}

/*
 * Note on `wordcloud`: there is intentionally NO `installWordCloud`
 * in this module. The `@echarts-x/custom-word-cloud` package is not
 * SSR-renderable, for two independent reasons:
 *
 *   1. Module-load: the plugin's top-level code runs
 *      `if (!window.setImmediate) { ... }` followed by
 *      `document.createElement('canvas')`. Both throw
 *      `ReferenceError` the moment the module is imported in Node —
 *      even a dynamic `await import('@echarts-x/custom-word-cloud')`
 *      crashes. So any wrapper here would either need to install a
 *      global `window` / `document` polyfill into the consumer's
 *      process (a silent side effect we won't bake in) or fail.
 *
 *   2. Runtime: even with a `window` / `document` polyfill the
 *      plugin's word-placement algorithm crashes with
 *      `canvas.addEventListener is not a function`. The layout step
 *      needs a *real* canvas (text metrics, event listeners on the
 *      canvas element). Supporting that requires jsdom + node-canvas,
 *      which fundamentally moves the runtime out of "pure SSR" — at
 *      that point you might as well render the chart with Playwright
 *      / Puppeteer.
 *
 * Wordcloud therefore stays a browser-only chart type. Use it via
 * `createChart('wordcloud', ...)` from `@bndynet/icharts` on the
 * client. The SSR-mode fallbacks list in README ("Option 4 — SSR")
 * and the JSDoc on `renderChartToSVGString` document this.
 *
 * If the upstream plugin ever publishes an SSR-friendly build (no
 * top-level browser globals, headless layout fallback), add a
 * matching `installWordCloud()` here and wire it into the regression
 * test in `src/ssr-plugins.test.ts`.
 */
