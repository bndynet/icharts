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
  types/              # One file per chart family (mirrors src/adapters/<chart>.ts).
                      #   shared.ts          → TitleOptions, LegendOptions, GridOptions,
                      #                        AxisOptions, SeriesOptions, TooltipOptions,
                      #                        TooltipContext*
                      #   base.ts            → ChartType, ChartOptions (cross-cutting only)
                      #   xy.ts              → XYData, XYDataSeries, XYChartOptions, isXYData
                      #   line.ts / bar.ts /
                      #   area.ts            → LineData/BarData/AreaData aliases of XYData,
                      #                        per-chart variants and *ChartOptions
                      #                        (bar.ts / line.ts also hold *RaceOptions for the
                      #                        variant-specific race namespace)
                      #   pie.ts             → PieData, PieVariant, PieChartOptions, isPieData
                      #   gauge.ts           → GaugeData, GaugeVariant, GaugeChartOptions,
                      #                        isGaugeData
                      #   sankey.ts          → SankeyNode/Link/Data, SankeyVariant,
                      #                        SankeyChartOptions, isSankeyData
                      #   chord.ts           → ChordNode/Link/Data, ChordChartOptions,
                      #                        isChordData
                      #   instance.ts        → ChartData / ChartVariant / AnyChartOptions
                      #                        unions and IChartInstance
                      #   index.ts           → barrel re-exporting every file above
  types.ts            # Backwards-compat barrel: `export * from './types/index.js';`
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

1. **Adapters build options only** — `resolve*Options()` returns `Record<string, unknown>` **or** `ChartSetupResult` (`{ option, onInit?, notMerge? }`). Do not call `echarts.init` inside adapters. Set `notMerge: false` when the adapter needs ECharts to animate transitions across successive `chart.update()` calls (e.g. bar `race`); the default `true` performs a full replace. Adapters that need to react to the consumer's update cadence (auto-sizing race animation duration, throttling expensive computations, etc.) accept an optional third `ctx: RenderContext` arg — currently exposes `observedFrameMs` (wall-clock gap between the last two `chart.update()` calls) and `maxRaceGridRight` (engine-tracked high-water mark of the largest `grid.right` any prior frame emitted, for monotonic label-headroom calculations). See `src/adapters/race-utils.ts` (`resolveRaceFrameDuration`, `resolveRaceLabelHeadroom`) for the canonical usage.
2. **Reuse shared builders** — `src/adapters/common.ts` provides `buildTitle`, `buildLegend`, `buildGrid`, `buildXAxis`, `buildYAxis`, `buildTooltip`, etc. XY charts should use `src/adapters/series-utils.ts` for per-series options, mark lines/points, and y-axis index handling. Do **not** call `getCommonDefaults()` unless it is wired into the adapter pipeline (currently unused by built-in adapters).
3. **Merge user overrides, then apply the resolved palette** — end adapter functions with:
   ```ts
   const merged = deepMerge(eOption, (options.echarts ?? {}) as Record<string, unknown>);
   merged.color = resolveColors(names, options); // palette wins over user echarts.color
   return merged;
   ```
   Graph adapters additionally call `paintGraphNodes(merged, '<seriesType>', nameToColor)` after merge so per-node colors survive any user `echarts.series` override.
4. **Variants** — use `options.variant ?? 'default'` and branch layout/behavior (see `bar.ts` for `horizontal` / `spark`, `pie.ts` for `doughnut`, etc.). Add new variant literals to the matching per-chart file under `src/types/` (e.g. `src/types/bar.ts`) and document them in README.
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
- **docs/COLORS.md** — internal design guide for the color pipeline (resolver layer, assembly layer, theme tokens, per-chart placement rules). Read before adding a new chart type or touching `src/utils.ts` color helpers.
- **docs/LEGEND.md** — internal design guide for legend rendering and layout (`buildLegend` for appearance, `getLegendReserve` for per-edge pixel slots, grid vs body-centered consumer patterns). Read when adding a chart that renders a legend or extending the legend API.

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

## Legend layout pipeline (read before adding charts with a legend)

Same two-layer pattern as colors. One **appearance** builder, one **reserve** helper, two consumer paths — full design rationale and examples in [docs/LEGEND.md](docs/LEGEND.md).

```
                ┌────────────────────────────────────────┐
                │  RESERVE LAYER  (src/adapters/common)  │
                │   getLegendReserve(options, show,      │
                │                    extraGap?)          │
                │   → EdgeReserves {top,bottom,left,right}│
                └─────────────────┬──────────────────────┘
                                  │
              ┌───────────────────┼──────────────────────┐
              ▼                   ▼                      ▼
         buildGrid           buildRadarLayout       <new chart>
         (XY: grid edges)    (radar: center +       (body-centered
                              radius shrink)         positioning)
```

`buildLegend(names, options)` is the orthogonal **appearance** helper — emits the ECharts `legend` block (icon, itemGap, position-driven `top`/`bottom`/`left`/`right`). Adapters never hand-author a `legend: { ... }` literal.

| Consumer | Chart types | What it does with `EdgeReserves` |
|---|---|---|
| `buildGrid` (XY grid path) | line, bar, area | Pulls grid edge back by `padding + reserve`. Adapters call `buildGrid` (which uses the helper internally), not the helper directly. |
| Body-centered path | radar (today), pie / gauge (potential) | Shifts component `center` and shrinks `radius` via percent math against a reference card size. Sees the reserve as raw pixels, no `padding` added. |

### Rules

1. **`LegendOptions` only on subtypes that render a legend.** `XYChartOptions` (line/bar/area), `PieChartOptions`, `RadarChartOptions`. **Never** on base `ChartOptions` — gauge / sankey / chord deliberately don't expose it.
2. **One source of truth for the slot.** `LEGEND_RESERVE` is defined once in `src/adapters/common.ts` and exported. Do not redeclare in any adapter.
3. **Use `getLegendReserve(options, showLegend, extraGap?)` whenever a non-XY chart needs to react to legend position.** Returns `EdgeReserves` (`{top,bottom,left,right}`) with the slot on exactly the active edge, zero elsewhere.
4. **`extraGap` is for body-overflow only.** Use it when chart-body decorations extend past the nominal radius (radar.axisName overflows ~15 px → `RADAR_EDGE_GAP = 24`). Don't use it to "make the legend bigger" — adjust spacing inside `echarts.legend` instead.
5. **Compute `showLegend` once, forward it twice.** The adapter picks a chart-appropriate default (e.g. radar: `options.legend?.show ?? names.length > 1`) and passes the same value to both `buildLegend` and `getLegendReserve`. Don't let them disagree.
6. **Theme owns the text color.** Legend text follows `colors.textPrimary` via `src/themes/echarts-theme.ts`. Adapters don't set `legend.textStyle.color`.

### Public surface for `registerAdapter()` users

Custom chart types written outside this repo can import the same helpers:

```ts
import {
  buildLegend,
  getLegendReserve,
  LEGEND_RESERVE,
  type EdgeReserves,
  type LegendOptions,
} from '@bndynet/icharts';
```

See [docs/LEGEND.md §6](docs/LEGEND.md) for a full custom-adapter example.

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

### 1. Types (`src/types/<type>.ts`)

Every new chart type MUST add **both** a named `Data` type and a named `*ChartOptions` type extending `ChartOptions` (or `XYChartOptions` for an XY-family chart). Chart-specific knobs live on the subtype — **never** add them to the base `ChartOptions`.

Type declarations are organized one file per chart family under `src/types/` (mirroring `src/adapters/<chart>.ts`):

- Per-chart declarations live in `src/types/<chart>.ts` (e.g. `pie.ts` holds `PieData`, `PieVariant`, `PieChartOptions`, `isPieData`).
- `src/types/instance.ts` composes the `ChartData` / `ChartVariant` / `AnyChartOptions` unions and declares `IChartInstance`.
- `src/types/base.ts` holds `ChartType` enum + base `ChartOptions`. `src/types/shared.ts` holds cross-cutting shared option types (`TitleOptions`, `LegendOptions`, `GridOptions`, `AxisOptions`, `SeriesOptions`, `TooltipOptions`, `TooltipContext*`).
- `src/types.ts` is a backwards-compat barrel; do not put new declarations there.

Checklist:

- [ ] Create `src/types/<type>.ts` and declare all chart-specific types there.
- [ ] Add value to `ChartType` enum in `src/types/base.ts` (string literal must match the `type` argument users pass).
- [ ] Define / alias a `XxxData` type in `src/types/<type>.ts` and extend the `ChartData` union in `src/types/instance.ts` (alias when the runtime shape is shared, e.g. `export type ScatterData = XYData`).
- [ ] Add `isXxxData(data: ChartData): data is XxxData` type guard with precise structural checks (colocated in `src/types/<type>.ts`).
- [ ] If the type has sub-styles, add `XxxVariant` and extend `ChartVariant` in `src/types/instance.ts`.
- [ ] Define `XxxChartOptions extends ChartOptions` (or `extends XYChartOptions` for XY-family). Put every chart-specific knob (including the narrowed `variant?: XxxVariant`) on the subtype.
- [ ] Add the new `XxxChartOptions` to the `AnyChartOptions` union in `src/types/instance.ts` so callers can pass a chart-specific literal to `createChart` without an explicit cast.
- [ ] Add the new file to `src/types/index.ts`'s re-export list.
- [ ] Do **NOT** add chart-specific fields to base `ChartOptions`. Base `ChartOptions` is reserved for truly cross-cutting concerns: `theme`, `title`, `padding`, `colors`, `colorMap`, `tooltip`, `echarts`. Note: `grid` lives on `XYChartOptions` only, and `legend` lives on `XYChartOptions`, `PieChartOptions`, and `RadarChartOptions` — gauge/sankey/chord do not render either.

### 2. Adapter module (`src/adapters/<type>.ts`)

- [ ] Implement `resolveXxxOptions(data: XxxData, options: XxxChartOptions)` (return type: `Record<string, unknown>` or `ChartSetupResult`). Always type the parameters as the chart's own `XxxData` and `XxxChartOptions`, never the base `ChartData` / `ChartOptions`.
- [ ] Use shared builders from `common.ts` where applicable. XY-family adapters must pass their `XxxChartOptions` (which extends `XYChartOptions`) into `buildXAxis` / `buildYAxis` / `series-utils` helpers.
- [ ] Handle `options.variant`, `options.title`, `options.legend`, `options.padding`, `options.tooltip`, etc. consistently with sibling adapters.
- [ ] Build the option *without* any color literals or theme lookups — call `resolveColors` / `resolveColorsForNodes` for that.
- [ ] End with: `deepMerge(eOption, options.echarts ?? {})` → assign `merged.color = resolveColors(names, options)` → (graph types only) `paintGraphNodes(merged, '<seriesType>', nameToColor)` → return `merged`.

**Optional `onInit` hook / `notMerge` flag:**

```ts
import type { ChartSetupResult } from './index.js';

export function resolveXxxOptions(data: XxxData, options: ChartOptions): ChartSetupResult {
 return {
 option: { /* ... */ },
 onInit: (instance) => { /* event listeners */ },
 notMerge: false, // optional — set to false when ECharts needs to animate state across successive setOption calls
 };
}
```

Reference implementations:

| Pattern | Reference file |
|---------|----------------|
| XY + variants + stacked | `src/adapters/bar.ts` (`BarChartOptions`) |
| XY + time axis; line **and** area | `src/adapters/line.ts` (`LineChartOptions` / `AreaChartOptions`) |
| Item tooltips + variants | `src/adapters/pie.ts` (`PieChartOptions`) |
| Graph nodes/links | `src/adapters/sankey.ts` (`SankeyChartOptions`), `src/adapters/chord.ts` (`ChordChartOptions`) |
| Single-metric | `src/adapters/gauge.ts` (`GaugeChartOptions`) |
| Body-centered chart with legend reservation | `src/adapters/radar.ts` (`RadarChartOptions`) — uses `getLegendReserve(..., RADAR_EDGE_GAP)` to shift `center` and shrink `radius` based on `legend.position`. See [docs/LEGEND.md §4.2](docs/LEGEND.md). |
| Cross-update transitions (`notMerge: false`) | `src/adapters/bar.ts` and `src/adapters/line.ts` (`race` branches) |
| Variant-specific sub-object (`race.topN` / `race.frameDuration`) | `src/types/bar.ts` (`BarRaceOptions` → `BarChartOptions.race`), `src/types/line.ts` (`LineRaceOptions` → `LineChartOptions.race`) |
| Streaming axis pinning (race) | `src/adapters/line.ts` auto-pins `xAxis.min` to `categories[0]` for time-axis race; users pin `max` themselves via `xAxis.max`. Without this, axis re-layout each frame compresses the line. |
| Auto-measured race frame duration | `src/adapters/race-utils.ts` (`resolveRaceFrameDuration`) — priority: explicit `race.frameDuration` > `ctx.observedFrameMs` (clamped to `[80, 3000]` ms) > 500 ms fallback. Consumed by bar/line race resolvers so callers don't have to mirror their own `setInterval` value. `core.ts` measures the gap between consecutive `update()` calls via `performance.now()` and threads the value through `RenderContext`. |
| Adaptive race label headroom | `src/adapters/race-utils.ts` (`resolveRaceLabelHeadroom`) — bar/line race resolvers measure the widest current-frame label (`String(value)` for bar, `"<name> <value>"` for line) via a cached `canvas.getContext('2d').measureText` (falls back to a char-count estimate when `document` is unavailable) and set `grid.right = max(measured + gap + padding, RACE_LABEL_MIN_PX, ctx.maxRaceGridRight)`. `core.ts` lifts the high-water mark from the resolved option each frame and feeds it back via `RenderContext.maxRaceGridRight` so the reserve grows monotonically — wide-label frames don't release space on subsequent narrow-label frames, which would otherwise jitter the plot area. Skip the calculation entirely when `race.showValueLabel === false`; honor any explicit `options.grid.right`. |

**Chart-type options layout.** Each chart's options live on its own `XxxChartOptions extends ChartOptions` subtype (see step 1). The chart's **own general options** (those that always apply, regardless of variant) belong **flat** on the subtype — no separate named type, no wrapping sub-object. Examples: `BarChartOptions.barWidth` / `colorByCategory`, `PieChartOptions.sliceBorderRadius` / `innerRadius`, `GaugeChartOptions.gaugeWidth`. Prefix the field name when a generic word (`borderRadius`, `gap`, …) would be ambiguous at the top level — that's why pie's slice fields read `sliceBorderRadius` / `sliceGap` rather than bare `borderRadius` / `gap`.

Only **variant-bound or otherwise scoped sub-features** get their own named sub-type and live under a sub-object. Bar's `race?: BarRaceOptions` is the canonical example: those fields are meaningless unless `variant === 'race'`, so grouping them under `race` both communicates intent and lets adapters short-circuit by checking the namespace. Do not invent new sub-objects for fields that apply to every variant.

**Never** add a chart-specific field to base `ChartOptions`.

### 3. Colors (`src/utils.ts` + `src/adapters/graph-colors.ts` for graph types)

The adapter is responsible for both *resolving* (one call to the resolver) and *placing* (assigning to the right ECharts field). `core.ts` does not touch colors.

- [ ] Compute the ordered list of names from your data (`series[].name`, `slice.name`, `node.name`, …).
- [ ] Call `resolveColors(names, options)` (or `resolveColorsForNodes(nodes, options)` for `{ nodes, links }` data) to obtain a `string[]` palette of the same length.
- [ ] **XY / pie / bar / area**: `merged.color = colors` after `deepMerge`.
- [ ] **Graph types** (`{ nodes, links }`): build entries with `mapGraphNodesForECharts(nodes, extra?)` (pure shape mapper, no colors), then after `deepMerge` call `paintGraphNodes(merged, '<seriesType>', new Map(nodes.map((n, i) => [n.name, colors[i]])))`.
- [ ] **Area + spark**: also apply `buildSparkAreaGradient(colors[i])` to each `series[i].areaStyle`.
- [ ] **No-name types** (e.g. gauge): skip the resolver entirely; rely on the registered ECharts theme.

### 3.5 Legend (only when the chart renders a legend)

Skip this section entirely when your chart has no legend (gauge / sankey / chord — none of them expose `legend?` on the subtype). Full design reference: [docs/LEGEND.md](docs/LEGEND.md).

- [ ] Add `legend?: LegendOptions` to your `XxxChartOptions` subtype. Never add it to base `ChartOptions`.
- [ ] In the adapter, compute the show flag with a chart-appropriate default and forward it consistently:
  ```ts
  const showLegend = options.legend?.show ?? names.length > 1;
  const legend = buildLegend(names, { ...options, legend: { ...options.legend, show: showLegend } });
  ```
- [ ] **Grid charts** (chart extends `XYChartOptions`): just call `buildGrid(options)`. The helper already consumes `getLegendReserve` internally. Use `buildGrid(options, { legendShow: false })` when the adapter forcibly hides the legend (see bar's `colorByCategory` mode).
- [ ] **Body-centered charts** (radar, future pie/gauge improvements): call `getLegendReserve(options, showLegend, extraGap?)`, combine with title reserves into edge reserves, derive `center` / `radius` via percent math. See `src/adapters/radar.ts` `buildRadarLayout`.
- [ ] Pass an `extraGap` only when your chart body has decorations that extend past its nominal radius (radar.axisName labels overflow by ~15 px → `RADAR_EDGE_GAP = 24`).
- [ ] Tests assert layout reacts to each `legend.position` value (top/bottom/left/right) and collapses when `show: false`. See `src/adapters/radar.test.ts` for the canonical pattern.

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

- [ ] Export the new `XxxData` and `XxxChartOptions` types (both are part of the public API), along with the `isXxxData` guard and any new variant union.

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
- Redeclare `LEGEND_RESERVE` (or any legend-slot magic number) inside an adapter, or hand-author a `legend: { ... }` literal. Import `LEGEND_RESERVE` / `getLegendReserve` / `buildLegend` from `src/adapters/common.ts` — see [docs/LEGEND.md](docs/LEGEND.md) and the **Legend layout pipeline** section above.
- Add chart-specific fields to base `ChartOptions`. Every chart-specific knob (variants, axes, sizing, slice fields, gauge width, race namespace, …) lives on the owning `XxxChartOptions` subtype; base `ChartOptions` only holds truly cross-cutting fields (`theme`, `title`, `padding`, `colors`, `colorMap`, `tooltip`, `echarts`). `grid` lives only on `XYChartOptions`; `legend` lives only on `XYChartOptions`, `PieChartOptions`, and `RadarChartOptions`. New adapters that resolve `ChartOptions` instead of their own `XxxChartOptions` are violating the convention.
- Wrap a chart's own general options inside a sub-object/named type when they could be flat. `BarChartOptions.barWidth` / `colorByCategory` / `PieChartOptions.sliceBorderRadius` live directly on the subtype — no `bar?: BarOptions` or `slice?: PieSliceOptions` wrappers. Reserve sub-objects (`race?: BarRaceOptions`, …) for **variant-bound or scoped sub-features** only.
- Put new chart-specific type declarations in `src/types.ts` (the backwards-compat barrel). New chart types belong in their own `src/types/<chart>.ts` file.

## Git and PR expectations

- Keep changes focused; one chart type or one concern per PR when possible.
- Match existing code style in the file you edit.
- Ensure `typecheck`, `lint`, and `test` pass before marking work complete.
