# AGENTS.md — @bndynet/icharts

Instructions for AI coding agents working in this repository.

## Project overview

**icharts** is a lightweight ECharts wrapper that exposes:

- `<i-chart>` — Lit web component (`src/components/i-chart.ts`); `type` is a **string** (no hardcoded whitelist in the component).
- `createChart()` — imperative API (`src/api.ts`)
- **Adapter pattern** — each chart type maps `ChartData` + `ChartOptions` → an ECharts `option` object

Built-in types: `line`, `area`, `bar`, `pie`, `gauge`, `sankey`, `chord`. Consumers can also call `registerAdapter()` at runtime (documented in README; not the same as adding a built-in type).

Stack: TypeScript (ESM), ECharts 6, Lit 3 (`experimentalDecorators` in `tsconfig.json`), `@bndynet/color-hub` for themes/colors.

**Public API reference:** treat **README.md** as the source of truth for `ChartOptions`, data shapes, and user-facing examples. Do not duplicate large option tables here.

## Repository layout

```
src/
  adapters/           # Per-type option builders + adapter registry
    common.ts         # buildTitle, buildLegend, buildGrid, tooltips, …
    series-utils.ts   # Per-series opts, markLine/markPoint (XY charts)
    graph-colors.ts   # mapGraphNodesForECharts (sankey + chord node colors)
    line.ts           # line + area (two adapters in index.ts)
  components/         # <i-chart> web component (Lit)
  themes/             # registerTheme, switchTheme, palette / ColorHub
  types.ts            # ChartType, data shapes, ChartOptions, type guards
  core.ts             # IChart engine: resolve → applyChartColors → setOption
  utils.ts            # deepMerge, getSeriesNames, applyChartColors
  config.ts           # configure({ consistentColors })
  registry.ts         # Active chart instance registry
  async-tooltip.ts    # Async tooltip formatter helper
  tooltip-context.ts  # Normalized tooltip contexts (pie, sankey, chord)
  api.ts              # createChart()
  index.ts            # Public exports
site/                 # Demo/docs site (Vue + @bndynet/vue-site)
dist/                 # Build output — do not edit by hand
```

## Commands

Run from the **repository root**:

| Command | Purpose |
|---------|---------|
| `npm install` | Install root dependencies |
| `npm run typecheck` | `tsc --noEmit` — **run before finishing TS changes** |
| `npm run lint` | ESLint on `src/**/*.ts` |
| `npm run test` | Vitest (`src/**/*.{test,spec}.ts`) |
| `npm run build` | `tsup` library build + site build |
| `npm run dev` | Library watch mode (`tsup --watch`) |
| `npm start` | Demo site dev server (`cd site && npm i && npm run dev`) |

When changing library code, at minimum run **`npm run typecheck`**, **`npm run lint`**, and **`npm run test`**. Run **`npm run build`** when touching exports, build config, or site integration.

## Code style and conventions

### TypeScript

- **ES modules** — use `.js` extensions in relative imports (e.g. `import { X } from './types.js'`).
- **Strict typing** — prefer explicit types on public APIs; avoid `any` (ESLint warns on `@typescript-eslint/no-explicit-any`).
- **Unused vars** — prefix intentionally unused parameters with `_`.
- **Exports** — public API surface lives in `src/index.ts`; export new types/functions from there when they are part of the package API.

### Architecture rules

1. **Adapters build options only** — `resolve*Options()` returns `Record<string, unknown>` **or** `ChartSetupResult` (`{ option, onInit? }`). Do not call `echarts.init` inside adapters.
2. **Reuse shared builders** — `src/adapters/common.ts` provides `buildTitle`, `buildLegend`, `buildGrid`, `buildXAxis`, `buildYAxis`, `buildTooltip`, etc. XY charts should use `src/adapters/series-utils.ts` for per-series options, mark lines/points, and y-axis index handling. Do **not** call `getCommonDefaults()` unless it is wired into the adapter pipeline (currently unused by built-in adapters).
3. **Merge user overrides, then apply the resolved palette** — end adapter functions with:
   ```ts
   const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
   merged.color = resolveColors(names, options); // palette wins over user echarts.color
   return merged;
   ```
   Graph adapters additionally call `paintGraphNodes(merged, '<seriesType>', nameToColor)` after merge so per-node colors survive any user `echarts.series` override.
4. **Variants** — use `options.variant ?? 'default'` and branch layout/behavior (see `bar.ts` for `horizontal` / `spark`, `pie.ts` for `doughnut`, etc.). Add new variant literals to `src/types.ts` and document them in README.
5. **Colors (two-layer pipeline)** — strict separation between *resolving* a color and *placing* it into an ECharts option:
   - **Resolver layer** — `resolveColors(names, options)` and `resolveColorsForNodes(nodes, options)` in `src/utils.ts` are the single entry point for "name → color". They respect theme palette, `options.colors`, `options.colorMap`, `configure({ consistentColors })`, and (for nodes) `node.color`. Adapters must call these; never reach into `colorHub` or read theme palettes directly.
   - **Assembly layer** — every adapter assembles colors into whichever ECharts fields suit the chart type:
     - XY / pie / bar / area → write `merged.color = colors` after `deepMerge`.
     - Graph (`sankey`, `chord`, custom `{ nodes, links }` types) → use `mapGraphNodesForECharts()` for the shape, then `paintGraphNodes()` to inject `itemStyle.color` on each node after merge.
     - Area + spark → also call `buildSparkAreaGradient(colors[i])` per series.
   - `core.ts` does **not** post-process colors. There is no central `applyChartColors` step anymore — what the adapter returns is what ECharts receives.
6. **Spark charts** — hide legend/axes/grid appropriately; keep tooltips minimal (see `line.ts`, `bar.ts`).
7. **Tooltips** — for async `options.tooltip.customHtml`, use `createAsyncTooltipFormatter` from `async-tooltip.ts` and normalized contexts from `tooltip-context.ts` (see `pie.ts`, `chord.ts`).
8. **No parallel frameworks** — do not introduce a second chart abstraction; extend the existing adapter registry.

### File naming

- One file per chart family under `src/adapters/` (e.g. `line.ts` holds both **line** and **area** resolvers; two `registerAdapter` entries in `index.ts`).
- Export a `resolve<Type>Options(data, options)` function from that file.
- Register in `src/adapters/index.ts` only.

### Documentation

- **README.md** — user-facing API, data formats, chart type table, variants.
- **AGENTS.md** — agent workflow (this file). Keep in sync with structural changes.

### Demo site

- Interactive examples: `site/views/ChartsView.vue`
- Add at least one demo card for new built-in types (template + `createChart` sample in `<pre v-pre>`).
- Site watches the library via `site/site.config.ts` → `watchPackages` entry for `@bndynet/icharts`.

## Color / theme pipeline (read before adding charts)

Two layers, one entry point per layer. The adapter owns the join.

```
                     ┌────────────────────────────────┐
                     │ RESOLVER (src/utils.ts)        │
                     │   resolveColors(names, opts)   │
                     │   resolveColorsForNodes(...)   │
                     └────────────┬───────────────────┘
                                  │ colors[]
                                  ▼
adapter.resolve(data, options) ─── builds option ───  deepMerge(echarts) ─── apply colors ───▶ setOption
                                                                            (merged.color +
                                                                             paintGraphNodes
                                                                             for graph types,
                                                                             buildSparkArea
                                                                             Gradient for spark)
```

| Chart | Names from | Where colors are placed |
|-------|------------|--------------------------|
| line, bar, area, pie | `series[].name` / slice `name` | `merged.color` (array, set after `deepMerge`) |
| area + spark | same | `merged.color` + per-series `areaStyle` gradient |
| sankey, chord | `nodes[].name` | `merged.color` + per-node `itemStyle.color` via `paintGraphNodes` |
| gauge | _(none)_ | ECharts registered theme only (no resolver call) |

**Sankey vs Chord data:** both use `{ nodes, links }`. Type guards `isSankeyData` / `isChordData` are structurally identical — the chart **`type`** string selects the adapter.

### Do not hardcode chart colors in adapters

In **`src/adapters/**`** (and other chart option builders), **do not** assign literal hex/rgb colors for series, slices, or nodes (e.g. `itemStyle: { color: '#3b82f6' }`, `color: ['#...']`). Colors must flow through:

- `resolveColors` / `resolveColorsForNodes` — the only sources of truth for "name → color".
- `mapGraphNodesForECharts` (shape) + `paintGraphNodes` (color injection) for graph series types.
- User data (`node.color`) or `ChartOptions` (`colors`, `colorMap`).
- Registered themes (`src/themes/presets.ts`, `registerTheme()`).

**Allowed exceptions:**

- **Theme definitions** — `src/themes/presets.ts`, `registerTheme()`, `echarts-theme.ts` (palette and UI tokens live here).
- **Derived visuals** — opacity-only styling with no new hue (e.g. `buildSparkAreaGradient`, `lineStyle: { color: 'gradient' }` for sankey/chord ribbons).
- **Non-data UI** — tooltip error text, axis/grid defaults from ECharts theme (not per-series palette).
- **Last-resort fallback** — only inside shared color utilities (e.g. `resolveColorsForNodes` fallback), not per chart type.
- **Tests** — fixed hex in `*.test.ts` fixtures is fine.

## Adding a new **built-in** chart type

**Only extend the library when the user wants a new built-in type.** For app-specific charts, use `registerAdapter()` (README **Extensibility**).

Use this checklist. Do **not** skip steps.

### 1. Types (`src/types.ts`)

- [ ] Add value to `ChartType` enum (string literal must match the `type` argument users pass).
- [ ] Define data interface(s) (e.g. `ScatterData`).
- [ ] Extend `ChartData` union.
- [ ] Add `isXxxData(data: ChartData): data is XxxData` type guard with precise structural checks.
- [ ] If the type has sub-styles, add `XxxVariant` and extend `ChartVariant`.
- [ ] Extend `ChartOptions` only when new cross-cutting options are required.

### 2. Adapter module (`src/adapters/<type>.ts`)

- [ ] Implement `resolveXxxOptions` (return type: `Record<string, unknown>` or `ChartSetupResult`).
- [ ] Use shared builders from `common.ts` where applicable.
- [ ] Handle `options.variant`, `options.title`, `options.legend`, `options.padding`, `options.tooltip`, etc. consistently with sibling adapters.
- [ ] Build the option *without* any color literals or theme lookups — call `resolveColors` / `resolveColorsForNodes` for that.
- [ ] End with: `deepMerge(eOption, options.echarts ?? {})` → assign `merged.color = resolveColors(names, options)` → (graph types only) `paintGraphNodes(merged, '<seriesType>', nameToColor)` → return `merged`.

**Optional `onInit` hook:**

```ts
import type { ChartSetupResult } from './index.js';

export function resolveXxxOptions(data: XxxData, options: ChartOptions): ChartSetupResult {
  return {
    option: { /* ... */ },
    onInit: (instance) => { /* event listeners */ },
  };
}
```

Reference implementations:

| Pattern | Reference file |
|---------|----------------|
| XY + variants + stacked | `src/adapters/bar.ts` |
| XY + time axis; line **and** area | `src/adapters/line.ts` |
| Item tooltips + variants | `src/adapters/pie.ts` |
| Graph nodes/links | `src/adapters/sankey.ts`, `src/adapters/chord.ts` |
| Single-metric | `src/adapters/gauge.ts` |

### 3. Colors (`src/utils.ts` + `src/adapters/graph-colors.ts` for graph types)

The adapter is responsible for both *resolving* (one call to the resolver) and *placing* (assigning to the right ECharts field). `core.ts` does not touch colors.

- [ ] Compute the ordered list of names from your data (`series[].name`, `slice.name`, `node.name`, …).
- [ ] Call `resolveColors(names, options)` (or `resolveColorsForNodes(nodes, options)` for `{ nodes, links }` data) to obtain a `string[]` palette of the same length.
- [ ] **XY / pie / bar / area**: `merged.color = colors` after `deepMerge`.
- [ ] **Graph types** (`{ nodes, links }`): build entries with `mapGraphNodesForECharts(nodes, extra?)` (pure shape mapper, no colors), then after `deepMerge` call `paintGraphNodes(merged, '<seriesType>', new Map(nodes.map((n, i) => [n.name, colors[i]])))`.
- [ ] **Area + spark**: also apply `buildSparkAreaGradient(colors[i])` to each `series[i].areaStyle`.
- [ ] **No-name types** (e.g. gauge): skip the resolver entirely; rely on the registered ECharts theme.

### 4. Registry (`src/adapters/index.ts`)

```ts
registerAdapter(ChartType.Xxx, {
  validate: isXxxData,
  resolve: (data, options) => ({
    option: resolveXxxOptions(data as XxxData, options),
  }),
});
```

If `resolveXxxOptions` already returns `ChartSetupResult`, pass it through:

```ts
registerAdapter(ChartType.Chord, {
  validate: isChordData,
  resolve: (data, options) => resolveChordOptions(data as ChordData, options),
});
```

### 5. Public exports (`src/index.ts`)

- [ ] Export new types and guards if they are part of the public API.

### 6. README.md

- [ ] Add row to **Chart Types** table (type string + variants).
- [ ] Add **Data Formats** section with a TypeScript example.
- [ ] Mention new `ChartOptions` fields if any.

### 7. Demo (`site/views/ChartsView.vue`)

- [ ] Add an `el-card` demo with `createChart(el, '<type>', sampleData, options)`.
- [ ] Include a collapsible code sample in `<pre v-pre>`.

### 8. Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build   # when exports or build pipeline may be affected
```

Add unit tests under `src/**/*.test.ts` for new `isXxxData` guards and color/validation logic.

## External / custom chart types (runtime only)

For **consumer-defined** types without modifying this repo, use `registerAdapter(type, adapter)` — see README **Extensibility** section.

## Boundaries — do not

- Edit `dist/` or `site/site-dist/` manually (generated artifacts).
- Commit `node_modules/`.
- Bump version in `package.json` unless the user asks for a release.
- Add heavy dependencies without discussion (keep the bundle lean; ECharts/Lit/color-hub are core).
- Break existing chart type strings or data shapes without a major version plan.
- Resolve colors anywhere except via `resolveColors` / `resolveColorsForNodes` — do not read `colorHub` directly, do not duplicate the priority rules (`options.colors` / `options.colorMap` / `consistentColors` / `node.color`).
- Hardcode hex/rgb palette colors in `src/adapters/**` — use the color pipeline above (see **Do not hardcode chart colors**).
- Re-introduce a central `applyChartColors` / `core.ts` color post-processing step — adapters now own color assembly end-to-end.

## Git and PR expectations

- Keep changes focused; one chart type or one concern per PR when possible.
- Match existing code style in the file you edit.
- Ensure `typecheck`, `lint`, and `test` pass before marking work complete.
