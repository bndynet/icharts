# @bndynet/icharts

A lightweight charting library with a Web Component (`<i-chart>`) and a simple `createChart()` API.

## Installation

```bash
npm install @bndynet/icharts
```

---

## Quick Start

### Option 1 — Web Component (HTML)

```html
<script type="module">
  import '@bndynet/icharts';
</script>

<i-chart id="myChart" type="line" style="width: 600px; height: 400px;"></i-chart>

<script type="module">
  const chart = document.getElementById('myChart');
  chart.data = {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    series: [
      { name: 'Revenue', data: [120, 200, 150, 80, 270] },
      { name: 'Cost',    data: [90,  170, 130, 60, 210] },
    ],
  };
  chart.options = { title: 'Monthly Overview' };
</script>
```

### Option 2 — JavaScript / TypeScript

```ts
import { createChart } from '@bndynet/icharts';

const chart = createChart(
  document.getElementById('app'),
  'bar',
  {
    categories: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [{ name: 'Sales', data: [300, 450, 280, 600] }],
  },
  { title: 'Quarterly Sales' }
);

// Update / resize later:
chart.update(newData, newOptions);
chart.resize();

// Disposal is automatic — the chart releases itself the moment its
// container leaves the DOM (e.g. when a Vue/React component unmounts).
// Calling `chart.dispose()` explicitly is still supported and idempotent
// for cases where you want to free resources eagerly.
chart.dispose();
```

### Option 3 — CDN (no bundler)

```html
<script src="./node_modules/@bndynet/icharts/dist/index.global.js"></script>

<div id="chart" style="width: 600px; height: 400px;"></div>
<script>
  iCharts.createChart(document.getElementById('chart'), 'pie', [
    { name: 'Chrome',  value: 65 },
    { name: 'Firefox', value: 15 },
    { name: 'Safari',  value: 12 },
    { name: 'Edge',    value: 8  },
  ]);
</script>
```

---

## Chart Types

| Type   | `type` value | Variants |
|--------|-------------|----------|
| Line   | `line`   | `default`, `spark`, `race` |
| Bar    | `bar`    | `default`, `horizontal`, `spark`, `race` |
| Area   | `area`   | `default`, `spark` |
| Pie    | `pie`    | `default`, `doughnut`, `half-doughnut`, `nightingale` |
| Gauge  | `gauge`  | `default`, `percentage` |
| Sankey | `sankey` | `default`, `vertical` |
| Chord  | `chord`  | `default` |
| Radar  | `radar`  | `default`, `circle` |
| Network | `network` | `default`, `circular` |
| Tree   | `tree`   | `default` (use `direction` for layout orientation) |

---

## Data Formats

### Line / Bar / Area — `XYData` (aliased as `LineData` / `BarData` / `AreaData`)

```ts
{
  categories: ['Jan', 'Feb', 'Mar'],   // x-axis labels or time values
  series: [
    { name: 'Revenue', data: [120, 200, 150] },
    { name: 'Cost',    data: [90,  170, 130] },
  ],
}
```

Line, bar, and area share the same runtime shape. The library exports `LineData`, `BarData`, and `AreaData` aliases for `XYData` so call sites and adapters can declare intent explicitly.

### Pie — `PieData`

```ts
[
  { name: 'Chrome',  value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari',  value: 12 },
]
```

### Gauge — `GaugeData`

```ts
{ value: 72, max: 100, label: 'Score' }
```

`chart.update()` on a gauge chart merges into the previous frame: omit
`max` / `label` to keep them, include the key to override (`label: ''`
clears the caption; `max: undefined` drops a custom max so the default
`100` applies).

### Sankey — `SankeyData`

```ts
{
  nodes: [
    { name: 'Coal' },
    { name: 'Solar' },
    { name: 'Electricity' },
    { name: 'Heat' },
  ],
  links: [
    { source: 'Coal',  target: 'Electricity', value: 120 },
    { source: 'Solar', target: 'Electricity', value: 80 },
    { source: 'Coal',  target: 'Heat',        value: 60 },
  ],
}
```

Each node accepts an optional `color` field to pin it to a specific color. The `colorMap` option can also be used to assign colors by node name.

### Chord — `ChordData`

```ts
{
  nodes: [
    { name: 'Engineering' },
    { name: 'Design' },
    { name: 'Marketing' },
  ],
  links: [
    { source: 'Engineering', target: 'Design',    value: 30 },
    { source: 'Engineering', target: 'Marketing', value: 20 },
    { source: 'Design',      target: 'Marketing', value: 15 },
  ],
}
```

Each node accepts optional `color` and `value` fields. When `value` is omitted, the arc size is derived from the sum of connected link values.

### Radar — `RadarData`

```ts
{
  indicators: [
    { name: 'Sales',          max: 6500 },
    { name: 'Administration', max: 16000 },
    { name: 'IT',             max: 30000 },
    { name: 'Support',        max: 38000 },
    { name: 'Development',    max: 52000 },
    { name: 'Marketing',      max: 25000 },
  ],
  series: [
    { name: 'Allocated Budget', values: [4200, 3000, 20000, 35000, 50000, 18000] },
    { name: 'Actual Spending',  values: [5000, 14000, 28000, 26000, 42000, 21000] },
  ],
}
```

`series[i].values[j]` is plotted on `indicators[j]`, so both arrays must line up by index. `max` / `min` are optional — omit them to let ECharts auto-scale each axis to the data range.

### Network — `NetworkData`

```ts
{
  nodes: [
    { name: 'Alice',   category: 'Frontend', value: 8 },
    { name: 'Bob',     category: 'Frontend', value: 5 },
    { name: 'Carol',   category: 'Backend',  value: 12 },
    { name: 'Dan',     category: 'Backend',  value: 6 },
  ],
  links: [
    { source: 'Alice', target: 'Carol', value: 4 },
    { source: 'Bob',   target: 'Carol', value: 2 },
    { source: 'Carol', target: 'Dan',   value: 6 },
  ],
  // Optional — explicit category ordering for the legend; otherwise
  // derived from unique `node.category` values in input order.
  categories: ['Frontend', 'Backend'],
}
```

Categories drive the legend and the default per-node color (every node in the same category shares a palette slot). Each node accepts optional `color`, `size`, `x` / `y`, and `fixed` overrides. When `value` is set and `size` is omitted, the adapter scales the marker size from the data range into `nodeSizeRange` (default `[10, 30]`). When neither is set, the adapter auto-sizes nodes from the rendered container: `min(width, height) / sqrt(nodeCount) * 0.10` clamped to `[8, 40]` px — sparse graphs in big cards get noticeable markers and dense graphs shrink automatically. Pin `options.nodeSize` to opt out.

The same √n heuristic also drives the **force-layout edge length**, with one twist: it's standardised against the **body** (the area outside title, legend, and padding) instead of the raw container. When `options.edgeLength` is omitted (and `variant` is `default`), the adapter computes `min(bodyWidth, bodyHeight) / sqrt(nodeCount) * 0.6` clamped to `[30, 250]` px, where `bodyWidth/Height = container − title − legend − padding` — exactly the same insets that drive `series.top/bottom/left/right`. The cluster therefore fills the area outside title and legend automatically: add a title and the springs shrink, move the legend to the side and the horizontal body shrinks, etc. Without this auto-sizing a 5-node graph in a 1100×460 card huddles in the middle (gravity pulls everything to center until the 60-px springs balance), wasting 80 % of the canvas. The 0.6 multiplier is calibrated so the canonical 16-node demo (body ≈ 394 px after subtracting title + 5-cat top legend + padding) lands exactly on the legacy 60-px default, keeping existing demos pixel-identical while sparse graphs and chrome-less cards fan out to use the available space. SSR / hidden containers fall back to 60 px. Pin `options.edgeLength` to opt out.

Each link accepts an optional `curveness?: number` (same scale as `options.edgeCurveness`: `0` straight, `0.3` ≈ gently curved). Per-link curveness wins over the chart-wide value, so you can flatten or bend individual edges without retuning the whole graph. **Bidirectional edges**: give `A → B` a positive curveness and `B → A` an equal *negative* one — the two arcs separate cleanly instead of overlapping into a single line:

```ts
links: [
  { source: 'A', target: 'B', curveness:  0.2 },
  { source: 'B', target: 'A', curveness: -0.2 },
]
```

In the `default` (force) layout, `x` / `y` are used as initial positions and `fixed: true` locks a node in place while the simulation settles around it — useful for "anchor a few nodes, let the rest auto-layout". Need fully manual positions (no algorithm at all)? Use the `echarts` escape hatch: `options.echarts = { series: [{ layout: 'none' }] }` and provide `x` / `y` on every node.

**Label density** — three orthogonal switches handle node-label clutter, each tackling a different failure mode:

| Option | Default | What it does |
|---|---|---|
| `showNodeLabel` | `true` | Master toggle. Set `false` to render no node labels at all. |
| `showAllLabels` | `false` | When `false`, the adapter applies the two label-pruning strategies below; when `true`, every node label renders unconditionally (escape hatch for small graphs, screenshots, presentations). |
| `labelMinNodeSize` | `14` | Hides the label on any node whose resolved marker size is below this threshold (px). Compared against the **resolved** per-node size, regardless of whether it came from an explicit `node.size`, value-scaling into `nodeSizeRange`, or the container-aware no-value fallback. Set `0` to disable the threshold. |

When `showAllLabels: false` (the default), the adapter combines two strategies:

1. **Overlap culling** — sets `labelLayout: { hideOverlap: true }` so ECharts walks every label's bounding box and hides the colliding ones, leaving the most-spread-out subset visible. This is what keeps dense **force** layouts readable.
2. **Size threshold** — hides labels on any node smaller than `labelMinNodeSize`. This is what `hideOverlap` *can't* do for **circular** layouts: with `rotateLabel: true` the labels radiate outward from the ring and rarely physically overlap, so `hideOverlap` does nothing and every name shows by default — including the ones that hover over a 10-px dot and look like noise. The size threshold trims those out.

Setting `showAllLabels: true` bypasses **both** strategies in one shot — equivalent to "I want every label, accept the overlap and the noise".

Independently, the `circular` variant reserves body-edge space for label overflow (akin to radar's `axisName` overflow). With `rotateLabel: true` ECharts renders each label tangent to the ring and the text extends *outward* radially past the ring radius — the worst-case overflow per edge equals the widest label's pixel width. The adapter measures the actual data via canvas `measureText` and reserves `max(node.name.length) + 8 px` on every side (capped at 200 px so a single freakishly long node name can't shrink the ring to a dot). This composes on top of the title + legend reserves, so circular labels never bleed into the title bar or legend slot regardless of which corner each node ends up at.

### Tree — `TreeData`

A single hierarchical root node — the simplest possible structure. Internal nodes carry `children`; leaves omit it. `value` is optional metadata surfaced in tooltips (the tree adapter does not size nodes by value).

```ts
{
  name: 'flare',
  children: [
    {
      name: 'analytics',
      children: [
        { name: 'cluster',  children: [{ name: 'AgglomerativeCluster' }] },
        { name: 'graph',    children: [{ name: 'BetweennessCentrality' }] },
      ],
    },
    {
      name: 'data',
      children: [{ name: 'DataField', value: 1759 }],
    },
  ],
}
```

Each node accepts an optional `color` to pin it (and its marker) to a specific hue, and an optional `collapsed: true` to render that sub-tree closed (the user can click to expand). The `colorMap` option works by node name, exactly like every other chart type.

**Direction.** The chart grows in one of four orientations, controlled by `options.direction`:

| Direction       | ECharts `orient` | Root edge | Leaf edge |
|----------------|------------------|-----------|-----------|
| `'left-to-right'` (default) | `LR` | left   | right  |
| `'right-to-left'`           | `RL` | right  | left   |
| `'top-to-bottom'`           | `TB` | top    | bottom |
| `'bottom-to-top'`           | `BT` | bottom | top    |

The adapter automatically flips the node label `position` so labels always point *outward* (parents toward the root edge, leaves toward the opposite edge) and reserves a label-width strip on **both** the root and leaf edges of the active axis so neither end clips. For vertical layouts (`top-to-bottom`, `bottom-to-top`) labels are additionally rotated 90° so the reading direction tracks the tree's growth: `top-to-bottom` uses `rotate: -90` (text reads top-to-bottom alongside a downward-growing tree, matching ECharts' [`tree-vertical`](https://echarts.apache.org/examples/en/editor.html?c=tree-vertical) example); `bottom-to-top` uses `rotate: +90` (text reads bottom-to-top alongside an upward-growing tree). This keeps long node names from competing for horizontal space with their siblings while keeping every label legible in the direction of the tree. Override the rotation via `echarts: { series: [{ label: { rotate: 0 } }] }` if your dataset uses very short names.

**Other knobs** (all optional): `nodeSize` (px, default 7), `enablePan` (drag-to-pan, default `true`), `enableZoom` (mouse-wheel zoom, default `false`), `expandAndCollapse` (click an internal node to collapse / expand its subtree, default `true`), `initialTreeDepth` (start with this many levels visible, default `-1` = fully expanded — useful for large trees: pass `2` to render only the root + one level), `showNodeLabel` (default `true`), `lineStyle` (`'curve' | 'polyline'`, default `'polyline'`, maps to ECharts `series.edgeShape` for smooth vs elbow connectors).

```ts
createChart(el, 'tree', orgData, {
  title: 'Org Chart',
  direction: 'top-to-bottom',
  initialTreeDepth: 2,
});
```

---

## Common Examples

### Bar with Distinct Colors per Category

Single-series bar chart where each bar gets its own palette color (resolved from the category name via `colorMap` → theme palette → `consistentColors`, exactly like every other "name → color" lookup in the library). The legend is auto-hidden because the series marker would conflict with the per-bar colors drawn on the plot.

```ts
createChart(el, 'bar', {
  categories: ['Chrome', 'Firefox', 'Safari', 'Edge'],
  series: [{ name: 'Share', data: [65, 15, 12, 8] }],
}, {
  colorByCategory: true,
  colorMap: {
    Chrome:  '#4285F4',
    Firefox: '#FF7139',
    Safari:  '#1B88CA',
    Edge:    '#0078D7',
  },
});
```

Silently falls back to a single series color when `stacked: true` or when the chart has more than one series — per-category colors only make visual sense for single-series bars.

### Stacked Bar

```ts
createChart(el, 'bar', {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  series: [
    { name: 'Email',  data: [120, 132, 101, 134, 90] },
    { name: 'Video',  data: [220, 182, 191, 234, 290] },
    { name: 'Search', data: [150, 232, 201, 154, 190] },
  ],
}, { stacked: true, title: 'Weekly Traffic' });
```

### Doughnut Chart

```ts
const total = pieData.reduce((sum, item) => sum + item.value, 0);

createChart(el, 'pie', pieData, {
  variant: 'doughnut',
  centerLabels: [`${total}%`, 'CPU'],
  centerLabelOffset: [0, 0], // optional fine-tune in px: [x, y]
});
```

### Gauge (Percentage)

```ts
createChart(el, 'gauge', { value: 85, label: 'CPU' }, { variant: 'percentage' });
```

### Spark Line (mini, no axes)

```ts
createChart(el, 'line', {
  categories: [1, 2, 3, 4, 5],
  series: [{ name: 'Trend', data: [5, 8, 3, 9, 6] }],
}, { variant: 'spark' });
```

### Mixed Line + Bar

```ts
createChart(el, 'line', data, {
  series: {
    'Revenue': { type: 'bar' },
    'Trend':   { type: 'line', smooth: true, lineStyle: 'dashed' },
  },
});
```

### Dark Theme

```ts
createChart(el, 'line', data, { theme: 'dark' });
```

### Time Axis

Pass date strings or timestamps as `categories` — the axis switches to time mode automatically:

```ts
createChart(el, 'line', {
  categories: ['2024-01-01', '2024-02-01', '2024-03-01'],
  series: [{ name: 'Revenue', data: [820, 932, 901] }],
}, {
  xAxis:   { dateFormat: 'MM/DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});
```

Supported time formats: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY-MM-DD HH:mm`, ISO 8601, Unix timestamps (ms or s).

### Bar Race (Dynamic Sorting Bar Chart)

`variant: 'race'` renders one ranked snapshot per call. You drive the animation by calling `chart.update(nextFrame)` on your own interval — the library handles the smooth value/position transitions in between.

```ts
const racers = ['USA', 'China', 'India', 'Brazil', 'Japan'];

function frameFor(year: number) {
  return {
    categories: racers,                       // stable across frames — defines bar identity
    series: [{
      name: 'Population (M)',
      data: populationLookup[year],           // current values, unsorted
    }],
  };
}

const chart = createChart(el, 'bar', frameFor(1950), {
  variant: 'race',
  race: { topN: 10 },             // frameDuration auto-measured (see below)
  title: 'Population — 1950',
});

let year = 1950;
const timer = setInterval(() => {
  year++;
  if (year > 2023) { clearInterval(timer); return; }
  chart.update(frameFor(year), { title: `Population — ${year}` });
}, 1000);
```

Rules for the data you feed each frame:

- `categories` defines the racer set — keep its **order and contents stable** across frames. ECharts uses the index to match bars between frames, so any reorder will scramble the animation.
- Do **not** pre-sort. `realtimeSort: true` is on by default; just supply raw values for each racer in their registered order.
- For racers that are absent in a given frame, use `0` (or `null`) rather than removing them from `categories`.
- Use only `series[0]` — bar race shows a single ranked metric. Additional series are ignored.
- **Don't repeat your tick interval.** The library auto-measures the gap between `chart.update()` calls and uses it as the per-frame animation duration; just call `update()` on your own `setInterval` and the animation paces itself. Pass `race.frameDuration` only to override that (e.g. to deliberately slow a fast stream for readability).
- **Right-side label headroom is automatic.** The plot area's `grid.right` is sized to the widest value string in the current frame (canvas-measured) and grows monotonically across frames so digit flips don't jitter the layout. Set `grid.right` explicitly to opt out, or `race.showValueLabel: false` to skip the reserve entirely.

Race-specific options live under `race`:

```ts
{
  variant: 'race',
  race: {
    topN?: number;            // visible bars (omit to show all); maps to yAxis.max = topN - 1
    frameDuration?: number;   // override the auto-measured tick interval; clamped to [80, 3000] ms
    showValueLabel?: boolean; // animated value label at bar end (default: true)
  },
}
```

Add `colorByCategory: true` to give every racer its own color (matches the look of the official ECharts country-race demo). The library auto-hides the legend in that mode.

### Line Race (Animated Multi-Line Trail Chart)

`variant: 'race'` on a line chart turns repeated `chart.update(nextFrame)` calls into a smooth animation: each line extends with the new tail point and a tracking label at the line's leading edge ticks to the latest value.

```ts
const racers = ['China', 'India', 'USA', 'Nigeria', 'Pakistan'];

function frameFor(year: number) {
  const years = range(START_YEAR, year);            // [1960, 1961, …, year]
  return {
    categories: years,                              // grows by one each frame
    series: racers.map((name) => ({
      name,                                         // stable across frames
      data: years.map((y) => historyLookup[name][y]), // trail up to `year`
    })),
  };
}

const chart = createChart(el, 'line', frameFor(1960), {
  variant: 'race',                // frameDuration auto-measured from setInterval
  title: 'Population — 1960',
});

let year = 1960;
const timer = setInterval(() => {
  year++;
  if (year > 2030) { clearInterval(timer); return; }
  chart.update(frameFor(year), { title: `Population — ${year}` });
}, 500);
```

Rules for the data you feed each frame:

- `series[i].name` is the racer identity — keep names **stable across frames**. ECharts diffs series by name to animate transitions; renaming a series will reset its trail.
- Each frame typically carries the **full trail** (categories + each series's data extended by one point). Don't ship just the latest point — the chart needs the history to render the line.
- **Don't repeat your tick interval.** The library auto-measures the gap between `chart.update()` calls and uses it as the per-frame animation duration; just call `update()` on your own `setInterval` and the animation paces itself. Pass `race.frameDuration` only when you want to override the measured cadence.
- **Right-side end-label headroom is automatic.** The plot area's `grid.right` is sized to the widest `<seriesName> <value>` string in the current frame and grows monotonically as labels widen, so digit flips don't jitter the lines. Set `grid.right` explicitly to opt out, or `race.showValueLabel: false` to skip the reserve entirely.
- A reasonable racer count is 3–8 lines. More lines work but end-labels start overlapping.

Race-specific options live under `race`:

```ts
{
  variant: 'race',
  race: {
    frameDuration?: number;   // override the auto-measured tick interval; clamped to [80, 3000] ms
    showValueLabel?: boolean; // animated end-of-line label (default: true)
  },
}
```

#### Smooth streaming feel (axis pinning)

By default, line race auto-pins `xAxis.min` to the first category **only when the categories are timestamps** (10-digit unix seconds, 13-digit unix ms, or ISO date strings). On a category axis (e.g. `[1960, 1961, …]` as plain 4-digit numbers, or strings like `'Q1'`), ECharts re-lays out the axis every frame and existing points slide horizontally — the line appears to "compress" instead of extend.

For a truly smooth, ticker-style stream, do both:

1. Pass categories as **timestamps** so the time-axis path kicks in.
2. Pin `xAxis.max` yourself (the adapter only auto-pins `min`). With both edges fixed, existing points never move pixel-wise — only the new tail slides in.

```ts
const START = Date.UTC(1960, 0, 1);
const END   = Date.UTC(2031, 0, 1);

createChart(el, 'line', frameAt(1960), {
  variant: 'race',
  xAxis: { min: START, max: END, dateFormat: 'YYYY' },
});
```

For **live streaming** with an unknown end-time, use a **sliding window**: keep a growing buffer of points, and update `xAxis.min` / `xAxis.max` to `[now - windowMs, now]` on every frame. Both edges slide in lock-step so points keep their absolute timestamp positions — that's the canonical heart-rate-monitor look. See the "Live Streaming" card on the Dynamic Data demo page for a full example.

> **Trap — don't `shift()` per tick.** ECharts diffs line series by array **index**, not by timestamp. If you prune one point at the head every tick (e.g. `data.shift()` to keep the array bounded), every remaining index shifts by one, which morphs each point to its right neighbor's old position and fights the axis-slide animation. The visible symptom is a "shudder" at the leftmost edge once the line has filled the window. Fix: keep a generous buffer (e.g. 5× the visible window) and prune in rare, large batches — the dropped points are far off-screen by then, so the visible portion stays index-stable.

### Sankey Chart

```ts
createChart(el, 'sankey', {
  nodes: [
    { name: 'Coal' }, { name: 'Solar' },
    { name: 'Electricity' }, { name: 'Heat' },
  ],
  links: [
    { source: 'Coal',  target: 'Electricity', value: 120 },
    { source: 'Solar', target: 'Electricity', value: 80 },
    { source: 'Coal',  target: 'Heat',        value: 60 },
  ],
}, {
  title: 'Energy Flow',
  tooltip: { formatValue: (v, label) => `${label}: ${v} GWh` },
});
```

Use `variant: 'vertical'` to orient the flow top-to-bottom instead of left-to-right.

### Radar Chart

```ts
createChart(el, 'radar', {
  indicators: [
    { name: 'Sales',          max: 6500 },
    { name: 'Administration', max: 16000 },
    { name: 'IT',             max: 30000 },
    { name: 'Support',        max: 38000 },
    { name: 'Development',    max: 52000 },
    { name: 'Marketing',      max: 25000 },
  ],
  series: [
    { name: 'Allocated Budget', values: [4200, 3000, 20000, 35000, 50000, 18000] },
    { name: 'Actual Spending',  values: [5000, 14000, 28000, 26000, 42000, 21000] },
  ],
}, {
  title: 'Budget vs Spending',
  filled: true,
});
```

Use `variant: 'circle'` to render circular grid rings instead of a polygon outline. Each series gets its own palette color (resolved through the same `colors` / `colorMap` / theme pipeline as every other chart type).

### Chord Chart

```ts
createChart(el, 'chord', {
  nodes: [
    { name: 'Engineering' },
    { name: 'Design' },
    { name: 'Marketing' },
    { name: 'Sales' },
  ],
  links: [
    { source: 'Engineering', target: 'Design',    value: 30 },
    { source: 'Engineering', target: 'Marketing', value: 20 },
    { source: 'Design',      target: 'Marketing', value: 15 },
    { source: 'Sales',       target: 'Marketing', value: 25 },
  ],
}, {
  title: 'Team Collaboration',
  tooltip: { formatValue: (v) => `${v} interactions` },
});
```

---

## Options Reference

Each chart type has its own options interface that extends the base `ChartOptions`. All fields are optional.

| Chart type | Options interface | Extends |
|------------|-------------------|---------|
| `line`     | `LineChartOptions`   | `XYChartOptions` |
| `bar`      | `BarChartOptions`    | `XYChartOptions` |
| `area`     | `AreaChartOptions`   | `XYChartOptions` |
| `pie`      | `PieChartOptions`    | `ChartOptions`   |
| `gauge`    | `GaugeChartOptions`  | `ChartOptions`   |
| `sankey`   | `SankeyChartOptions` | `ChartOptions`   |
| `chord`    | `ChordChartOptions`  | `ChartOptions`   |
| `radar`    | `RadarChartOptions`  | `ChartOptions`   |

`createChart` accepts an `AnyChartOptions` union — a chart-specific literal like `{ innerRadius: '50%' }` type-checks as `PieChartOptions` without importing the subtype. For stricter validation, import the matching `XxxChartOptions` and annotate explicitly.

### `ChartOptions` (cross-cutting, base for every chart)

```ts
{
  // Appearance
  theme?: string;                    // 'light' (default) | 'dark' | custom
  /**
   * Chart title. Pass a plain string as shorthand, or a TitleOptions object
   * for full control over alignment, font size, and padding.
   */
  title?: string | {
    text: string;
    align?: 'left' | 'center' | 'right';  // default: 'center'
    fontSize?: number;                     // default: 16
    padding?: number;                      // vertical whitespace above/below, default: 8
  };
  /**
   * Outer whitespace (px) between chart content and all canvas edges.
   * Applies to title, legend, and the plot area. Default: 12.
   */
  padding?: number;
  colors?: string[];                 // override color palette
  colorMap?: Record<string, string>; // pin series/node names to specific colors

  /**
   * Global font size (px) for data labels and edge labels across every
   * chart type that renders them.
   *
   * Applies to:
   *   - line / bar / area `series.label` (when `showLabel: true`) +
   *     line-race tracking labels (`endLabel`) + bar-race value labels
   *   - pie slice labels
   *   - sankey / chord / tree node labels (parent + leaf for tree)
   *   - network node `series.label` and `series.edgeLabel` (when
   *     `showLinkLabel: true`)
   *
   * Does NOT apply to:
   *   - gauge `title` / `detail` inner text (container auto-sized by
   *     the `percentage` variant)
   *   - radar `axisName` (indicator names, not data labels)
   *   - `markPoint.label`
   *
   * Default: 12.
   */
  labelFontSize?: number;

  // Tooltip
  tooltip?: {
    enabled?: boolean;
    /** Format the tooltip header when using a time x-axis (line/bar/area). */
    dateFormat?: string;
    /** Format each rendered value (axis-mode, pie slice, sankey/chord node/edge). */
    formatValue?: (value: number | string, name: string) => string;
    /**
     * Append asynchronously loaded HTML below the chart's default tooltip body.
     * Receives a normalized TooltipContext — narrow with `ctx.kind`:
     *   - 'axis' for line / bar / area
     *   - 'item' for pie slice, sankey/chord node
     *   - 'edge' for sankey/chord link
     * Not applied to spark variants or when `tooltip.enabled === false`.
     */
    customHtml?: (ctx: TooltipContext) => Promise<string>;
    /** Shown while `customHtml` is pending. Default: 'Loading…' */
    placeholder?: string;
    /**
     * Attach the tooltip DOM to `<body>` so it escapes ancestors with
     * `overflow: hidden` (card / KPI / dialog containers).
     *
     * Auto-decided when omitted:
     *   - Light DOM (`createChart(divEl, ...)`)  → true
     *   - Shadow DOM (`<i-chart>` web component) → false
     *
     * Set explicitly only for edge cases — e.g. `<i-chart>` rendered
     * inside a Vue `<Teleport>` where you want the tooltip in `<body>`
     * regardless of shadow, or a light-DOM chart whose tooltip should
     * stay glued to the host stacking context.
     */
    appendToBody?: boolean;
    /**
     * Pixel gap between the cursor and the nearest edge of the tooltip
     * box.
     *
     * Defaults:
     *   - `variant: 'spark'` (line / area / bar)  → 6 px
     *     (tight default for KPI-card-sized charts; 20 px is too
     *     much for a 96×48 box)
     *   - all other charts                         → ECharts' built-in
     *     20 px (existing charts keep original spacing)
     *
     * Pass any number to override either default. `0` is meaningful —
     * the tooltip sits right at the cursor.
     *
     * Implementation: the library translates this into a `position`
     * callback that mirrors ECharts' built-in edge-flip logic with
     * your gap substituted for 20. `echarts.tooltip.position`
     * (passthrough) still wins via the final deep merge.
     */
    cursorGap?: number;
  };

  // Advanced passthrough — for anything not covered above
  echarts?: Record<string, unknown>;
}
```

> `legend` and `grid` are intentionally **not** on the base — only chart types
> that actually render them expose the field. `legend` lives on `XYChartOptions`,
> `PieChartOptions`, and `RadarChartOptions`; `grid` lives on `XYChartOptions`.
> Gauge, sankey, and chord render neither.
>
> The legend defaults to `type: 'scroll'` — long series lists paginate with
> arrows instead of wrapping onto a second row. This keeps the chart-body
> layout reserve (a single legend-row height) accurate regardless of how many
> series are present. Pass `legend: { type: 'plain' }` to opt back into
> native ECharts wrapping; you'll then need to bump `padding` (or move the
> legend to a side edge) so wrapped rows don't overlap the plot area.
>
> Customize each entry's text via `legend.formatLabel: (name, index) => string`.
> Maps to ECharts' native `legend.formatter` and is the typed entry point
> for "show more info next to each entry" use cases — appending values,
> units, status, or rich-text segments. Returns plain strings or ECharts
> rich-text (`{key|text}`); paired with `echarts.legend.textStyle.rich`
> when you want multi-style labels. Side-edge legends (`position: 'left'`
> / `'right'`) automatically re-measure with the formatted text so long
> values don't bleed into the chart body. See the **Custom Legend**
> page in the demo site for runnable examples across line / bar / pie /
> radar / network.

### `XYChartOptions` (shared by line / bar / area, extends `ChartOptions`)

```ts
{
  stacked?: boolean;                 // stack series (line / bar / area)

  xAxis?: {
    name?: string;
    dateFormat?: string;              // e.g. 'MM/DD', 'YYYY-MM-DD'
    cursorFormat?: string;            // axis-pointer label; falls back to dateFormat
    formatLabel?: (value: string | number, index: number) => string;
    min?: number | string;            // pin lower bound (value/time axes; also 'dataMin')
    max?: number | string;            // pin upper bound (value/time axes; also 'dataMax')
  };
  yAxis?: {
    name?: string;
    formatLabel?: (value: string | number, index: number) => string;
    min?: number | string;
    max?: number | string;
  };

  // Per-series overrides (keyed by series name, '*' applies to all)
  series?: Record<string, {
    type?: 'line' | 'bar';
    smooth?: boolean | number;        // true, false, or 0–1 curveness
    lineWidth?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    showLabel?: boolean;
    labelPosition?: 'inside' | 'outside' | 'center';
    showPoints?: boolean;
    yAxisIndex?: number;              // dual-axis: 0 (left) or 1 (right)
    markLines?: ('average' | 'max' | 'min')[];
    markPoints?: ('max' | 'min')[];
  }>;
}
```

### `LineChartOptions` (extends `XYChartOptions`)

```ts
{
  variant?: 'default' | 'spark' | 'race';

  // Variant-specific sub-namespace — only consulted when `variant === 'race'`.
  race?: {
    frameDuration?: number;   // override the auto-measured tick interval; clamped to [80, 3000] ms
    showValueLabel?: boolean; // animated end-of-line label, default: true
  };
}
```

### `BarChartOptions` (extends `XYChartOptions`)

```ts
{
  variant?: 'default' | 'horizontal' | 'spark' | 'race';

  // Bar sizing + per-bar coloring — apply to every variant, flat on the subtype.
  barWidth?: number | string;       // bar thickness, e.g. 24 or '60%'
  barMaxWidth?: number | string;    // cap on bar thickness
  barMinWidth?: number | string;    // floor on bar thickness
  barGap?: number | string;         // gap between bars of different series, default: '30%'
  barCategoryGap?: number | string; // gap between bar groups, default: '20%'
  colorByCategory?: boolean;        // color each bar by category name (auto-hides legend)

  // Variant-specific sub-namespace — only consulted when `variant === 'race'`.
  race?: {
    topN?: number;            // visible bars; maps to yAxis.max = topN - 1
    frameDuration?: number;   // override the auto-measured tick interval; clamped to [80, 3000] ms
    showValueLabel?: boolean; // animated value label at bar end, default: true
  };
}
```

### `AreaChartOptions` (extends `XYChartOptions`)

```ts
{
  variant?: 'default' | 'spark';
}
```

### `PieChartOptions` (extends `ChartOptions`)

```ts
{
  variant?: 'default' | 'doughnut' | 'half-doughnut' | 'nightingale';
  innerRadius?: string | number;            // when omitted on doughnut/half-doughnut, ring width auto-sizes by container
  outerRadius?: string | number;
  autoSort?: boolean;                 // default: true (sort slices by value desc)

  // Slice styling — flat on the subtype, `slice` prefix disambiguates the
  // otherwise-generic field names at the top level.
  sliceBorderRadius?: number;
  sliceBorderColor?: string;
  sliceGap?: number;                  // gap between slices, in degrees

  centerLabels?: Array<string | RichTextSpec>; // multi-line center labels, auto-sized, themed text color
  centerLabelOffset?: [number, number];        // optional px offset for centerLabels: [x, y]

  // Pie is the only non-XY chart that renders a legend.
  legend?: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    type?: 'scroll' | 'plain';        // default: 'scroll' (paginates instead of wrapping)
    formatLabel?: (name: string, index: number) => string; // customize legend entry text
  };
}
```

### `GaugeChartOptions` (extends `ChartOptions`)

```ts
{
  variant?: 'default' | 'percentage';
  gaugeWidth?: number;                // arc thickness in px
}
```

For the `percentage` variant, omitting `gaugeWidth` enables auto-sizing:
the ring thickness and the inner number / label font sizes are derived
from the rendered container — `min(width, height)` — so the gauge keeps
balanced proportions across small KPI tiles and large hero cards, and
re-flows when the chart resizes. An explicit `gaugeWidth` always wins.
The `default` variant keeps fixed defaults regardless of container size.

### `SankeyChartOptions` (extends `ChartOptions`)

```ts
{
  variant?: 'default' | 'vertical';
}
```

### `ChordChartOptions` (extends `ChartOptions`)

No chord-specific knobs today; reuses every field on the base `ChartOptions`.

### `RadarChartOptions` (extends `ChartOptions`)

```ts
{
  variant?: 'default' | 'circle';   // polygon outline (default) or circular rings
  filled?: boolean;                  // fill polygon area, default: true
  radius?: string | number;          // radar.radius, default: '65%'

  // Radar is a non-XY chart that still renders a legend (one entry per polygon).
  legend?: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    type?: 'scroll' | 'plain';        // default: 'scroll' (paginates instead of wrapping)
    formatLabel?: (name: string, index: number) => string; // customize legend entry text
  };
}
```

### `NetworkChartOptions` (extends `ChartOptions`)

```ts
{
  // 'default' = force-directed simulation, 'circular' = nodes on a ring.
  variant?: 'default' | 'circular';

  // Interaction
  enablePan?: boolean;              // drag-to-pan, default: true
  enableZoom?: boolean;             // mouse-wheel zoom, default: false
  draggable?: boolean;             // drag individual nodes, default: true for 'default', false for 'circular'

  // Node rendering
  showNodeLabel?: boolean;         // master toggle for node labels, default: true
  nodeSize?: number;               // pinned size for nodes without `value`. Omit (default) to auto-size from container.
  nodeSizeRange?: [number, number]; // value-driven scaling range, default: [10, 30]

  // Label density (see "Label density" above for the full priority table)
  showAllLabels?: boolean;         // default: false. When false, the two strategies
                                   // below are active. Set true to bypass both and
                                   // force every node + edge label to render.
  labelMinNodeSize?: number;       // hide labels for nodes smaller than this many
                                   // resolved px, default: 14. Set 0 to disable.

  // Edge rendering
  showLinkLabel?: boolean;         // render `link.value` near each edge, default: false
  edgeCurveness?: number;          // 0 (straight) … 0.3 (gentle curve)
                                   // default: 0 for 'default', 0.3 for 'circular'
                                   // override per-edge via `link.curveness` (negative
                                   // values bend the other way → bidirectional pairs)

  // Force-layout tuning (only consulted when variant === 'default')
  repulsion?: number;              // node-node repulsion, default: 100
  edgeLength?: number;             // pinned spring length for force layout. Omit (default) to
                                   // auto-size from container so sparse graphs in big cards spread.
  gravity?: number;                // pull toward center, default: 0.1

  // Network renders a category legend (one entry per category).
  legend?: {
    show?: boolean;                // default: true iff data has categories
    position?: 'top' | 'bottom' | 'left' | 'right';
    type?: 'scroll' | 'plain';
    formatLabel?: (name: string, index: number) => string; // customize category text
  };
}
```

---

## Theming

Two built-in themes: `light` (default) and `dark`.

### Custom Theme

```ts
import { registerTheme } from '@bndynet/icharts';

registerTheme({
  name: 'ocean',
  colorMode: 'dark',           // inherit unspecified tokens from 'dark'
  colors: {
    background:  '#0c1a2e',
    textPrimary: '#ccd6f6',
  },
  palette: ['#64ffda', '#00b4d8', '#48cae4'],
});

createChart(el, 'bar', data, { theme: 'ocean' });
```

Call `registerTheme` once at application start, before any charts are created.

### Consistent Colors Across Charts

When building dashboards with multiple charts, enable `consistentColors` so that the same name always gets the same color — regardless of which chart it appears in or how many series that chart has.

```ts
import { configure } from '@bndynet/icharts';

configure({ consistentColors: true });
```

With this enabled, if "Revenue" is palette color #1 in a line chart, it will also be #1 in a pie chart, a bar chart, or any other chart on the page.

**Pre-register specific name → color mappings (sticky pins):**

```ts
import { setColorMap } from '@bndynet/icharts';

// Apply to all themes
setColorMap({
  'Revenue':  '#ff6384',
  'Expenses': '#36a2eb',
  'Profit':   '#4bc0c0',
});

// Apply only to the dark theme
setColorMap({ 'Revenue': '#ff8fab' }, 'dark');
```

Pins set via `setColorMap` are **sticky**: they survive `switchTheme()` and
`resetColorMap()`, so a single call at app startup is enough. The auto-
assigned palette slots get wiped by SPA navigation, but your pinned colors
do not.

**Between-page state — usually automatic:**

`switchTheme(name)` now clears the target theme's auto-assigned color
slots as part of the switch, so most SPA pages do not need to call
`resetColorMap()` directly — mounting a page that calls
`switchTheme(currentTheme)` automatically restarts palette consumption
at index 0, while preserving any `setColorMap` pins.

```ts
import { resetColorMap } from '@bndynet/icharts';

// Use these only if a page doesn't call switchTheme on mount, or to wipe
// state mid-page without changing theme:
resetColorMap();          // every theme — auto entries cleared, pins kept
resetColorMap('dark');    // single theme — auto entries cleared, pins kept
```

Per-chart `colors` and `colorMap` options always take highest priority regardless of the global setting.

---

## Global API

| Function | Description |
|----------|-------------|
| `configure(opts)` | Set global options (e.g. `{ consistentColors: true }`) |
| `switchTheme(name)` | Switch all charts to a registered theme |
| `registerTheme(config)` | Register a custom theme |
| `setColorMap(map, themeName?)` | Pre-register name → color mappings (all themes or one) |
| `resetColorMap(themeName?)` | Clear accumulated color assignments (all themes or one) |
| `getSeriesColor(name)` | Get the assigned color (with hover/active/disabled states) for a name |
| `getCurrentTheme()` | Get the active theme object |
| `getThemeColors()` | Get the active theme's UI color tokens |
| `registerAdapter(type, adapter)` | Register a custom chart type adapter |

---

## Instance API

`createChart()` returns an instance with these methods:

| Method | Description |
|--------|-------------|
| `update(data?, options?)` | Re-render with new data / options |
| `setTheme(name)` | Switch to a registered theme without re-creating the instance |
| `resize()` | Trigger resize (e.g. after container size change) |
| `dispose()` | Destroy the chart and free memory. Called automatically when the container leaves the DOM (idempotent — safe to call again). |
| `getEChartsInstance()` | Access the underlying ECharts instance |

---

## Extensibility

Custom chart types can be registered via `registerAdapter`. Each adapter implements a `validate` guard and a `resolve` function that returns a full ECharts option object.

```ts
import { registerAdapter, type ChartAdapter } from '@bndynet/icharts';

const myAdapter: ChartAdapter = {
  validate(data) {
    return Array.isArray(data) && data.every(d => 'x' in d && 'y' in d);
  },
  resolve(data, options) {
    return {
      option: {
        xAxis: { type: 'value' },
        yAxis: { type: 'value' },
        series: [{ type: 'scatter', data: (data as any[]).map(d => [d.x, d.y]) }],
      },
    };
  },
};

registerAdapter('scatter', myAdapter);

// Use just like any built-in type
createChart(el, 'scatter', [{ x: 1, y: 2 }, { x: 3, y: 5 }]);
```

The optional `onInit` hook in the returned object receives the ECharts instance after the first `setOption` call, which is useful for attaching event listeners.

---

## Development

```bash
npm install
npm run dev        # Watch mode
npm run build      # Build all formats
npm run typecheck  # Type check
```

## License

MIT
