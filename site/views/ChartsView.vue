<template>
  <div style="max-width:1280px;margin:0 auto;">

    <!-- ── LINE & AREA ──────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">
        Line &amp; Area Charts
      </el-text>
    </el-divider>
    <div class="demo-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Line Chart</span>
            <el-tag type="info" size="small" effect="plain">type="line"</el-tag>
          </div>
        </template>
        <div ref="chartLineEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'line', {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
}, { title: 'Monthly Financials' });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Area Chart</span>
            <el-tag type="info" size="small" effect="plain">type="area"</el-tag>
          </div>
        </template>
        <div ref="chartAreaEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'area', {
  categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  series: [{ name: 'Visits', data: [820,932,901,934,1290,1330,1520] }],
}, { title: 'Weekly Visits' });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Stacked Area</span>
            <el-tag type="info" size="small" effect="plain">stacked: true</el-tag>
          </div>
        </template>
        <div ref="chartStackedAreaEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'area', data, {
  stacked: true,
  title: 'Traffic Sources',
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Line with Mark Lines</span>
            <el-tag type="info" size="small" effect="plain">markLines / markPoints</el-tag>
          </div>
        </template>
        <div ref="chartMarkEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'line', data, {
  series: {
    '*': {
      markLines: ['average'],
      markPoints: ['max', 'min'],
    },
  },
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Spark Line</span>
            <el-tag type="info" size="small" effect="plain">variant="spark"</el-tag>
          </div>
        </template>
        <div ref="chartSparkEl" style="height:80px;"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'line', data, { variant: 'spark' });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Spark Area</span>
            <el-tag type="info" size="small" effect="plain">type="area" variant="spark"</el-tag>
          </div>
        </template>
        <div ref="chartSparkAreaEl" style="height:80px;"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'area', data, { variant: 'spark', series: { '*': { smooth: 0.6 } } });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Time Axis — Date Strings</span>
            <el-tag type="info" size="small" effect="plain">categories: ['2024-01-01', ...]</el-tag>
          </div>
        </template>
        <div ref="chartTimeStrEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'line', {
  categories: ['2024-01-01','2024-02-01','2024-03-01',...],
  series: [{ name: 'Revenue', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Time Axis — Unix Timestamps</span>
            <el-tag type="info" size="small" effect="plain">categories: [1704067200000, ...]</el-tag>
          </div>
        </template>
        <div ref="chartTimeTsEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'area', {
  categories: [/* 13-digit ms timestamps */],
  series: [{ name: 'Visits', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});</pre>
        </details>
      </el-card>

    </div>

    <!-- ── BAR ─────────────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">Bar Charts</el-text>
    </el-divider>
    <div class="demo-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Bar Chart</span>
            <el-tag type="info" size="small" effect="plain">type="bar"</el-tag>
          </div>
        </template>
        <div ref="chartBarEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'bar', {
  categories: ['Q1','Q2','Q3','Q4'],
  series: [
    { name: 'Product A', data: [430,460,390,510] },
    { name: 'Product B', data: [320,382,301,354] },
  ],
}, { title: 'Quarterly Sales' });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Stacked Bar</span>
            <el-tag type="info" size="small" effect="plain">stacked: true</el-tag>
          </div>
        </template>
        <div ref="chartStackedBarEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'bar', data, {
  stacked: true,
  title: 'Stacked Revenue',
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Horizontal Bar</span>
            <el-tag type="info" size="small" effect="plain">variant="horizontal"</el-tag>
          </div>
        </template>
        <div ref="chartHbarEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'bar', data, {
  variant: 'horizontal',
  title: 'Browser Share',
});</pre>
        </details>
      </el-card>

    </div>

    <!-- ── PIE ─────────────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">Pie Charts</el-text>
    </el-divider>
    <div class="demo-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Pie Chart</span>
            <el-tag type="info" size="small" effect="plain">type="pie"</el-tag>
          </div>
        </template>
        <div ref="chartPieEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'pie', [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
], { title: 'Browser Market Share' });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Doughnut</span>
            <el-tag type="info" size="small" effect="plain">variant="doughnut"</el-tag>
          </div>
        </template>
        <div ref="chartDoughnutEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  variant: 'doughnut',
  legend: { show: true, position: 'right' },
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Nightingale Rose</span>
            <el-tag type="info" size="small" effect="plain">variant="nightingale"</el-tag>
          </div>
        </template>
        <div ref="chartRoseEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  variant: 'nightingale',
});</pre>
        </details>
      </el-card>

    </div>

    <!-- ── GAUGE ───────────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">Gauge Charts</el-text>
    </el-divider>
    <div class="demo-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Gauge</span>
            <el-tag type="info" size="small" effect="plain">type="gauge"</el-tag>
          </div>
        </template>
        <div ref="chartGaugeEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'gauge', {
  value: 72, max: 100, label: 'Score',
}, { title: 'Performance Score' });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Percentage Gauge</span>
            <el-tag type="info" size="small" effect="plain">variant="percentage"</el-tag>
          </div>
        </template>
        <div ref="chartGaugePctEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'gauge', {
  value: 85, max: 100, label: 'CPU',
}, { title: 'CPU Usage', variant: 'percentage' });</pre>
        </details>
      </el-card>

    </div>

    <!-- ── WEB COMPONENT ───────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">
        Web Component
      </el-text>
      <el-tag size="small" type="info" style="margin-left:8px;">&lt;i-chart&gt;</el-tag>
    </el-divider>
    <el-alert
      description="Drop <i-chart> directly into HTML and bind .data / .options via JS property assignment."
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom:16px;"
    />
    <div class="demo-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Line Chart</span>
            <el-tag type="info" size="small" effect="plain">&lt;i-chart type="line"&gt;</el-tag>
          </div>
        </template>
        <div class="chart-box">
          <i-chart ref="wcLineEl" type="line"></i-chart>
        </div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">&lt;i-chart id="myChart" type="line"&gt;&lt;/i-chart&gt;

&lt;script&gt;
const chart = document.getElementById('myChart');
chart.data = {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
};
chart.options = { title: 'Monthly Financials' };
&lt;/script&gt;</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Doughnut Chart</span>
            <el-tag type="info" size="small" effect="plain">&lt;i-chart type="pie"&gt;</el-tag>
          </div>
        </template>
        <div class="chart-box">
          <i-chart ref="wcPieEl" type="pie"></i-chart>
        </div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">&lt;i-chart id="myChart" type="pie"&gt;&lt;/i-chart&gt;

&lt;script&gt;
const chart = document.getElementById('myChart');
chart.data = [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
];
chart.options = { variant: 'doughnut', legend: { show: true, position: 'right' } };
&lt;/script&gt;</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Live Update</span>
            <el-button size="small" type="primary" @click="onWcRefresh">Refresh Data</el-button>
          </div>
        </template>
        <div class="chart-box">
          <i-chart ref="wcLiveEl" type="bar"></i-chart>
        </div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">&lt;i-chart id="myChart" type="bar"&gt;&lt;/i-chart&gt;
&lt;button onclick="refreshChart()"&gt;Refresh Data&lt;/button&gt;

&lt;script&gt;
const chart = document.getElementById('myChart');
function refreshChart() {
  chart.data = {
    categories: ['Q1','Q2','Q3','Q4'],
    series: [
      { name: 'Product A', data: randomData() },
      { name: 'Product B', data: randomData() },
    ],
  };
}
refreshChart();
&lt;/script&gt;</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Gauge</span>
            <el-tag type="info" size="small" effect="plain">&lt;i-chart type="gauge"&gt;</el-tag>
          </div>
        </template>
        <div class="chart-box">
          <i-chart ref="wcGaugeEl" type="gauge"></i-chart>
        </div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">&lt;i-chart id="myChart" type="gauge"&gt;&lt;/i-chart&gt;

&lt;script&gt;
const chart = document.getElementById('myChart');
chart.data = { value: 72, max: 100, label: 'Score' };
chart.options = { title: 'Performance Score', variant: 'percentage' };
&lt;/script&gt;</pre>
        </details>
      </el-card>

    </div>

    <!-- ── CHORD ───────────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">Chord Charts</el-text>
    </el-divider>
    <div class="demo-grid">

      <el-card shadow="hover" style="grid-column:1/-1;">
        <template #header>
          <div class="card-head">
            <span>Team Collaboration</span>
            <el-tag type="info" size="small" effect="plain">type="chord"</el-tag>
          </div>
        </template>
        <div ref="chartChordEl" style="height:480px;"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'chord', chordData, {
  title: 'Team Collaboration',
  tooltip: { formatValue: (v) => v + ' interactions' },
});</pre>
        </details>
      </el-card>

    </div>

    <!-- ── SANKEY ──────────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">Sankey Charts</el-text>
    </el-divider>
    <div class="demo-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Energy Flow</span>
            <el-tag type="info" size="small" effect="plain">type="sankey"</el-tag>
          </div>
        </template>
        <div ref="chartSankeyEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'sankey', {
  nodes: [{ name: 'Coal' }, { name: 'Solar' }, ...],
  links: [{ source: 'Coal', target: 'Electricity', value: 120 }, ...],
}, { title: 'Energy Flow' });</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>User Journey</span>
            <el-tag type="info" size="small" effect="plain">variant="vertical"</el-tag>
          </div>
        </template>
        <div ref="chartSankeyVerticalEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'sankey', data, {
  title: 'User Journey',
  variant: 'vertical',
});</pre>
        </details>
      </el-card>

    </div>

    <!-- ── ADVANCED ────────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">Advanced</el-text>
    </el-divider>
    <div class="demo-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Mixed Line + Bar</span>
            <el-tag type="info" size="small" effect="plain">series type override</el-tag>
          </div>
        </template>
        <div ref="chartMixedEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'line', data, {
  title: 'Revenue vs Trend',
  series: {
    'Revenue': { type: 'bar' },
    'Trend':   { smooth: true, lineStyle: 'dashed' },
  },
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Custom Colors</span>
            <el-tag type="info" size="small" effect="plain">colorMap</el-tag>
          </div>
        </template>
        <div ref="chartColorsEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  colorMap: {
    'Chrome':  '#4285F4',
    'Firefox': '#FF7139',
    'Safari':  '#000000',
    'Edge':    '#0078D4',
  },
});</pre>
        </details>
      </el-card>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createChart, configure, switchTheme } from '@bndynet/icharts'
import { useTheme } from '@bndynet/vue-site'

const { theme } = useTheme()

// ── Template refs ────────────────────────────────────────────────────────────
const chartLineEl         = ref<HTMLElement>()
const chartAreaEl         = ref<HTMLElement>()
const chartStackedAreaEl  = ref<HTMLElement>()
const chartMarkEl         = ref<HTMLElement>()
const chartSparkEl        = ref<HTMLElement>()
const chartSparkAreaEl    = ref<HTMLElement>()
const chartTimeStrEl      = ref<HTMLElement>()
const chartTimeTsEl       = ref<HTMLElement>()
const chartBarEl          = ref<HTMLElement>()
const chartStackedBarEl   = ref<HTMLElement>()
const chartHbarEl         = ref<HTMLElement>()
const chartPieEl          = ref<HTMLElement>()
const chartDoughnutEl     = ref<HTMLElement>()
const chartRoseEl         = ref<HTMLElement>()
const chartGaugeEl        = ref<HTMLElement>()
const chartGaugePctEl     = ref<HTMLElement>()
const chartChordEl        = ref<HTMLElement>()
const chartSankeyEl       = ref<HTMLElement>()
const chartSankeyVerticalEl = ref<HTMLElement>()
const chartMixedEl        = ref<HTMLElement>()
const chartColorsEl       = ref<HTMLElement>()
// web component refs (typed as any since i-chart is a custom element)
const wcLineEl  = ref()
const wcPieEl   = ref()
const wcLiveEl  = ref()
const wcGaugeEl = ref()

// ── Shared data ──────────────────────────────────────────────────────────────
const xyData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Revenue',  data: [820, 932, 901, 934, 1290, 1330] },
    { name: 'Expenses', data: [620, 732, 701, 734, 1090, 1130] },
  ],
}

const weekData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [{ name: 'Visits', data: [820, 932, 901, 934, 1290, 1330, 1520] }],
}

const trafficData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Direct',   data: [320, 302, 301, 334, 390, 330, 320] },
    { name: 'Search',   data: [120, 132, 101, 134,  90, 230, 210] },
    { name: 'Referral', data: [220, 182, 191, 234, 290, 330, 310] },
  ],
}

const barData = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Product A', data: [430, 460, 390, 510] },
    { name: 'Product B', data: [320, 382, 301, 354] },
  ],
}

const hbarData = {
  categories: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'],
  series: [{ name: 'Share %', data: [65, 15, 12, 5, 3] }],
}

const pieData = [
  { name: 'Chrome',  value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari',  value: 12 },
  { name: 'Edge',    value: 8  },
]

const sparkData = {
  categories: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
  series: [{ name: 'Trend', data: [5,8,3,12,6,9,15,7,11,4,8,13,6,10,14,3,9,7,12,8] }],
}

const mixedData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Revenue', data: [820, 932, 901, 934, 1290, 1330] },
    { name: 'Trend',   data: [720, 832, 851, 884, 1100, 1230] },
  ],
}

const timeStrData = {
  categories: ['2024-01-01','2024-02-01','2024-03-01','2024-04-01','2024-05-01','2024-06-01'],
  series: [
    { name: 'Revenue',  data: [820, 932, 901, 934, 1290, 1330] },
    { name: 'Expenses', data: [620, 732, 701, 734, 1090, 1130] },
  ],
}

const timeOrigin = Date.UTC(2024, 0, 1)
const timeTsData = {
  categories: Array.from({ length: 7 }, (_, i) => timeOrigin + i * 86400000),
  series: [{ name: 'Visits', data: [120, 145, 98, 167, 203, 180, 221] }],
}

const chordData = {
  nodes: [
    { name: 'Frontend' }, { name: 'Backend' },
    { name: 'Design' },   { name: 'QA' },
    { name: 'DevOps' },   { name: 'Product' },
  ],
  links: [
    { source: 'Frontend', target: 'Backend',  value: 42 },
    { source: 'Frontend', target: 'Design',   value: 35 },
    { source: 'Frontend', target: 'QA',       value: 28 },
    { source: 'Backend',  target: 'DevOps',   value: 30 },
    { source: 'Backend',  target: 'QA',       value: 25 },
    { source: 'Design',   target: 'Product',  value: 40 },
    { source: 'QA',       target: 'DevOps',   value: 18 },
    { source: 'Product',  target: 'Frontend', value: 22 },
    { source: 'Product',  target: 'Backend',  value: 20 },
  ],
}

const sankeyData = {
  nodes: [
    { name: 'Coal' }, { name: 'Natural Gas' }, { name: 'Solar' },
    { name: 'Electricity' }, { name: 'Heat' },
    { name: 'Industry' }, { name: 'Residential' }, { name: 'Transport' },
  ],
  links: [
    { source: 'Coal',        target: 'Electricity', value: 120 },
    { source: 'Coal',        target: 'Heat',        value: 60  },
    { source: 'Natural Gas', target: 'Electricity', value: 80  },
    { source: 'Natural Gas', target: 'Heat',        value: 90  },
    { source: 'Solar',       target: 'Electricity', value: 50  },
    { source: 'Electricity', target: 'Industry',    value: 130 },
    { source: 'Electricity', target: 'Residential', value: 80  },
    { source: 'Electricity', target: 'Transport',   value: 40  },
    { source: 'Heat',        target: 'Industry',    value: 70  },
    { source: 'Heat',        target: 'Residential', value: 80  },
  ],
}

const sankeyJourneyData = {
  nodes: [
    { name: 'Landing Page' }, { name: 'Pricing' }, { name: 'Blog' },
    { name: 'Sign Up' }, { name: 'Trial' },
    { name: 'Converted' }, { name: 'Churned' },
  ],
  links: [
    { source: 'Landing Page', target: 'Pricing',   value: 800 },
    { source: 'Landing Page', target: 'Blog',      value: 400 },
    { source: 'Pricing',      target: 'Sign Up',   value: 500 },
    { source: 'Blog',         target: 'Sign Up',   value: 200 },
    { source: 'Sign Up',      target: 'Trial',     value: 600 },
    { source: 'Trial',        target: 'Converted', value: 380 },
    { source: 'Trial',        target: 'Churned',   value: 220 },
  ],
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function randomBarData() {
  return Array.from({ length: 4 }, () => Math.round(Math.random() * 500 + 100))
}

// ── WC refresh ───────────────────────────────────────────────────────────────
function onWcRefresh() {
  if (wcLiveEl.value) {
    wcLiveEl.value.data = {
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [
        { name: 'Product A', data: randomBarData() },
        { name: 'Product B', data: randomBarData() },
      ],
    }
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  configure({ consistentColors: false })

  createChart(chartLineEl.value!, 'line', xyData, { title: 'Monthly Financials' })
  createChart(chartAreaEl.value!, 'area', weekData, { title: 'Weekly Visits' })
  createChart(chartStackedAreaEl.value!, 'area', trafficData, { stacked: true, title: 'Traffic Sources' })
  createChart(chartMarkEl.value!, 'line', xyData, {
    title: 'With Mark Lines',
    series: { '*': { markLines: ['average'], markPoints: ['max', 'min'] } },
  })
  createChart(chartSparkEl.value!, 'line', sparkData, { variant: 'spark' })
  createChart(chartSparkAreaEl.value!, 'area', sparkData, { variant: 'spark', series: { '*': { smooth: 0.6 } } })
  createChart(chartTimeStrEl.value!, 'line', timeStrData, {
    title: 'Monthly Revenue (Date Strings)',
    xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
    tooltip: { dateFormat: 'YYYY-MM-DD' },
  })
  createChart(chartTimeTsEl.value!, 'area', timeTsData, {
    title: 'Daily Visits (Timestamps)',
    xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
    tooltip: { dateFormat: 'YYYY-MM-DD' },
  })
  createChart(chartBarEl.value!, 'bar', barData, { title: 'Quarterly Sales' })
  createChart(chartStackedBarEl.value!, 'bar', barData, { stacked: true, title: 'Stacked Revenue' })
  createChart(chartHbarEl.value!, 'bar', hbarData, { variant: 'horizontal', title: 'Browser Share' })
  createChart(chartPieEl.value!, 'pie', pieData, { title: 'Browser Market Share' })
  createChart(chartDoughnutEl.value!, 'pie', pieData, {
    title: 'Browser Market Share',
    variant: 'doughnut',
    legend: { show: true, position: 'right' },
  })
  createChart(chartRoseEl.value!, 'pie', pieData, { title: 'Nightingale Rose', variant: 'nightingale' })
  createChart(chartGaugeEl.value!, 'gauge', { value: 72, max: 100, label: 'Score' }, { title: 'Performance Score' })
  createChart(chartGaugePctEl.value!, 'gauge', { value: 85, max: 100, label: 'CPU' }, { title: 'CPU Usage', variant: 'percentage' })
  createChart(chartChordEl.value!, 'chord', chordData, {
    title: 'Team Collaboration',
    tooltip: { formatValue: (v: number) => v + ' interactions' },
  })
  createChart(chartSankeyEl.value!, 'sankey', sankeyData, { title: 'Energy Flow' })
  createChart(chartSankeyVerticalEl.value!, 'sankey', sankeyJourneyData, { title: 'User Journey', variant: 'vertical' })
  createChart(chartMixedEl.value!, 'line', mixedData, {
    title: 'Revenue vs Trend',
    series: { Revenue: { type: 'bar' }, Trend: { smooth: true, lineStyle: 'dashed' } },
  })
  createChart(chartColorsEl.value!, 'pie', pieData, {
    colorMap: { Chrome: '#4285F4', Firefox: '#FF7139', Safari: '#000000', Edge: '#0078D4' },
  })

  // Web component setup
  if (wcLineEl.value) {
    wcLineEl.value.data = xyData
    wcLineEl.value.options = { title: 'Monthly Financials' }
  }
  if (wcPieEl.value) {
    wcPieEl.value.data = pieData
    wcPieEl.value.options = { title: 'Browser Market Share', variant: 'doughnut', legend: { show: true, position: 'right' } }
  }
  if (wcLiveEl.value) {
    wcLiveEl.value.data = {
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [
        { name: 'Product A', data: randomBarData() },
        { name: 'Product B', data: randomBarData() },
      ],
    }
    wcLiveEl.value.options = { title: 'Quarterly Sales' }
  }
  if (wcGaugeEl.value) {
    wcGaugeEl.value.data = { value: 72, max: 100, label: 'Score' }
    wcGaugeEl.value.options = { title: 'Performance Score', variant: 'percentage' }
  }

  // Apply the currently active theme to all freshly created charts.
  switchTheme(theme.value)
})

onUnmounted(() => {
  configure({ consistentColors: false })
})
</script>

<style scoped>
.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 16px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-box {
  height: 320px;
}

pre.code-block {
  padding: 12px;
  margin: 0;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-small);
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  color: var(--el-text-color-secondary);
}

details > summary {
  font-size: 12px;
  color: var(--el-color-primary);
  cursor: pointer;
  padding-top: 10px;
  list-style: none;
  user-select: none;
}

details > summary::-webkit-details-marker {
  display: none;
}

details[open] > summary {
  padding-bottom: 6px;
}
</style>
