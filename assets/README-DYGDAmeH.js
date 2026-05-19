const e=`# @bndynet/icharts

A lightweight charting library with a Web Component (\`<i-chart>\`) and a simple \`createChart()\` API.

## Installation

\`\`\`bash
npm install @bndynet/icharts
\`\`\`

---

## Quick Start

### Option 1 — Web Component (HTML)

\`\`\`html
<script type="module">
  import '@bndynet/icharts';
<\/script>

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
<\/script>
\`\`\`

### Option 2 — JavaScript / TypeScript

\`\`\`ts
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

// Update / resize / destroy later:
chart.update(newData, newOptions);
chart.resize();
chart.dispose();
\`\`\`

### Option 3 — CDN (no bundler)

\`\`\`html
<script src="./node_modules/@bndynet/icharts/dist/index.global.js"><\/script>

<div id="chart" style="width: 600px; height: 400px;"></div>
<script>
  iCharts.createChart(document.getElementById('chart'), 'pie', [
    { name: 'Chrome',  value: 65 },
    { name: 'Firefox', value: 15 },
    { name: 'Safari',  value: 12 },
    { name: 'Edge',    value: 8  },
  ]);
<\/script>
\`\`\`

---

## Chart Types

| Type   | \`type\` value | Variants |
|--------|-------------|----------|
| Line   | \`line\`   | \`default\`, \`spark\` |
| Bar    | \`bar\`    | \`default\`, \`horizontal\`, \`spark\`, \`race\` |
| Area   | \`area\`   | \`default\`, \`spark\` |
| Pie    | \`pie\`    | \`default\`, \`doughnut\`, \`half-doughnut\`, \`nightingale\` |
| Gauge  | \`gauge\`  | \`default\`, \`percentage\` |
| Sankey | \`sankey\` | \`default\`, \`vertical\` |
| Chord  | \`chord\`  | \`default\` |

---

## Data Formats

### Line / Bar / Area — \`XYData\` (aliased as \`LineData\` / \`BarData\` / \`AreaData\`)

\`\`\`ts
{
  categories: ['Jan', 'Feb', 'Mar'],   // x-axis labels or time values
  series: [
    { name: 'Revenue', data: [120, 200, 150] },
    { name: 'Cost',    data: [90,  170, 130] },
  ],
}
\`\`\`

Line, bar, and area share the same runtime shape. The library exports \`LineData\`, \`BarData\`, and \`AreaData\` aliases for \`XYData\` so call sites and adapters can declare intent explicitly.

### Pie — \`PieData\`

\`\`\`ts
[
  { name: 'Chrome',  value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari',  value: 12 },
]
\`\`\`

### Gauge — \`GaugeData\`

\`\`\`ts
{ value: 72, max: 100, label: 'Score' }
\`\`\`

### Sankey — \`SankeyData\`

\`\`\`ts
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
\`\`\`

Each node accepts an optional \`color\` field to pin it to a specific color. The \`colorMap\` option can also be used to assign colors by node name.

### Chord — \`ChordData\`

\`\`\`ts
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
\`\`\`

Each node accepts optional \`color\` and \`value\` fields. When \`value\` is omitted, the arc size is derived from the sum of connected link values.

---

## Common Examples

### Bar with Distinct Colors per Category

Single-series bar chart where each bar gets its own palette color (resolved from the category name via \`colorMap\` → theme palette → \`consistentColors\`, exactly like every other "name → color" lookup in the library). The legend is auto-hidden because the series marker would conflict with the per-bar colors drawn on the plot.

\`\`\`ts
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
\`\`\`

Silently falls back to a single series color when \`stacked: true\` or when the chart has more than one series — per-category colors only make visual sense for single-series bars.

### Stacked Bar

\`\`\`ts
createChart(el, 'bar', {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  series: [
    { name: 'Email',  data: [120, 132, 101, 134, 90] },
    { name: 'Video',  data: [220, 182, 191, 234, 290] },
    { name: 'Search', data: [150, 232, 201, 154, 190] },
  ],
}, { stacked: true, title: 'Weekly Traffic' });
\`\`\`

### Doughnut Chart

\`\`\`ts
createChart(el, 'pie', pieData, { variant: 'doughnut' });
\`\`\`

### Gauge (Percentage)

\`\`\`ts
createChart(el, 'gauge', { value: 85, label: 'CPU' }, { variant: 'percentage' });
\`\`\`

### Spark Line (mini, no axes)

\`\`\`ts
createChart(el, 'line', {
  categories: [1, 2, 3, 4, 5],
  series: [{ name: 'Trend', data: [5, 8, 3, 9, 6] }],
}, { variant: 'spark' });
\`\`\`

### Mixed Line + Bar

\`\`\`ts
createChart(el, 'line', data, {
  series: {
    'Revenue': { type: 'bar' },
    'Trend':   { type: 'line', smooth: true, lineStyle: 'dashed' },
  },
});
\`\`\`

### Dark Theme

\`\`\`ts
createChart(el, 'line', data, { theme: 'dark' });
\`\`\`

### Time Axis

Pass date strings or timestamps as \`categories\` — the axis switches to time mode automatically:

\`\`\`ts
createChart(el, 'line', {
  categories: ['2024-01-01', '2024-02-01', '2024-03-01'],
  series: [{ name: 'Revenue', data: [820, 932, 901] }],
}, {
  xAxis:   { dateFormat: 'MM/DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});
\`\`\`

Supported time formats: \`YYYY-MM-DD\`, \`YYYY/MM/DD\`, \`YYYY-MM-DD HH:mm\`, ISO 8601, Unix timestamps (ms or s).

### Bar Race (Dynamic Sorting Bar Chart)

\`variant: 'race'\` renders one ranked snapshot per call. You drive the animation by calling \`chart.update(nextFrame)\` on your own interval — the library handles the smooth value/position transitions in between.

\`\`\`ts
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
  race: { topN: 10, frameDuration: 1000 },
  title: 'Population — 1950',
});

let year = 1950;
const timer = setInterval(() => {
  year++;
  if (year > 2023) { clearInterval(timer); return; }
  chart.update(frameFor(year), { title: \`Population — \${year}\` });
}, 1000);
\`\`\`

Rules for the data you feed each frame:

- \`categories\` defines the racer set — keep its **order and contents stable** across frames. ECharts uses the index to match bars between frames, so any reorder will scramble the animation.
- Do **not** pre-sort. \`realtimeSort: true\` is on by default; just supply raw values for each racer in their registered order.
- For racers that are absent in a given frame, use \`0\` (or \`null\`) rather than removing them from \`categories\`.
- Use only \`series[0]\` — bar race shows a single ranked metric. Additional series are ignored.
- Match your \`setInterval\` cadence to \`race.frameDuration\` (default 3000 ms) so the previous frame's animation finishes before the next one starts.

Race-specific options live under \`race\`:

\`\`\`ts
{
  variant: 'race',
  race: {
    topN?: number;            // visible bars (omit to show all); maps to yAxis.max = topN - 1
    frameDuration?: number;   // ms between frames (default: 3000)
    showValueLabel?: boolean; // animated value label at bar end (default: true)
  },
}
\`\`\`

Add \`colorByCategory: true\` to give every racer its own color (matches the look of the official ECharts country-race demo). The library auto-hides the legend in that mode.

### Sankey Chart

\`\`\`ts
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
  tooltip: { formatValue: (v, label) => \`\${label}: \${v} GWh\` },
});
\`\`\`

Use \`variant: 'vertical'\` to orient the flow top-to-bottom instead of left-to-right.

### Chord Chart

\`\`\`ts
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
  tooltip: { formatValue: (v) => \`\${v} interactions\` },
});
\`\`\`

---

## Options Reference

Each chart type has its own options interface that extends the base \`ChartOptions\`. All fields are optional.

| Chart type | Options interface | Extends |
|------------|-------------------|---------|
| \`line\`     | \`LineChartOptions\`   | \`XYChartOptions\` |
| \`bar\`      | \`BarChartOptions\`    | \`XYChartOptions\` |
| \`area\`     | \`AreaChartOptions\`   | \`XYChartOptions\` |
| \`pie\`      | \`PieChartOptions\`    | \`ChartOptions\`   |
| \`gauge\`    | \`GaugeChartOptions\`  | \`ChartOptions\`   |
| \`sankey\`   | \`SankeyChartOptions\` | \`ChartOptions\`   |
| \`chord\`    | \`ChordChartOptions\`  | \`ChartOptions\`   |

\`createChart\` accepts an \`AnyChartOptions\` union — a chart-specific literal like \`{ innerRadius: '50%' }\` type-checks as \`PieChartOptions\` without importing the subtype. For stricter validation, import the matching \`XxxChartOptions\` and annotate explicitly.

### \`ChartOptions\` (cross-cutting, base for every chart)

\`\`\`ts
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

  // Tooltip
  tooltip?: {
    enabled?: boolean;
    /** Format the tooltip header when using a time x-axis (line/bar/area). */
    dateFormat?: string;
    /** Format each rendered value (axis-mode, pie slice, sankey/chord node/edge). */
    formatValue?: (value: number | string, name: string) => string;
    /**
     * Append asynchronously loaded HTML below the chart's default tooltip body.
     * Receives a normalized TooltipContext — narrow with \`ctx.kind\`:
     *   - 'axis' for line / bar / area
     *   - 'item' for pie slice, sankey/chord node
     *   - 'edge' for sankey/chord link
     * Not applied to spark variants or when \`tooltip.enabled === false\`.
     */
    customHtml?: (ctx: TooltipContext) => Promise<string>;
    /** Shown while \`customHtml\` is pending. Default: 'Loading…' */
    placeholder?: string;
  };

  // Advanced passthrough — for anything not covered above
  echarts?: Record<string, unknown>;
}
\`\`\`

> \`legend\` and \`grid\` are intentionally **not** on the base — only chart types
> that actually render them expose the field. \`legend\` lives on \`XYChartOptions\`
> and \`PieChartOptions\`; \`grid\` lives on \`XYChartOptions\`. Gauge, sankey, and
> chord render neither.

### \`XYChartOptions\` (shared by line / bar / area, extends \`ChartOptions\`)

\`\`\`ts
{
  stacked?: boolean;                 // stack series (line / bar / area)

  xAxis?: {
    name?: string;
    dateFormat?: string;              // e.g. 'MM/DD', 'YYYY-MM-DD'
    cursorFormat?: string;            // axis-pointer label; falls back to dateFormat
    formatLabel?: (value: string | number, index: number) => string;
  };
  yAxis?: {
    name?: string;
    formatLabel?: (value: string | number, index: number) => string;
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
\`\`\`

### \`LineChartOptions\` (extends \`XYChartOptions\`)

\`\`\`ts
{
  variant?: 'default' | 'spark';
}
\`\`\`

### \`BarChartOptions\` (extends \`XYChartOptions\`)

\`\`\`ts
{
  variant?: 'default' | 'horizontal' | 'spark' | 'race';

  // Bar sizing + per-bar coloring — apply to every variant, flat on the subtype.
  barWidth?: number | string;       // bar thickness, e.g. 24 or '60%'
  barMaxWidth?: number | string;    // cap on bar thickness
  barMinWidth?: number | string;    // floor on bar thickness
  barGap?: number | string;         // gap between bars of different series, default: '30%'
  barCategoryGap?: number | string; // gap between bar groups, default: '20%'
  colorByCategory?: boolean;        // color each bar by category name (auto-hides legend)

  // Variant-specific sub-namespace — only consulted when \`variant === 'race'\`.
  race?: {
    topN?: number;            // visible bars; maps to yAxis.max = topN - 1
    frameDuration?: number;   // ms between frames, default: 3000
    showValueLabel?: boolean; // animated value label at bar end, default: true
  };
}
\`\`\`

### \`AreaChartOptions\` (extends \`XYChartOptions\`)

\`\`\`ts
{
  variant?: 'default' | 'spark';
}
\`\`\`

### \`PieChartOptions\` (extends \`ChartOptions\`)

\`\`\`ts
{
  variant?: 'default' | 'doughnut' | 'half-doughnut' | 'nightingale';
  innerRadius?: string | number;
  outerRadius?: string | number;
  autoSort?: boolean;                 // default: true (sort slices by value desc)

  // Slice styling — flat on the subtype, \`slice\` prefix disambiguates the
  // otherwise-generic field names at the top level.
  sliceBorderRadius?: number;
  sliceBorderColor?: string;
  sliceGap?: number;                  // gap between slices, in degrees

  // Pie is the only non-XY chart that renders a legend.
  legend?: { show?: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
}
\`\`\`

### \`GaugeChartOptions\` (extends \`ChartOptions\`)

\`\`\`ts
{
  variant?: 'default' | 'percentage';
  gaugeWidth?: number;                // arc thickness in px
}
\`\`\`

### \`SankeyChartOptions\` (extends \`ChartOptions\`)

\`\`\`ts
{
  variant?: 'default' | 'vertical';
}
\`\`\`

### \`ChordChartOptions\` (extends \`ChartOptions\`)

No chord-specific knobs today; reuses every field on the base \`ChartOptions\`.

---

## Theming

Two built-in themes: \`light\` (default) and \`dark\`.

### Custom Theme

\`\`\`ts
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
\`\`\`

Call \`registerTheme\` once at application start, before any charts are created.

### Consistent Colors Across Charts

When building dashboards with multiple charts, enable \`consistentColors\` so that the same name always gets the same color — regardless of which chart it appears in or how many series that chart has.

\`\`\`ts
import { configure } from '@bndynet/icharts';

configure({ consistentColors: true });
\`\`\`

With this enabled, if "Revenue" is palette color #1 in a line chart, it will also be #1 in a pie chart, a bar chart, or any other chart on the page.

**Pre-register specific name → color mappings:**

\`\`\`ts
import { setColorMap } from '@bndynet/icharts';

// Apply to all themes
setColorMap({
  'Revenue':  '#ff6384',
  'Expenses': '#36a2eb',
  'Profit':   '#4bc0c0',
});

// Apply only to the dark theme
setColorMap({ 'Revenue': '#ff8fab' }, 'dark');
\`\`\`

**Reset when navigating between dashboards:**

\`\`\`ts
import { resetColorMap } from '@bndynet/icharts';

// Clear all accumulated name → color assignments
resetColorMap();

// Clear only a specific theme
resetColorMap('dark');
\`\`\`

Per-chart \`colors\` and \`colorMap\` options always take highest priority regardless of the global setting.

---

## Global API

| Function | Description |
|----------|-------------|
| \`configure(opts)\` | Set global options (e.g. \`{ consistentColors: true }\`) |
| \`switchTheme(name)\` | Switch all charts to a registered theme |
| \`registerTheme(config)\` | Register a custom theme |
| \`setColorMap(map, themeName?)\` | Pre-register name → color mappings (all themes or one) |
| \`resetColorMap(themeName?)\` | Clear accumulated color assignments (all themes or one) |
| \`getSeriesColor(name)\` | Get the assigned color (with hover/active/disabled states) for a name |
| \`getCurrentTheme()\` | Get the active theme object |
| \`getThemeColors()\` | Get the active theme's UI color tokens |
| \`registerAdapter(type, adapter)\` | Register a custom chart type adapter |

---

## Instance API

\`createChart()\` returns an instance with these methods:

| Method | Description |
|--------|-------------|
| \`update(data?, options?)\` | Re-render with new data / options |
| \`setTheme(name)\` | Switch to a registered theme without re-creating the instance |
| \`resize()\` | Trigger resize (e.g. after container size change) |
| \`dispose()\` | Destroy the chart and free memory |
| \`getEChartsInstance()\` | Access the underlying ECharts instance |

---

## Extensibility

Custom chart types can be registered via \`registerAdapter\`. Each adapter implements a \`validate\` guard and a \`resolve\` function that returns a full ECharts option object.

\`\`\`ts
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
\`\`\`

The optional \`onInit\` hook in the returned object receives the ECharts instance after the first \`setOption\` call, which is useful for attaching event listeners.

---

## Development

\`\`\`bash
npm install
npm run dev        # Watch mode
npm run build      # Build all formats
npm run typecheck  # Type check
\`\`\`

## License

MIT
`;export{e as default};
