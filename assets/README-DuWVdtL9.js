const n=`# @bndynet/icharts

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
| Bar    | \`bar\`    | \`default\`, \`horizontal\`, \`spark\` |
| Area   | \`area\`   | \`default\`, \`spark\` |
| Pie    | \`pie\`    | \`default\`, \`doughnut\`, \`half-doughnut\`, \`nightingale\` |
| Gauge  | \`gauge\`  | \`default\`, \`percentage\` |
| Sankey | \`sankey\` | \`default\`, \`vertical\` |
| Chord  | \`chord\`  | \`default\` |

---

## Data Formats

### Line / Bar / Area — \`XYData\`

\`\`\`ts
{
  categories: ['Jan', 'Feb', 'Mar'],   // x-axis labels or time values
  series: [
    { name: 'Revenue', data: [120, 200, 150] },
    { name: 'Cost',    data: [90,  170, 130] },
  ],
}
\`\`\`

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

All options are optional.

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

  // Layout
  variant?: string;                  // chart-type variant (see table above)
  stacked?: boolean;                 // stack series (line / bar / area)
  legend?: { show?: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
  grid?: { top?: number; right?: number; bottom?: number; left?: number };

  // Axis (line / bar / area)
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

  // Pie
  innerRadius?: string | number;
  outerRadius?: string | number;
  autoSort?: boolean;
  slice?: {
    borderRadius?: number;
    borderColor?: string;
    gap?: number;                     // gap between slices in px
  };

  // Gauge
  gaugeWidth?: number;

  // Tooltip
  tooltip?: {
    enabled?: boolean;
    dateFormat?: string;
    formatValue?: (value: number | string, name: string) => string;
  };

  // Per-series overrides (keyed by series/node name, '*' applies to all)
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

  // Advanced passthrough — for anything not covered above
  echarts?: Record<string, unknown>;
}
\`\`\`

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
`;export{n as default};
