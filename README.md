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

// Update / resize / destroy later:
chart.update(newData, newOptions);
chart.resize();
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

| Type    | `type` value | Variants |
|---------|-------------|----------|
| Line    | `line`  | `default`, `spark` |
| Bar     | `bar`   | `default`, `horizontal`, `spark` |
| Area    | `area`  | `default`, `spark` |
| Pie     | `pie`   | `default`, `doughnut`, `half-doughnut`, `nightingale` |
| Gauge   | `gauge` | `default`, `percentage` |

---

## Data Formats

### Line / Bar / Area — `XYData`

```ts
{
  categories: ['Jan', 'Feb', 'Mar'],   // x-axis labels or time values
  series: [
    { name: 'Revenue', data: [120, 200, 150] },
    { name: 'Cost',    data: [90,  170, 130] },
  ],
}
```

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

---

## Common Examples

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
createChart(el, 'pie', pieData, { variant: 'doughnut' });
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

---

## Options Reference

All options are optional.

```ts
{
  // Appearance
  theme?: string;                    // 'light' (default) | 'dark' | custom
  title?: string;
  subtitle?: string;
  colors?: string[];                 // override color palette
  colorMap?: Record<string, string>; // pin series to specific colors

  // Layout
  variant?: string;                  // chart-type variant (see table above)
  stacked?: boolean;                 // stack series
  legend?: { show?: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
  grid?: { top?: number; right?: number; bottom?: number; left?: number };

  // Axis (line / bar / area)
  xAxis?: { name?: string; dateFormat?: string; cursorFormat?: string };
  yAxis?: { name?: string };

  // Pie
  innerRadius?: string | number;
  outerRadius?: string | number;
  autoSort?: boolean;

  // Gauge
  gaugeWidth?: number;

  // Tooltip
  tooltip?: { enabled?: boolean; dateFormat?: string };

  // Per-series overrides (keyed by series name, '*' for all)
  series?: Record<string, {
    type?: 'line' | 'bar';
    smooth?: boolean;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    showLabel?: boolean;
    showPoints?: boolean;
    markLines?: ('average' | 'max' | 'min')[];
    markPoints?: ('max' | 'min')[];
  }>;

  // Advanced passthrough — for anything not covered above
  echarts?: Record<string, unknown>;
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

---

## Instance API

`createChart()` returns an instance with these methods:

| Method | Description |
|--------|-------------|
| `update(data?, options?)` | Re-render with new data / options |
| `resize()` | Trigger resize (e.g. after container size change) |
| `dispose()` | Destroy the chart and free memory |
| `getEChartsInstance()` | Access the underlying chart instance |

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
