/**
 * Browser-first side-effect module that registers the `@echarts-x`
 * custom chart types (wordcloud + liquid-fill) with the shared
 * ECharts instance.
 *
 * Why this is split out of `core.ts`:
 *
 * `@echarts-x/custom-word-cloud` reads `window` and calls
 * `document.createElement('canvas')` at module-load time (a
 * `setImmediate` polyfill plus a feature probe). Importing the
 * package in pure Node throws `ReferenceError: window is not defined`
 * before any user code runs.
 *
 * Keeping the imports inside `core.ts` therefore poisoned every
 * downstream consumer — including the SSR-safe
 * `@bndynet/icharts/core` subpath — because `core.ts` is on the
 * shared engine path used by `createChart()` / `new IChart()`.
 *
 * By isolating the installs in this file and importing it as a
 * side-effect *only* from `src/index.ts` (the browser-first main
 * entry), we get:
 *
 *   - `@bndynet/icharts`        → main entry, registers wordcloud +
 *     liquid-fill on import (browser/CSR behavior is unchanged).
 *   - `@bndynet/icharts/core`   → SSR-safe entry, never pulls
 *     `@echarts-x/*` into the module graph. Safe to import in
 *     Next.js / Nuxt / Astro / SvelteKit / Vite SSR.
 *
 * `echarts.use(...)` is idempotent (it dedupes registrations by
 * class identity) so loading this module multiple times is harmless.
 *
 * SSR consumers who use `/core` but still need wordcloud or
 * liquid-progress on the client should either:
 *
 *   - Import `@bndynet/icharts` from a client-only code path
 *     (`onMounted`, `useEffect`, `'use client'`), OR
 *   - Import this module explicitly:
 *       `await import('@bndynet/icharts/dist/installers/index.js')`
 *     before constructing the chart on the client.
 */
import * as echarts from 'echarts';
import wordCloudInstaller from '@echarts-x/custom-word-cloud';
import liquidFillInstaller from '@echarts-x/custom-liquid-fill';

echarts.use(wordCloudInstaller);
echarts.use(liquidFillInstaller);

export {};
