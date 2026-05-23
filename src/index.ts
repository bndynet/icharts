// Browser-first entry: re-exports the full public API from
// `./index-core.js`, registers the `@echarts-x` chart-type installers
// (wordcloud + liquid-fill), and loads the `<i-chart>` web component
// as a side-effect (custom-element registration happens at module
// load when `customElements` is available; see
// `./components/i-chart.js` for the Node-safe guard).
//
// SSR / server runtimes that need to avoid the web-component load and
// the `window` / `document` dependencies of the @echarts-x installers
// should import from `@bndynet/icharts/core` instead (resolves to
// `./index-core.js`).

// Side-effect: register `@echarts-x` chart-type plugins with the
// shared ECharts global. Kept out of `./core.js` so the SSR-safe
// `./index-core.js` doesn't pull `window` / `document` references
// into the module graph.
import './installers/index.js';

export * from './index-core.js';

// Web component (registers <i-chart> custom element as side effect in
// environments with a `customElements` registry; a no-op in Node).
export { IChartElement } from './components/i-chart.js';
