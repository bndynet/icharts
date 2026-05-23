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
    common/           # Shared adapter helpers and utilities
      index.ts        # buildTitle, buildLegend, buildGrid, tooltips, …
      series-utils.ts # Per-series opts, markLine/markPoint (XY charts)
      graph-colors.ts # mapGraphNodesForECharts (sankey + chord node colors)
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

1. **Adapters build options only** — `resolve*Options()` returns `Record<string, unknown>` **or** `ChartSetupResult` (`{ option, onInit?, notMerge? }`). Do not call `echarts.init` inside adapters. Set `notMerge: false` when the adapter needs ECharts to animate transitions across successive `chart.update()` calls (e.g. bar `race`); the default `true` performs a full replace. Adapters that need to react to the consumer's update cadence (auto-sizing race animation duration, throttling expensive computations, etc.) accept an optional third `ctx: RenderContext` arg — currently exposes `observedFrameMs` (wall-clock gap between the last two `chart.update()` calls), `maxRaceGridRight` (engine-tracked high-water mark of the largest `grid.right` any prior frame emitted, for monotonic label-headroom calculations), and `containerWidth` / `containerHeight` (px reported by `ecInstance.getWidth()/getHeight()` each render — `undefined` when zero/non-finite — used by the gauge `percentage` variant to derive ring thickness and inner font sizes from the rendered viewport; `core.ts` re-applies on `resize()` so container-aware sizing re-flows). See `src/adapters/common/race-utils.ts` (`resolveRaceFrameDuration`, `resolveRaceLabelHeadroom`) and `src/adapters/gauge.ts` (`autoSizePercentage`) for the canonical usage.
2. **Reuse shared builders** — `src/adapters/common/index.ts` provides `buildTitle`, `buildLegend`, `buildGrid`, `buildXAxis`, `buildYAxis`, `buildTooltip`, etc. XY charts should use `src/adapters/common/series-utils.ts` for per-series options, mark lines/points, and y-axis index handling. Do **not** call `getCommonDefaults()` unless it is wired into the adapter pipeline (currently unused by built-in adapters).
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
9. **Global font-family guard for runtime payloads** — any adapter that performs additional runtime `chart.setOption(payload, ...)` writes (typically inside `onInit` / observers) MUST call `applyConfiguredFontFamilyToOption(payload, getConfig().fontFamily)` before `setOption`. Import from `src/adapters/common/index.ts` (single source of truth: `src/adapters/common/font-family.ts`). This guard is required even when the static option path is already covered by `core.ts`, because runtime payloads bypass `core`'s pre-`setOption` injection.

### File naming

- One file per chart family under `src/adapters/` (e.g. `line.ts` holds both **line** and **area** resolvers; two `registerAdapter` entries in `index.ts`).
- Export a `resolve<Type>Options(data, options)` function from that file.
- Register in `src/adapters/index.ts` only.

### Documentation

- **README.md** — user-facing API, data formats, chart type table, variants.
- **AGENTS.md** — agent workflow (this file). Keep in sync with structural changes.
- **docs/COLORS.md** — internal design guide for the color pipeline (resolver layer, assembly layer, theme tokens, per-chart placement rules). Read before adding a new chart type or touching `src/utils.ts` color helpers.
- **docs/LAYOUT.md** — internal design guide for the title + legend layout pipeline (`buildTitle` / `buildLegend` for appearance, `getTitleReserve` / `getLegendReserve` for per-edge pixel slots, grid vs body-centered consumer patterns). Read when adding a chart that renders a title or legend or extending either API.

### Demo site

- Interactive examples: one page per chart family under `site/views/charts/<Family>Charts.vue` (uses `DemoCard` / `DemoGrid` from `site/components/`).
- Add at least one `DemoCard` for new built-in types (template + `createChart` sample in `<pre v-pre>`).
- Register new chart pages in `site/site.config.ts` under the **Charts** `children` array. Each `icon` must be a [Lucide](https://lucide.dev/icons) name in kebab-case — `@bndynet/vue-site` only renders icons from its bundled Lucide set (`chart-line` → `ChartLine`, etc.). Do **not** invent `chart-<type>` names unless they exist in Lucide (e.g. `chart-line`, `chart-bar`, `chart-pie` work; `chart-radar` does not). For other chart types use real Lucide names (`radar`, `gauge`, `workflow`, `component`, …) or omit `icon` / reuse a generic one like `chart-pie`.
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

## Layout pipeline (read before adding charts with a title or legend)

Same two-layer pattern as colors. **Two appearance builders** (`buildTitle`, `buildLegend`), **two reserve helpers** (`getTitleReserve`, `getLegendReserve`) returning the same `EdgeReserves` currency, two consumer paths — full design rationale and examples in [docs/LAYOUT.md](docs/LAYOUT.md).

```
                ┌──────────────────────────────────────────┐
                │  RESERVE LAYER  (src/adapters/common)    │
                │   getTitleReserve(options)               │
                │   getLegendReserve(options, show,        │
                │                    extraGap?)            │
                │   → EdgeReserves {top,bottom,left,right} │
                └─────────────────┬────────────────────────┘
                                  │
              ┌───────────────────┼────────────────────────┐
              ▼                   ▼                        ▼
         buildGrid           buildRadarLayout         <new chart>
         (XY: grid edges)    (radar: center +         (body-centered
                              radius shrink)           positioning)
```

`buildTitle(options)` and `buildLegend(names, options)` are the orthogonal **appearance** helpers — they emit the ECharts `title` / `legend` blocks. Adapters never hand-author `title: { ... }` or `legend: { ... }` literals.

Both reserve helpers return the same `EdgeReserves` shape so adapters that need both (e.g. radar) compose them in a single edge loop instead of branching by widget type.

| Consumer | Chart types | What it does with `EdgeReserves` |
|---|---|---|
| `buildGrid` (XY grid path) | line, bar, area | Pulls each grid edge back by `padding + reserve`, where reserve = title's top + legend's active edge. Adapters call `buildGrid` (which consumes both helpers internally), not the helpers directly. |
| Body-centered path | radar (today), pie / gauge (title-only today, can extend) | Composes title + legend reserves into a single `EdgeReserves`, then shifts component `center` and shrinks `radius` via percent math against a reference card size. Sees reserves as raw pixels (no `padding` baked in). |

### Rules

1. **Title is universal; legend lives on subtypes that render one.** Every chart inherits `title?` from base `ChartOptions`. `legend?: LegendOptions` lives only on `XYChartOptions` (line/bar/area), `PieChartOptions`, `RadarChartOptions`. **Never** add `legend` to base `ChartOptions` — gauge / sankey / chord deliberately don't expose it.
2. **One source of truth per widget.** `LEGEND_RESERVE` is defined once in `src/adapters/common/legend.ts` and exported. The (module-private) `getTitleHeight` is the single entry point for title geometry; external code goes through `getTitleReserve(options).top`. Do not redeclare these in adapters.
3. **Use the reserve helpers whenever a non-XY chart needs to react to title presence or legend position.** Both return `EdgeReserves` (`{top,bottom,left,right}`) — title puts its widget height on `top`, legend puts its slot on the active edge, zero elsewhere. Compose with the same edge loop.
4. **`extraGap` (legend only) is for body-overflow.** Use it when chart-body decorations extend past the nominal radius (radar.axisName overflows ~15 px → `RADAR_EDGE_GAP = 24`). Don't use it to "make the legend bigger" — adjust spacing inside `echarts.legend` instead. `getTitleReserve` has no equivalent — bump `options.padding` if a title needs more breathing room.
5. **Compute `showLegend` once, forward it twice.** The adapter picks a chart-appropriate default (e.g. radar: `options.legend?.show ?? names.length > 1`) and passes the same value to both `buildLegend` and `getLegendReserve`. Don't let them disagree. Title has no equivalent flag — visibility is unambiguous from `options.title`.
6. **Theme owns the text color (two-sided contract).** Title, legend, and any text the adapter renders on the chart canvas — data labels, node labels, axis names, gauge inner text — draw their color from `colors.textPrimary` (or `colors.textSecondary` for descriptive/secondary text) via `src/themes/echarts-theme.ts`. The contract has two sides; skipping either silently breaks dark-theme rendering for that chart and **won't fail any existing test**:

 1. **Adapter side**: NEVER set `color` on `series.label` / `endLabel` / `edgeLabel` / `axisName` / gauge `title|detail` / `markPoint.label` / etc. Emit only structural fields (`show`, `position`, `valueAnimation`, `formatter`, `fontSize`, …).
 2. **Theme side**: every series type whose adapter emits canvas-rendered text MUST have a `<seriesType>.<field>.color` entry in `src/themes/echarts-theme.ts`, with a regression test in `src/themes/echarts-theme.test.ts` asserting it follows the chosen token alongside the existing surfaces.

 Current themed surfaces:
 - `title.textStyle.color`, `legend.textStyle.color` → `textPrimary`
 - `bar.label.color` → `textPrimary` (covers `showLabel` **and** race value labels)
 - `line.label.color`, `line.endLabel.color` → `textPrimary` (covers `showLabel` **and** line-race tracking labels)
 - `pie.label.color` → `textPrimary`
 - `pie.itemStyle.borderColor` → `itemDivider` (fallback: `surface`) — 1 px stroke between adjacent pie slices; dedicated knob so themes whose card background differs from their tooltip surface (e.g. `dash-scifi`'s glassmorphism) can drive each independently
 - `gauge.title.color` → `textSecondary` (descriptive label, e.g. "CPU"), `gauge.detail.color` → `textPrimary` (the value), `gauge.axisLabel.color` → `textSecondary`
 - `markPoint.label.color` → `textPrimary`
 - `radar.axisName.color` → `textPrimary` (indicator labels)
 - `graph.label.color`, `graph.edgeLabel.color` → `textPrimary` (network node + link labels)
 - `sankey.label.color` → `textPrimary` (sankey node labels)
 - `chord.label.color` → `textPrimary` (chord node labels around the ring)

 ECharts deep-merges these series-type defaults into each series, so adapters can keep emitting `label: { show, position, valueAnimation, formatter }` (no `color` key) and a single `chart.setTheme(...)` call repaints every label across every chart type. If a future feature needs a different label color (e.g. a warning highlight), thread it through the theme — don't hardcode it in the adapter. See `src/themes/echarts-theme.test.ts` for the regression test that locks this contract, and the **3.6 Theme integration for canvas text** checklist below for what to add when shipping a new chart type.

 **Label fontSize follows a DIFFERENT contract from color.** Color is theme-only (adapters MUST NOT emit it). FontSize is *both* theme-fallback AND adapter-emitted, with `ChartOptions.labelFontSize` as the user override. The theme registers `<seriesType>.label.fontSize: DEFAULT_LABEL_FONT_SIZE` (12) as a fallback so any adapter that forgets to emit a size still renders at the canonical 12 px. Adapters that emit a `series.label` / `series.edgeLabel` MUST also emit `fontSize: getLabelFontSize(options)` so the user's `labelFontSize` actually takes effect at the series level — without this, the theme default wins and the global knob is silently ignored.

 - **Resolver layer** — `getLabelFontSize(options)` (exported from `src/adapters/common/index.ts`, re-exporting `DEFAULT_LABEL_FONT_SIZE` from `src/adapters/common/text-measure.ts` so the constant stays in one place). Returns `options.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE` — the single entry point.
 - **Adapter side**: every `series.label` / `series.edgeLabel` / `series.endLabel` / `series.leaves.label` MUST include `fontSize: getLabelFontSize(options)`. Tree additionally feeds the same value through `buildLabelFont(labelFontSize)` into `measureMaxTextWidth(...)` so its measure-vs-render contract (canvas measureText vs rendered glyph extent) stays accurate when the user scales labels.
 - **Theme side**: every series type listed above whose label is affected by `labelFontSize` MUST also ship a `<seriesType>.label.fontSize: DEFAULT_LABEL_FONT_SIZE` entry in `src/themes/echarts-theme.ts`, with a regression test in `src/themes/echarts-theme.test.ts`.
 - **Scope**: `labelFontSize` deliberately applies to data labels + network edge labels only. Gauge `title`/`detail` are container-auto-sized (the `percentage` variant derives them from `ref = min(containerWidth, containerHeight)`), `radar.axisName` is an indicator label (not a data label), and `markPoint.label` is not currently themed for fontSize — these three intentionally ignore the global knob.

7. **Reserves are padding-free.** Neither helper adds chart `padding`; callers add it where their coordinate system needs it (the XY grid path adds `padding + reserve`; the percent-center path lets `padding` cancel symmetrically). See [docs/LAYOUT.md §4.3](docs/LAYOUT.md).

### Public surface for `registerAdapter()` users

Custom chart types written outside this repo can import the same helpers:

```ts
import {
 buildTitle,
 buildLegend,
 getTitleReserve,
 getLegendReserve,
 getLabelFontSize,
 DEFAULT_LABEL_FONT_SIZE,
 LEGEND_RESERVE,
 computeStackedTextOffsets,
 type EdgeReserves,
 type LegendOptions,
 type StackedTextOffsetsOptions,
 type StackedTextOffsets,
} from '@bndynet/icharts';
```

See [docs/LAYOUT.md §6](docs/LAYOUT.md) for a full custom-adapter example.

### Centered two-line text block (gauge ring / donut hole / KPI tile)

`computeStackedTextOffsets({ primaryFontSize, secondaryFontSize, ... })`
returns the pixel Y offsets that center a `(big number + caption)` block
on a single anchor point and keep the *visible* glyph gap constant
across font sizes — it subtracts the typographic padding that `canvas`
`textBaseline: 'middle'` would otherwise add on top of the em-box gap.
Currently used by `src/adapters/gauge.ts` (`percentage` variant) for
the ring center text; reuse the same helper when the pie / future
donut-hole adapter needs a center label and any custom adapter that
renders a stacked `value + caption` block. Defaults: `visibleGapPx: 12`,
`glyphPaddingEm: 0.15`, `showSecondary: true`. The helper rounds to
one decimal using round-half-away-from-zero so mirror-symmetric inputs
stay symmetric.

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
- [ ] Do **NOT** add chart-specific fields to base `ChartOptions`. Base `ChartOptions` is reserved for truly cross-cutting concerns: `theme`, `title`, `padding`, `colors`, `colorMap`, `labelFontSize`, `tooltip`, `echarts`. Note: `grid` lives on `XYChartOptions` only, and `legend` lives on `XYChartOptions`, `PieChartOptions`, and `RadarChartOptions` — gauge/sankey/chord do not render either.

### 2. Adapter module (`src/adapters/<type>.ts`)

- [ ] Implement `resolveXxxOptions(data: XxxData, options: XxxChartOptions)` (return type: `Record<string, unknown>` or `ChartSetupResult`). Always type the parameters as the chart's own `XxxData` and `XxxChartOptions`, never the base `ChartData` / `ChartOptions`.
- [ ] Use shared builders from `common/index.ts` where applicable. XY-family adapters must pass their `XxxChartOptions` (which extends `XYChartOptions`) into `buildXAxis` / `buildYAxis` / `series-utils` helpers.
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
| Body-centered chart composing title + legend reserves | `src/adapters/radar.ts` (`RadarChartOptions`) — uses `getTitleReserve(options)` + `getLegendReserve(..., RADAR_EDGE_GAP)` to shift `center` and shrink `radius` based on which edges are occupied. See [docs/LAYOUT.md §4.2](docs/LAYOUT.md). |
| Body-centered chart consuming title-only reserve | `src/adapters/pie.ts`, `src/adapters/gauge.ts` — read `getTitleReserve(options).top` to shift the chart body below the title widget. |
| Centered two-line text block (constant visible gap) | `src/adapters/gauge.ts` (`percentage` variant) — uses `computeStackedTextOffsets({ primaryFontSize, secondaryFontSize, showSecondary })` to stack a (big value + caption) pair around the ring center with typographic-padding compensation. Reuse for the future donut-hole label and any custom KPI adapter. |
| Cross-update transitions (`notMerge: false`) | `src/adapters/bar.ts` and `src/adapters/line.ts` (`race` branches) |
| Variant-specific sub-object (`race.topN` / `race.frameDuration`) | `src/types/bar.ts` (`BarRaceOptions` → `BarChartOptions.race`), `src/types/line.ts` (`LineRaceOptions` → `LineChartOptions.race`) |
| Streaming axis pinning (race) | `src/adapters/line.ts` auto-pins `xAxis.min` to `categories[0]` for time-axis race; users pin `max` themselves via `xAxis.max`. Without this, axis re-layout each frame compresses the line. |
| Auto-measured race frame duration | `src/adapters/common/race-utils.ts` (`resolveRaceFrameDuration`) — priority: explicit `race.frameDuration` > `ctx.observedFrameMs` (clamped to `[80, 3000]` ms) > 500 ms fallback. Consumed by bar/line race resolvers so callers don't have to mirror their own `setInterval` value. `core.ts` measures the gap between consecutive `update()` calls via `performance.now()` and threads the value through `RenderContext`. |
| Adaptive race label headroom | `src/adapters/common/race-utils.ts` (`resolveRaceLabelHeadroom`) — bar/line race resolvers measure the widest current-frame label (`String(value)` for bar, `"<name> <value>"` for line) via a cached `canvas.getContext('2d').measureText` (falls back to a char-count estimate when `document` is unavailable) and set `grid.right = max(measured + gap + padding, RACE_LABEL_MIN_PX, ctx.maxRaceGridRight)`. `core.ts` lifts the high-water mark from the resolved option each frame and feeds it back via `RenderContext.maxRaceGridRight` so the reserve grows monotonically — wide-label frames don't release space on subsequent narrow-label frames, which would otherwise jitter the plot area. Skip the calculation entirely when `race.showValueLabel === false`; honor any explicit `options.grid.right`. |
| Container-aware pixel sizing | `src/adapters/gauge.ts` (`autoSizePercentage`) — gauge `percentage` variant. ECharts gauge `axisLine.lineStyle.width`, `progress.width`, and `detail.fontSize` are pixel-only (no native `%`), so the adapter derives them from `ref = min(ctx.containerWidth, ctx.containerHeight)` with clamped ratios (ring ≈ 7.5 % of `ref`, detail ≈ 13.5 %, title ≈ 40 % of detail). When the engine can't supply usable dims (SSR, hidden card, jsdom without layout) the helper returns static fallbacks matching the pre-auto-sizing defaults so snapshots stay stable. Explicit `options.gaugeWidth` always wins. `core.ts` samples the dims via `ecInstance.getWidth()/getHeight()` each `_apply()` and re-applies from `resize()` so the gauge re-flows when the container changes size. **Network's no-value fallback marker** uses the same pattern (`src/adapters/network.ts` `resolveDefaultNodeSize` — `ref / sqrt(nodeCount) * 0.10` clamped to `[8, 40]` px), so sparse graphs in big cards aren't 10-px dots and dense graphs shrink automatically. **Network's force-layout `edgeLength`** uses the same √n heuristic (`resolveAutoEdgeLength` — `ref / sqrt(nodeCount) * 0.6` clamped to `[30, 250]` px) but reads `ref` from the **body box** (`container − title − legend − padding`, computed from the same insets that drive `series.top/bottom/left/right`) instead of the raw container, so the cluster automatically fills the area outside title + legend without bleeding into them. Calibrated so a 16-node × ~400-px-body demo (the canonical forceData with title + 5-cat top legend) lands on the legacy 60-px default (existing demos look identical) while sparse graphs and chrome-less cards expand to use the body. Same SSR / explicit-override / `core.resize()` semantics as gauge. |
| Themed data labels (race + non-race) | `src/themes/echarts-theme.ts` registers `bar.label.color`, `line.label.color`, `line.endLabel.color` (all → `colors.textPrimary`). Bar/line adapters emit `label` / `endLabel` objects with `show` / `position` / `valueAnimation` / `formatter` only — never `color`. ECharts deep-merges the theme's series-type defaults so race value labels and `showLabel` data labels automatically follow the active theme; no per-adapter palette lookup. See Layout rule #6 for the full theme-owned-text-color contract and `src/themes/echarts-theme.test.ts` for the regression. |

**Chart-type options layout.** Each chart's options live on its own `XxxChartOptions extends ChartOptions` subtype (see step 1). The chart's **own general options** (those that always apply, regardless of variant) belong **flat** on the subtype — no separate named type, no wrapping sub-object. Examples: `BarChartOptions.barWidth` / `colorByCategory`, `PieChartOptions.sliceBorderRadius` / `innerRadius`, `GaugeChartOptions.gaugeWidth`. Prefix the field name when a generic word (`borderRadius`, `gap`, …) would be ambiguous at the top level — that's why pie's slice fields read `sliceBorderRadius` / `sliceGap` rather than bare `borderRadius` / `gap`.

Only **variant-bound or otherwise scoped sub-features** get their own named sub-type and live under a sub-object. Bar's `race?: BarRaceOptions` is the canonical example: those fields are meaningless unless `variant === 'race'`, so grouping them under `race` both communicates intent and lets adapters short-circuit by checking the namespace. Do not invent new sub-objects for fields that apply to every variant.

**Never** add a chart-specific field to base `ChartOptions`.

### 3. Colors (`src/utils.ts` + `src/adapters/common/graph-colors.ts` for graph types)

The adapter is responsible for both *resolving* (one call to the resolver) and *placing* (assigning to the right ECharts field). `core.ts` does not touch colors.

- [ ] Compute the ordered list of names from your data (`series[].name`, `slice.name`, `node.name`, …).
- [ ] Call `resolveColors(names, options)` (or `resolveColorsForNodes(nodes, options)` for `{ nodes, links }` data) to obtain a `string[]` palette of the same length.
- [ ] **XY / pie / bar / area**: `merged.color = colors` after `deepMerge`.
- [ ] **Graph types** (`{ nodes, links }`): build entries with `mapGraphNodesForECharts(nodes, extra?)` (pure shape mapper, no colors), then after `deepMerge` call `paintGraphNodes(merged, '<seriesType>', new Map(nodes.map((n, i) => [n.name, colors[i]])))`.
- [ ] **Area + spark**: also apply `buildSparkAreaGradient(colors[i])` to each `series[i].areaStyle`.
- [ ] **No-name types** (e.g. gauge): skip the resolver entirely; rely on the registered ECharts theme.

### 3.5 Title + Legend layout

Title is universal — every chart inherits `title?` from base `ChartOptions`, and adapters always wire `title: buildTitle(options)`. Legend is per-subtype: skip the legend-specific bullets when your chart doesn't expose `legend?` (gauge / sankey / chord). Full design reference: [docs/LAYOUT.md](docs/LAYOUT.md).

**Title (always applicable):**
- [ ] Wire `title: buildTitle(options)` into your option object. No flags to thread.
- [ ] **Body-centered charts**: read `getTitleReserve(options).top` to shift `center` (or grid `top`) below the title. See `src/adapters/pie.ts` / `gauge.ts` / `radar.ts` for variations.
- [ ] **Grid charts**: nothing to do — `buildGrid(options)` already consumes `getTitleReserve` internally.
- [ ] Never reach for the (module-private) `getTitleHeight`. `getTitleReserve(options).top` is the canonical entry point.

**Legend (only when the chart renders one):**
- [ ] Add `legend?: LegendOptions` to your `XxxChartOptions` subtype. Never add it to base `ChartOptions`.
- [ ] In the adapter, compute the show flag with a chart-appropriate default and forward it consistently:
  ```ts
  const showLegend = options.legend?.show ?? names.length > 1;
  const legend = buildLegend(names, { ...options, legend: { ...options.legend, show: showLegend } });
  ```
- [ ] **Grid charts** (chart extends `XYChartOptions`): just call `buildGrid(options)`. The helper already consumes `getLegendReserve` internally. Use `buildGrid(options, { legendShow: false })` when the adapter forcibly hides the legend (see bar's `colorByCategory` mode).
- [ ] **Body-centered charts** (radar, future pie/gauge improvements): call `getLegendReserve(options, showLegend, extraGap?)`, compose with `getTitleReserve(options)` into a single `EdgeReserves`, derive `center` / `radius` via percent math. See `src/adapters/radar.ts` `getEdgeReserves` + `buildRadarLayout`.
- [ ] Pass an `extraGap` only when your chart body has decorations that extend past its nominal radius (radar.axisName labels overflow by ~15 px → `RADAR_EDGE_GAP = 24`).
- [ ] Tests assert layout reacts to each `legend.position` value (top/bottom/left/right), to title presence/absence, and that hiding either widget collapses the corresponding reserve. See `src/adapters/radar.test.ts` for the canonical pattern; `src/adapters/common.test.ts` covers the helpers in isolation.
- [ ] **When extending `LegendOptions` with a new appearance knob** (e.g. `formatLabel`, future `iconSize`, `prefix`, …) wire the new value into BOTH `buildLegend` (so it reaches ECharts) AND the side-edge width measurement in `getLegendReserve` (so vertical-legend reserves stay accurate when the formatted text is wider than the raw name). Keep the user-callable surface defensive: wrap user-supplied functions in try/catch and fall back to the raw name on throw / non-string return so a single bad lookup can't blank out the entire legend. `legend.formatLabel` is the reference implementation — see `src/adapters/common/rich-text.ts` (`safeFormatLegendLabel` / `stripRichTextMarkup`) and the dedicated `getLegendReserve + formatLabel integration` describe block in `src/adapters/common.test.ts`.

### 3.6 Theme integration for canvas text

Any text your adapter renders on the chart canvas (data labels, node labels, axis names, gauge inner text, …) must be themed, not adapter-styled. This is a two-sided contract — see **Layout rule #6** above for design rationale.

- [ ] Identify every `label` / `endLabel` / `edgeLabel` / `axisName` / gauge `detail` / etc. field your adapter emits. If you set `color` on any of them, **stop** — move that color into the theme instead.
- [ ] In `src/themes/echarts-theme.ts`, add a `<seriesType>.<field>.color` entry for every such field:
 - `colors.textPrimary` — primary canvas-rendered text (data labels, node labels, gauge values).
 - `colors.textSecondary` — descriptive/secondary text (e.g. gauge `title` reads "CPU" while `detail` reads "73 %").
 - `colors.surface` / `colors.axisLine` / `colors.gridLine` — structural strokes/fills (borders, splitLines, axisLines).
- [ ] In `src/themes/echarts-theme.test.ts`, add a regression test asserting your new surface follows the chosen token AND extend the existing "changing textPrimary changes every label color in lockstep" test to cover your new surface.
- [ ] Update the enumeration in **Layout rule #6** above so the doc and the theme stay in sync.
- [ ] **Label fontSize** (different contract — adapter-emitted, theme-fallback). If the field is a data label or edge label that should follow `ChartOptions.labelFontSize`:
 - Emit `fontSize: getLabelFontSize(options)` on the adapter side (alongside `show` / `position` / etc.). Import from `./common/index.js`.
 - Add `fontSize: DEFAULT_LABEL_FONT_SIZE` next to the `color` entry in `echarts-theme.ts` as the fallback.
 - Add a regression test in `echarts-theme.test.ts` asserting the new surface falls back to `DEFAULT_LABEL_FONT_SIZE`, plus an adapter-test assertion that `resolveXxxOptions(data, { labelFontSize: 18 })` produces `series.label.fontSize === 18`.
 - **Exemptions**: gauge inner text (container-auto-sized), `radar.axisName` (indicator name, not data), `markPoint.label`. If your new chart fits one of those categories, skip the fontSize bullets above.

**Why this matters.** ECharts ships built-in defaults for every `<seriesType>.label` that ignore our `ChartThemeColors` tokens. Any series type without a theme override silently falls back to ECharts' default — typically a near-black color that becomes unreadable on dark themes. The contract is two-sided: adapter must NOT set `color` (so a theme switch can repaint), AND theme must populate the surface (so there's something to repaint to). Skipping either side breaks dark-theme rendering for that chart and won't fail any existing adapter test, because adapter snapshots only assert the structural fields the adapter emits — they don't notice that `color` is missing.

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

### 7. Demo (`site/views/charts/` + `site/site.config.ts`)

- [ ] Add `DemoCard`(s) in the appropriate `site/views/charts/<Family>Charts.vue` (create the file if needed) with `createChart(el, '<type>', sampleData, options)` and a `<pre v-pre>` code sample.
- [ ] Add a **Charts** child in `site/site.config.ts` (`page` import + valid Lucide `icon`; see **Demo site** above).

### 8. Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build   # when exports or build pipeline may be affected
```

Add unit tests under `src/**/*.test.ts` for new `isXxxData` guards and color/validation logic.

**Font-family guard checklist (required when touching chart text or runtime setOption paths):**

- [ ] If the adapter has any runtime `chart.setOption(payload, ...)` path (e.g. `onInit`, `ResizeObserver`, event callbacks), call `applyConfiguredFontFamilyToOption(payload, getConfig().fontFamily)` before `setOption`.
- [ ] Add/extend tests that assert `configure({ fontFamily: '...' })` reaches BOTH:
  - static resolved option (`resolveXxxOptions(...).option`), and
  - runtime payload (`onInit`/observer `setOption` payload), including `rich` token styles when present.
- [ ] Verify no text path silently falls back to ECharts defaults due to empty/undefined `fontFamily`.

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
- Ship a new chart type (or modify an existing adapter to emit a new `label` / `endLabel` / `edgeLabel` / `axisName` / similar canvas-text field) without also wiring the matching `<seriesType>.<field>.color` into `src/themes/echarts-theme.ts` and adding a regression test in `src/themes/echarts-theme.test.ts`. See **Layout rule #6** for the two-sided contract — leaving the theme side unwired means dark-theme renders the new text as ECharts' built-in near-black default, which is unreadable, and no existing test will catch it.
- Re-introduce a central `applyChartColors` / `core.ts` color post-processing step — adapters now own color assembly end-to-end.
- Use `options.echarts` as a workaround for behavior gaps in typed chart options. Fix adapter/type pipelines first (e.g. wire `xAxis` / `yAxis` / variant options through the chart's own resolver) so user-facing options work without falling back to raw ECharts overrides.
- Redeclare `LEGEND_RESERVE` (or any layout magic number) inside an adapter, or hand-author `title: { ... }` / `legend: { ... }` literals. Import `LEGEND_RESERVE` / `getTitleReserve` / `getLegendReserve` / `buildTitle` / `buildLegend` from `src/adapters/common/index.ts` — see [docs/LAYOUT.md](docs/LAYOUT.md) and the **Layout pipeline** section above.
- Reach for `getTitleHeight`. It is module-private inside `src/adapters/common/title.ts` and intentionally not exported. Use `getTitleReserve(options).top` for title geometry — that's the only canonical entry point and keeps title and legend reserves on the same `EdgeReserves` shape.
- Add chart-specific fields to base `ChartOptions`. Every chart-specific knob (variants, axes, sizing, slice fields, gauge width, race namespace, …) lives on the owning `XxxChartOptions` subtype; base `ChartOptions` only holds truly cross-cutting fields (`theme`, `title`, `padding`, `colors`, `colorMap`, `labelFontSize`, `tooltip`, `echarts`). `grid` lives only on `XYChartOptions`; `legend` lives only on `XYChartOptions`, `PieChartOptions`, and `RadarChartOptions`. New adapters that resolve `ChartOptions` instead of their own `XxxChartOptions` are violating the convention.
- Wrap a chart's own general options inside a sub-object/named type when they could be flat. `BarChartOptions.barWidth` / `colorByCategory` / `PieChartOptions.sliceBorderRadius` live directly on the subtype — no `bar?: BarOptions` or `slice?: PieSliceOptions` wrappers. Reserve sub-objects (`race?: BarRaceOptions`, …) for **variant-bound or scoped sub-features** only.
- Put new chart-specific type declarations in `src/types.ts` (the backwards-compat barrel). New chart types belong in their own `src/types/<chart>.ts` file.

## Git and PR expectations

- Keep changes focused; one chart type or one concern per PR when possible.
- Match existing code style in the file you edit.
- Ensure `typecheck`, `lint`, and `test` pass before marking work complete.
