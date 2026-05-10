<template>
  <div class="dashboard" :class="{ 'is-scifi': activeTheme === 'dash-scifi' }">

    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <header class="dash-header">
      <div class="dash-title-block">
        <p class="dash-eyebrow">FY 2026 · Year-to-date</p>
        <h1 class="dash-h1">SaaS Revenue Dashboard</h1>
        <p class="dash-subtitle">
          One dataset · five tiers · every chart sharing the same color story
        </p>
      </div>
      <div class="dash-theme-block">
        <div class="dash-theme-current">
          <span class="dash-theme-current-label">Active palette</span>
          <code class="dash-theme-current-name">{{ currentTheme.name || '—' }}</code>
          <span
            v-if="currentTheme.palette.length"
            class="dash-theme-swatches"
            :title="currentTheme.palette.join(', ')"
          >
            <span
              v-for="(c, i) in currentTheme.palette"
              :key="`${c}-${i}`"
              class="dash-theme-swatch"
              :style="{ background: c }"
            />
          </span>
        </div>
        <div class="dash-theme-block-row">
          <span class="dash-theme-label">Dashboard theme</span>
          <el-segmented v-model="activeTheme" :options="themeOptions" size="small" />
        </div>
      </div>
    </header>

    <el-alert type="success" :closable="false" show-icon class="dash-alert">
      <template #default>
        Every one of the eight built-in chart types is rendered below — line,
        area, bar, pie, gauge, sankey, chord and radar — all reading from a
        single shared dataset. Enabled via
        <code class="dash-code">configure({ consistentColors: true })</code>,
        every series name keeps the same color across every chart. On top of
        that, the <strong>{{ Object.keys(PIN_COLOR_MAP)[0] }}</strong> tier is pinned via
        <code class="dash-code">PIN_COLOR_MAP</code>
        to
        <span class="dash-pin-swatch" :style="{ background: PIN_COLOR_MAP.Trial }" />
        <code class="dash-code">{{ PIN_COLOR_MAP.Trial }}</code>
        on every chart (
        <code class="dash-code">options.colorMap</code>
        ). Switch the theme above to watch every other color update while Trial
        keeps
        <code class="dash-code">PIN_COLOR_MAP.Trial</code>
        everywhere.
      </template>
    </el-alert>

    <!-- ── KPI cards ────────────────────────────────────────────────────── -->
    <div class="dash-kpi-grid">
      <el-card
        v-for="(kpi, i) in kpis"
        :key="kpi.key"
        shadow="hover"
        class="dash-kpi-card"
        :body-style="{ padding: '18px 20px' }"
      >
        <div class="kpi-row">
          <div class="kpi-meta">
            <p class="kpi-label">{{ kpi.label }}</p>
            <h2 class="kpi-value">{{ kpi.value }}</h2>
            <p class="kpi-delta" :class="kpiDeltaClass(kpi)">
              <span class="kpi-delta-arrow">{{ kpi.delta >= 0 ? '▲' : '▼' }}</span>
              {{ Math.abs(kpi.delta).toFixed(1) }}%
              <span class="kpi-delta-cmp">vs LY</span>
            </p>
          </div>
          <div :ref="(el) => bindKpiSpark(el, i)" class="kpi-spark"></div>
        </div>
      </el-card>
    </div>

    <!-- ── Section: monthly trend + Q4 winners ────────────────────────── -->
    <div class="dash-row dash-row-8-4">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Monthly revenue by tier</span>
            <el-tag type="info" size="small" effect="plain">line</el-tag>
          </div>
        </template>
        <div ref="trendEl" class="chart-box-lg"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Q4 revenue ranking</span>
            <el-tag type="info" size="small" effect="plain">bar · horizontal</el-tag>
          </div>
        </template>
        <div ref="rankingEl" class="chart-box-lg"></div>
      </el-card>
    </div>

    <!-- ── Section: cumulative + quarterly breakdown ──────────────────── -->
    <div class="dash-row dash-row-1-1">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Cumulative revenue</span>
            <el-tag type="info" size="small" effect="plain">area · stacked</el-tag>
          </div>
        </template>
        <div ref="cumulativeEl" class="chart-box-lg"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Quarterly breakdown</span>
            <el-tag type="info" size="small" effect="plain">bar · stacked</el-tag>
          </div>
        </template>
        <div ref="quarterlyEl" class="chart-box-lg"></div>
      </el-card>
    </div>

    <!-- ── Section: acquisition funnel + ops health ───────────────────── -->
    <div class="dash-row dash-row-8-4">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Customer acquisition funnel</span>
            <el-tag type="info" size="small" effect="plain">sankey</el-tag>
          </div>
        </template>
        <div ref="sankeyEl" class="chart-box-lg"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Operational health</span>
            <el-tag type="info" size="small" effect="plain">gauge · percentage</el-tag>
          </div>
        </template>
        <div class="gauge-stack">
          <div ref="csatGaugeEl" class="gauge-cell"></div>
          <div ref="uptimeGaugeEl" class="gauge-cell"></div>
        </div>
      </el-card>
    </div>

    <!-- ── Section: chord + radar ─────────────────────────────────────── -->
    <div class="dash-row dash-row-1-1">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Tier movement · upgrades, downgrades, churn</span>
            <el-tag type="info" size="small" effect="plain">chord</el-tag>
          </div>
        </template>
        <div ref="chordEl" class="chart-box-lg"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Feature usage by tier</span>
            <el-tag type="info" size="small" effect="plain">radar</el-tag>
          </div>
        </template>
        <div ref="radarEl" class="chart-box-lg"></div>
      </el-card>
    </div>

    <!-- ── Section: Premium vs Pro deep-dive · full width ─────────────── -->
    <div class="dash-row dash-row-full">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Premium vs Pro · revenue &amp; growth</span>
            <el-tag type="info" size="small" effect="plain">bar + line mixed</el-tag>
          </div>
        </template>
        <div ref="mixedEl" class="chart-box-lg"></div>
      </el-card>
    </div>

    <!-- ── Section: revenue mix · three circular views ────────────────── -->
    <div class="dash-row dash-row-three">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Annual revenue share</span>
            <el-tag type="info" size="small" effect="plain">doughnut</el-tag>
          </div>
        </template>
        <div ref="shareEl" class="chart-box-lg"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Q4 revenue mix</span>
            <el-tag type="info" size="small" effect="plain">pie · nightingale</el-tag>
          </div>
        </template>
        <div ref="nightingaleEl" class="chart-box-lg"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Trial outcomes</span>
            <el-tag type="info" size="small" effect="plain">pie · half-doughnut</el-tag>
          </div>
        </template>
        <div ref="halfDoughnutEl" class="chart-box-lg"></div>
      </el-card>
    </div>

  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  createChart,
  configure,
  switchTheme,
  registerTheme,
  getCurrentTheme,
  type IChartInstance,
} from '@bndynet/icharts';
import { useTheme } from '@bndynet/vue-site';

const { theme: siteTheme } = useTheme();

// `useTheme().setTheme` is imported through `@bndynet/vue-site`, which Vite
// pre-bundles into a separate module instance from the one the package's
// virtual entry uses internally. The pre-bundled copy has its own (empty)
// palette/state, so calling its `setTheme` updates the document attribute
// but not the palette CSS variables or the theme ref, leaving the site
// half-switched. To get an identical effect to the sidebar Theme switcher
// (which uses the *internal* `setTheme`), we drive the switcher's rendered
// button — that runs the right copy of `setTheme` and updates everything
// consistently. Safe to call before mount: the lookup returns null and we
// silently skip; the next watch tick will retry.
function syncSiteTheme(mode: 'light' | 'dark'): void {
  const label = mode === 'dark' ? 'Dark' : 'Light';
  const btn = document.querySelector<HTMLButtonElement>(
    `.theme-switch-option[aria-label="${label}"]`,
  );
  btn?.click();
}

// ── Dashboard-scoped themes ────────────────────────────────────────────────
// Registered once per page load (icharts' theme registry is global; the flag
// prevents duplicates on remount). Each theme only lists tokens that differ
// from the built-in `light` / `dark` presets — `registerTheme` merges the
// rest in based on `colorMode`. The `dash-` prefix keeps these from
// colliding with the site themes registered in site/bootstrap.ts.
let dashThemesRegistered = false;
function registerDashboardThemes(): void {
  if (dashThemesRegistered) return;
  dashThemesRegistered = true;

  // Palettes are sized to comfortably cover every unique series / node name
  // the dashboard renders (≈14 across KPI sparks, tier series, sankey nodes,
  // chord nodes, mixed-chart "Growth Rate", etc.) with headroom to spare.
  // Once `configure({ consistentColors: true })` exhausts the palette,
  // ColorHub falls back to randomised hues (Math.random-based) and the same
  // name picks a different color on every refresh — keeping the palette
  // longer than the name list keeps assignments deterministic.
  registerTheme({
    name: 'dash-sunset',
    colorMode: 'light',
    colors: {
      textPrimary: '#3b1d10',
      textSecondary: '#7c2d12',
      gridLine: '#ffedd5',
      axisLine: '#fdba74',
      tooltipBackground: '#fff7ed',
      tooltipBorderColor: '#fdba74',
      tooltipTextColor: '#3b1d10',
    },
    palette: [
      '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c',
      '#c2410c', '#9a3412', '#7c2d12', '#fef3c7', '#fde68a',
      '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309',
      '#92400e', '#78350f', '#ffedd5', '#ffe4cc', '#ffd5a8',
    ],
  });

  registerTheme({
    name: 'dash-blue',
    colorMode: 'dark',
    colors: {
      surface: '#0c1e3e',
      surfaceText: '#dbeafe',
      textPrimary: '#dbeafe',
      textSecondary: '#93c5fd',
      gridLine: '#1e3a8a',
      axisLine: '#1e40af',
      // Lifted one step above `surface` so the tooltip card is visually
      // separated from the page background; border picks up a brighter
      // palette blue so the outline reads cleanly on dark.
      tooltipBackground: '#1e3a8a',
      tooltipBorderColor: '#3b82f6',
      tooltipTextColor: '#dbeafe',
    },
    palette: [
      '#60a5fa', '#38bdf8', '#22d3ee', '#818cf8', '#93c5fd',
      '#3b82f6', '#0ea5e9', '#06b6d4', '#6366f1', '#7dd3fc',
      '#2563eb', '#0284c7', '#0891b2', '#4f46e5', '#67e8f9',
      '#1d4ed8', '#0369a1', '#0e7490', '#4338ca', '#a5b4fc',
    ],
  });

  // Sci-Fi HUD palette. Paired with the `.dashboard.is-scifi` glassmorphism
  // CSS below: ECharts canvases are already transparent by default
  // (`colors.background === 'transparent'` in the built-in dark preset that
  // this entry merges into), so chart paint sits directly on the glass
  // card. `surface` is also transparent here so pie slice borders fade
  // away, fusing slices into a continuous neon ring that matches the HUD
  // aesthetic. Tooltip stays semi-opaque so values remain readable when
  // the cursor lands over a busy region of the canvas.
  registerTheme({
    name: 'dash-scifi',
    colorMode: 'dark',
    colors: {
      surface: 'transparent',
      surfaceText: '#bef0ff',
      textPrimary: '#bef0ff',
      textSecondary: '#7ed5f0',
      gridLine: 'rgba(0, 245, 255, 0.12)',
      axisLine: 'rgba(0, 245, 255, 0.45)',
      tooltipBackground: 'rgba(5, 18, 36, 0.92)',
      tooltipBorderColor: '#00f5ff',
      tooltipTextColor: '#e6faff',
    },
    palette: [
      '#00f5ff', '#00ffaa', '#ff3dac', '#ffd166', '#38bdf8',
      '#a855f7', '#ff8c42', '#5eead4', '#f472b6', '#facc15',
      '#22d3ee', '#c084fc', '#fb7185', '#34d399', '#60a5fa',
      '#e879f9', '#fbbf24', '#2dd4bf', '#f87171', '#818cf8',
    ],
  });
}

// Each option carries the `colorMode` of its registered icharts theme so the
// dashboard can flip the site UI (light/dark) in lock-step with the chart
// palette — keeping the page chrome legible against the chart backgrounds.
type DashThemeOption = {
  label: string;
  value: string;
  colorMode: 'light' | 'dark';
};
const themeOptions: DashThemeOption[] = [
  { label: 'Sunset',   value: 'dash-sunset',   colorMode: 'light' },
  { label: 'Blue',     value: 'dash-blue',     colorMode: 'dark'  },
  { label: 'Sci-Fi',   value: 'dash-scifi',    colorMode: 'dark'  },
];

// Start with no dashboard theme selected — the page inherits whichever site
// theme (light/dark) is already active. The segmented control only applies a
// dashboard palette once the user explicitly picks one.
const activeTheme = ref<string>('');

// Live snapshot of icharts' currently-active theme (name + palette), shown
// above the segmented control. Refreshed manually after every event that can
// change the global ColorHub state — local picks (`watch(activeTheme)`),
// site-driven flips (`watch(siteTheme)`, fired by site.config.ts), and the
// initial mount. Reading `getCurrentTheme()` directly inside a `computed`
// would not react because it's an imperative call into the ColorHub
// singleton — there's no Vue dependency to track.
const currentTheme = ref<{ name: string; palette: string[] }>({
  name: '',
  palette: [],
});
function refreshCurrentTheme(): void {
  const t = getCurrentTheme();
  currentTheme.value = { name: t.name, palette: [...(t.palette ?? [])] };
}

// ── Shared dataset — every chart on the page reads from `monthly` ──────────
const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const tiers    = ['Premium', 'Pro', 'Standard', 'Basic', 'Trial'];

// One shared colorMap: pinned names → fixed colors. Passed as `options.colorMap`
// on every chart; sits above the theme palette, so pins survive theme switches.
const PIN_COLOR_MAP = { Trial: '#efefef' } as const;

const monthly: Record<string, number[]> = {
  Premium:  [420, 455, 485, 515, 560, 600, 625, 660, 690, 720, 760, 810],
  Pro:      [310, 330, 345, 365, 380, 400, 420, 440, 460, 475, 495, 520],
  Standard: [220, 235, 245, 260, 270, 285, 290, 300, 315, 325, 340, 355],
  Basic:    [150, 160, 165, 170, 180, 190, 195, 205, 215, 220, 225, 235],
  Trial:    [ 90, 100, 105, 110, 118, 125, 135, 142, 150, 158, 165, 175],
};

function quarterSum(d: number[]): number[] {
  return [0, 1, 2, 3].map((q) => d.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0));
}
function yearTotal(d: number[]): number {
  return d.reduce((a, b) => a + b, 0);
}

// ── KPI summary derived from the shared dataset ────────────────────────────
const totalARR = tiers.reduce((s, t) => s + yearTotal(monthly[t]), 0); // $K
const arrSpark = months.map((_, i) => tiers.reduce((s, t) => s + monthly[t][i], 0));

// Each KPI shows a different spark chart type so the three cards read
// differently at a glance — area for cumulative revenue, bar for discrete
// monthly customer counts, line for the smooth rate trend.
const kpis = [
  {
    key: 'arr',
    label: 'Total ARR',
    value: `$${(totalARR / 1000).toFixed(2)}M`,
    delta: 18.2,
    deltaPositiveIsGood: true,
    sparkType: 'area' as const,
    sparkName: 'Total ARR',
    sparkData: arrSpark,
  },
  {
    key: 'customers',
    label: 'Active Customers',
    value: '18,420',
    delta: 9.4,
    deltaPositiveIsGood: true,
    sparkType: 'bar' as const,
    sparkName: 'Active Customers',
    sparkData: [12100, 12600, 13000, 13600, 14200, 14800, 15400, 16000, 16700, 17300, 17900, 18420],
  },
  {
    key: 'churn',
    label: 'Net Churn',
    value: '2.1%',
    delta: -0.6,
    deltaPositiveIsGood: false,
    sparkType: 'line' as const,
    sparkName: 'Net Churn',
    sparkData: [3.2, 3.1, 2.9, 2.8, 2.8, 2.6, 2.5, 2.2, 2.0, 1.1, 0.6, 0.1],
  },
];

function kpiDeltaClass(k: typeof kpis[number]): 'up' | 'down' {
  const goingUp = k.delta >= 0;
  return goingUp === k.deltaPositiveIsGood ? 'up' : 'down';
}

// ── Refs ──────────────────────────────────────────────────────────────────
const kpiSparkEls = ref<HTMLElement[]>([]);
function bindKpiSpark(el: unknown, i: number): void {
  if (el instanceof HTMLElement) kpiSparkEls.value[i] = el;
}

const trendEl        = ref<HTMLElement>();
const shareEl        = ref<HTMLElement>();
const cumulativeEl   = ref<HTMLElement>();
const quarterlyEl    = ref<HTMLElement>();
const rankingEl      = ref<HTMLElement>();
const sankeyEl       = ref<HTMLElement>();
const csatGaugeEl    = ref<HTMLElement>();
const uptimeGaugeEl  = ref<HTMLElement>();
const chordEl        = ref<HTMLElement>();
const radarEl        = ref<HTMLElement>();
const mixedEl        = ref<HTMLElement>();
const nightingaleEl  = ref<HTMLElement>();
const halfDoughnutEl = ref<HTMLElement>();

// ── Chart lifecycle ────────────────────────────────────────────────────────
const charts: IChartInstance[] = [];
function track(c: IChartInstance): IChartInstance {
  charts.push(c);
  return c;
}

let resizeHandler: (() => void) | null = null;

onMounted(() => {
  registerDashboardThemes();
  configure({ consistentColors: true });
  // Don't force a dashboard theme on first paint — let the site's current
  // light/dark theme drive the palette until the user picks one from the
  // segmented control above.
  if (activeTheme.value) {
    switchTheme(activeTheme.value);
  }
  refreshCurrentTheme();

  // ── KPI sparklines ────────────────────────────────────────────────────
  kpis.forEach((kpi, i) => {
    track(createChart(
      kpiSparkEls.value[i],
      kpi.sparkType,
      {
        categories: months,
        series: [{ name: kpi.sparkName, data: kpi.sparkData }],
      },
      {
        variant: 'spark',
        series: { '*': { smooth: true, lineWidth: 2.5 } },
        colors: [ i === 0 ? '#FF0000' : i === 1 ? '#00ff00' : '#0000ff'],
      },
    ));
  });

  // ── Shared chart data derived from `monthly` ──────────────────────────
  const monthlyTrend = {
    categories: months,
    series: tiers.map((t) => ({ name: t, data: monthly[t] })),
  };
  const quarterly = {
    categories: quarters,
    series: tiers.map((t) => ({ name: t, data: quarterSum(monthly[t]) })),
  };
  const annualShare = tiers.map((t) => ({ name: t, value: yearTotal(monthly[t]) }));

  // ── Main charts ───────────────────────────────────────────────────────
  track(createChart(trendEl.value!, 'line', monthlyTrend, {
    colorMap: PIN_COLOR_MAP,
    series: { '*': { smooth: true, lineWidth: 2.5, showPoints: false } },
    legend: { position: 'bottom' },
  }));

  track(createChart(shareEl.value!, 'pie', annualShare, {
    colorMap: PIN_COLOR_MAP,
    variant: 'doughnut',
    legend: { show: true, position: 'right' },
  }));

  track(createChart(cumulativeEl.value!, 'area', monthlyTrend, {
    colorMap: PIN_COLOR_MAP,
    stacked: true,
    series: { '*': { smooth: true } },
    legend: { position: 'bottom' },
  }));

  track(createChart(quarterlyEl.value!, 'bar', quarterly, {
    colorMap: PIN_COLOR_MAP,
    stacked: true,
    legend: { position: 'bottom' },
  }));

  // Horizontal bar with one series + `colorByCategory: true` colors each
  // bar by its tier name — the Trial bar picks up PIN_COLOR_MAP.Trial.
  track(createChart(rankingEl.value!, 'bar', {
    categories: tiers,
    series: [{ name: 'Q4 revenue', data: tiers.map((t) => quarterSum(monthly[t])[3]) }],
  }, {
    colorMap: PIN_COLOR_MAP,
    variant: 'horizontal',
    colorByCategory: true,
  }));

  track(createChart(mixedEl.value!, 'line', {
    categories: quarters,
    series: [
      { name: 'Premium',     data: quarterSum(monthly.Premium) },
      { name: 'Pro',         data: quarterSum(monthly.Pro) },
      { name: 'Growth Rate', data: [12, 16, 19, 23] },
    ],
  }, {
    colorMap: PIN_COLOR_MAP,
    series: {
      Premium:        { type: 'bar' },
      Pro:            { type: 'bar' },
      'Growth Rate':  { type: 'line', smooth: true, lineWidth: 3, showPoints: true, yAxisIndex: 1 },
    },
    legend: { position: 'bottom' },
  }));

  track(createChart(radarEl.value!, 'radar', {
    indicators: [
      { name: 'Reports',    max: 100 },
      { name: 'API',        max: 100 },
      { name: 'Support',    max: 100 },
      { name: 'SLA',        max: 100 },
      { name: 'Analytics',  max: 100 },
      { name: 'Security',   max: 100 },
    ],
    series: [
      { name: 'Premium',  values: [96, 92, 90, 95, 88, 94] },
      { name: 'Pro',      values: [80, 82, 75, 78, 72, 80] },
      { name: 'Standard', values: [60, 65, 60, 55, 55, 65] },
    ],
  }, {
    colorMap: PIN_COLOR_MAP,
    filled: true,
    legend: { position: 'bottom' },
  }));

  // ── Sankey: traffic source → trial signup → outcome tier ──────────────
  // Tier nodes use consistentColors; Trial is pinned via PIN_COLOR_MAP.
  // paintGraphNodes inside the sankey adapter.
  track(createChart(sankeyEl.value!, 'sankey', {
    nodes: [
      { name: 'Organic Search' },
      { name: 'Paid Ads' },
      { name: 'Referral' },
      { name: 'Direct' },
      { name: 'Trial Signup' },
      { name: 'Premium' },
      { name: 'Pro' },
      { name: 'Standard' },
      { name: 'Basic' },
      { name: 'Churned' },
    ],
    links: [
      { source: 'Organic Search', target: 'Trial Signup', value: 1850 },
      { source: 'Paid Ads',       target: 'Trial Signup', value: 1320 },
      { source: 'Referral',       target: 'Trial Signup', value: 980 },
      { source: 'Direct',         target: 'Trial Signup', value: 720 },
      { source: 'Trial Signup', target: 'Premium',  value: 420 },
      { source: 'Trial Signup', target: 'Pro',      value: 880 },
      { source: 'Trial Signup', target: 'Standard', value: 1240 },
      { source: 'Trial Signup', target: 'Basic',    value: 1180 },
      { source: 'Trial Signup', target: 'Churned',  value: 1150 },
    ],
  }, {
    colorMap: PIN_COLOR_MAP,
  }));

  // ── Two stacked percentage gauges in a single card ────────────────────
  // Gauges have no series name, so they pick colors straight from the
  // active theme palette — `colorMap` is irrelevant here.
  track(createChart(csatGaugeEl.value!, 'gauge',
    { value: 87, max: 100, label: 'CSAT' },
    { variant: 'percentage' },
  ));
  track(createChart(uptimeGaugeEl.value!, 'gauge',
    { value: 99.8, max: 100, label: 'Uptime' },
    { variant: 'percentage' },
  ));

  // ── Chord: inter-tier movement (upgrades, downgrades, cross-tier) ─────
  // Same node names as the line/bar/pie charts, so consistentColors keeps
  // every tier on the same color — Trial stays pinned via PIN_COLOR_MAP.
  track(createChart(chordEl.value!, 'chord', {
    nodes: [
      { name: 'Trial' },
      { name: 'Basic' },
      { name: 'Standard' },
      { name: 'Pro' },
      { name: 'Premium' },
    ],
    links: [
      { source: 'Trial',    target: 'Basic',    value: 320 },
      { source: 'Trial',    target: 'Standard', value: 240 },
      { source: 'Basic',    target: 'Standard', value: 180 },
      { source: 'Basic',    target: 'Pro',      value: 95 },
      { source: 'Standard', target: 'Pro',      value: 145 },
      { source: 'Pro',      target: 'Premium',  value: 88 },
      { source: 'Standard', target: 'Premium',  value: 32 },
      { source: 'Premium',  target: 'Pro',      value: 24 },
      { source: 'Pro',      target: 'Standard', value: 38 },
    ],
  }, {
    colorMap: PIN_COLOR_MAP,
    tooltip: { formatValue: (v) => `${v} customers` },
  }));

  // ── Pie · nightingale variant — Q4 revenue mix per tier ───────────────
  const q4Mix = tiers.map((t) => ({ name: t, value: quarterSum(monthly[t])[3] }));
  track(createChart(nightingaleEl.value!, 'pie', q4Mix, {
    colorMap: PIN_COLOR_MAP,
    variant: 'nightingale',
    legend: { show: true, position: 'bottom' },
  }));

  // ── Pie · half-doughnut variant — trial signup outcomes ───────────────
  // Mirrors the sankey's second stage so the story stays consistent.
  track(createChart(halfDoughnutEl.value!, 'pie', [
    { name: 'Premium',  value: 420 },
    { name: 'Pro',      value: 880 },
    { name: 'Standard', value: 1240 },
    { name: 'Basic',    value: 1180 },
    { name: 'Churned',  value: 1150 },
  ], {
    colorMap: PIN_COLOR_MAP,
    variant: 'half-doughnut',
    legend: { show: true, position: 'bottom' },
  }));

  resizeHandler = () => {
    for (const c of charts) c.resize();
  };
  window.addEventListener('resize', resizeHandler);
});

// Re-apply the active dashboard theme whenever the user picks a different
// one. `switchTheme` walks the live registry and re-themes every chart in
// place — no re-creation needed.
//
// The dashboard themes are tagged with a `colorMode` so picking e.g.
// `dash-midnight` (dark) on a light-mode site flips the whole site to dark.
// `site.config.ts` already watches `siteTheme` and calls
// `switchTheme(siteMode)`, which would clobber our chart palette — so we
// wait one tick for that watcher to run, then re-apply the dashboard theme.
//
// After the theme swap we MUST also resize every chart. Themes like
// `dash-scifi` add the `.is-scifi` class on the dashboard root, which
// changes card borders, backdrop-filter, corner-bracket pseudo-elements
// and a few other geometry-affecting rules. ECharts canvases were sized
// against the pre-toggle layout, so without an explicit resize their
// pixel dimensions overflow the now-different card width — most visibly
// on the last row, which has the tallest charts and so the largest
// canvas mismatch. A real `window.resize` fixes it because ECharts hooks
// that event globally. We wait one Vue tick (for the class to apply)
// plus one rAF (for the browser to lay out the new CSS) before reading
// `clientWidth`/`clientHeight`.
watch(activeTheme, async (next) => {
  if (!next) return;
  const meta = themeOptions.find((o) => o.value === next);
  if (meta && siteTheme.value !== meta.colorMode) {
    syncSiteTheme(meta.colorMode);
    await nextTick();
  }
  switchTheme(next);
  refreshCurrentTheme();
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  for (const c of charts) c.resize();
});

// site.config.ts watches `siteTheme` and calls icharts.switchTheme(siteMode)
// whenever the user toggles light/dark via the sidebar. Mirror that change
// in our header preview when no dashboard-specific theme is active —
// otherwise the preview drifts out of sync with the rendered charts.
watch(siteTheme, async () => {
  await nextTick();
  if (activeTheme.value) return;
  refreshCurrentTheme();
});

onUnmounted(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);

  for (const c of charts) c.dispose();
  charts.length = 0;

  // Restore the global icharts state so charts on other pages don't inherit
  // the dashboard's consistentColors flag or active theme.
  configure({ consistentColors: false });
  switchTheme(siteTheme.value);
});
</script>

<style scoped>
.dashboard {
  max-width: 1680px;
  margin: 0 auto;
  padding-bottom: 32px;
  /* One 12-column master grid for the whole dashboard. Every row below is
     a `subgrid` of these tracks, so column boundaries align vertically
     across rows — without subgrid the per-row grids each divide their
     own gap differently (a 3-col row consumes two 16px gaps, a 2-col row
     only one) and boundaries that should sit at 2/3 width drift ~5px
     apart. Row spacing is owned here too via `row-gap` so child rows
     don't need their own `margin-bottom`. */
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: 16px;
  row-gap: 16px;
}

/* ── Header ───────────────────────────────────────────────────────────── */
.dash-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.dash-eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--el-text-color-secondary);
  font-weight: 700;
}
.dash-h1 {
  margin: 6px 0 4px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.dash-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.dash-theme-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.dash-theme-current {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 100%;
}
.dash-theme-current-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--el-text-color-secondary);
  font-weight: 700;
}
.dash-theme-current-name {
  background: var(--el-fill-color-light);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  color: var(--el-text-color-primary);
}
.dash-theme-swatches {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}
.dash-theme-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex: 0 0 auto;
}
.dash-theme-block-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dash-theme-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--el-text-color-secondary);
  font-weight: 600;
}

/* ── Alert with pinned-color callout ──────────────────────────────────── */
.dash-alert {
  grid-column: 1 / -1;
}
.dash-code {
  background: var(--el-fill-color-light);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
}
.dash-pin-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  vertical-align: -1px;
  margin: 0 4px 0 2px;
}

/* ── KPI cards ────────────────────────────────────────────────────────── */
/* Subgrid inherits the 12-col tracks from `.dashboard`. Each KPI card
   spans 4 cols so the boundary at 4/12 and 8/12 lines up with the
   `dash-row-8-4` boundary (8/12) one row below — that's the alignment
   the previous non-subgrid layout was breaking. */
.dash-kpi-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
}
.dash-kpi-grid > * { grid-column: span 4; }
.dash-kpi-card .kpi-row {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}
.kpi-meta {
  flex: 1;
  min-width: 0;
}
.kpi-label {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--el-text-color-secondary);
  font-weight: 600;
}
.kpi-value {
  margin: 8px 0 6px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.1;
}
.kpi-delta {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.kpi-delta-arrow {
  font-size: 10px;
}
.kpi-delta-cmp {
  color: var(--el-text-color-secondary);
  font-weight: 400;
  margin-left: 4px;
}
.kpi-delta.up   { color: var(--el-color-success); }
.kpi-delta.down { color: var(--el-color-danger); }

.kpi-spark {
  width: 96px;
  height: 48px;
  flex-shrink: 0;
}

/* ── Grids ────────────────────────────────────────────────────────────── */
/* Every row below is a `subgrid` of the 12-col master grid defined on
   `.dashboard`. Each card declares its width with `grid-column: span N`
   so identical spans across rows produce identical column boundaries
   (8/12 in `dash-row-8-4` aligns with 8/12 in `dash-kpi-grid`, etc.). */
.dash-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
}
.dash-row-8-4 > :nth-child(1) { grid-column: span 8; }
.dash-row-8-4 > :nth-child(2) { grid-column: span 4; }
.dash-row-three > *           { grid-column: span 4; }
.dash-row-1-1 > *             { grid-column: span 6; }
/* Single-card "feature" row — the card spans every column of the master
   12-col grid. Used for the Premium-vs-Pro deep-dive between the
   chord/radar pair and the closing three-pie row. */
.dash-row-full > *            { grid-column: 1 / -1; }

@media (max-width: 1100px) {
  .dash-row-8-4 > *,
  .dash-row-1-1 > * {
    grid-column: 1 / -1;
  }
}
@media (max-width: 880px) {
  .dash-kpi-grid > *,
  .dash-row-three > * {
    grid-column: 1 / -1;
  }
}

/* ── Cards ────────────────────────────────────────────────────────────── */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
}

.chart-box-lg {
  height: 340px;
}

/* ── Two-gauge column inside a single card ────────────────────────────── */
.gauge-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 340px;
}
.gauge-cell {
  flex: 1 1 0;
  min-height: 0;
}

/* ── Sci-Fi HUD theme ─────────────────────────────────────────────────── */
/* Activated by `:class="{ 'is-scifi': activeTheme === 'dash-scifi' }"` on
   the dashboard root. Everything below is intentionally scoped under
   `.dashboard.is-scifi` so the regular Sunset/Blue/light/dark themes are
   untouched. Pairs with the `dash-scifi` icharts theme (palette + tokens)
   so chart canvases blend into the glass panels instead of painting an
   opaque background on top of them. */

/* Full-viewport background: a single procedurally-generated SVG artboard
   (`site/assets/scifi-bg.svg`, 1920x1080) that bundles every layer of the
   scene — deep-space gradient, three nebula glows (cyan / violet / pink),
   a three-tier star field, a two-tier HUD grid, a reticle, a planet-limb
   arc, telemetry tick scale, and corner tech-text labels. Keeping all the
   artwork in one asset means the look is editable in any vector tool and
   Vite hashes the URL for cache-busting on rebuild.

   The bg is attached to a non-scoped `body:has(.dashboard.is-scifi)`
   rule (in the second `<style>` block below) so it can paint **above**
   vue-site's `.site-content` background-color, which would otherwise
   eclipse anything painted as a `z-index: -1` descendant of `.dashboard`.
   `background-attachment: fixed` keeps the artboard locked to the
   viewport while the dashboard scrolls; `cover` sizes it aspect-correct.
   Only the scanline overlay stays here as a `::before` because it needs
   to live in the same stacking context as the glass cards (above the
   bg, below the cards) and adds a subtle screen-blended ripple. */

/* Static scanline overlay — fixed horizontal stripes at low alpha. Sits
   above the bg but still behind cards. No animation to keep CPU idle
   while ECharts is doing real work. */
.dashboard.is-scifi::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent 2px,
    rgba(0, 245, 255, 0.025) 3px,
    transparent 4px
  );
  background-size: 100% 4px;
  mix-blend-mode: screen;
}
/* All real dashboard content must sit above the scanline overlay. */
.dashboard.is-scifi > * {
  position: relative;
  z-index: 1;
}

/* Header typography: cyan glow on the title, brighter eyebrow / subtitle. */
.dashboard.is-scifi .dash-eyebrow,
.dashboard.is-scifi .dash-theme-current-label,
.dashboard.is-scifi .dash-theme-label,
.dashboard.is-scifi .kpi-label {
  color: #5dd7f0;
  text-shadow: 0 0 6px rgba(0, 245, 255, 0.4);
}
.dashboard.is-scifi .dash-h1 {
  color: #e6faff;
  text-shadow:
    0 0 8px rgba(0, 245, 255, 0.55),
    0 0 22px rgba(0, 245, 255, 0.25);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  letter-spacing: 0.04em;
}
.dashboard.is-scifi .dash-subtitle,
.dashboard.is-scifi .kpi-delta-cmp {
  color: #93c6da;
}
.dashboard.is-scifi .kpi-value {
  color: #e6faff;
  text-shadow: 0 0 10px rgba(0, 245, 255, 0.5);
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.dashboard.is-scifi .dash-theme-current-name {
  background: rgba(0, 245, 255, 0.1);
  color: #e6faff;
  border: 1px solid rgba(0, 245, 255, 0.35);
}
.dashboard.is-scifi .dash-theme-swatches {
  background: rgba(5, 18, 36, 0.5);
  border-color: rgba(0, 245, 255, 0.3);
}

/* Alert: glass card with cyan accent. `:deep` is required because Element
   Plus renders the alert's interior structure outside this component's
   scope-id. */
.dashboard.is-scifi :deep(.el-alert) {
  background: rgba(5, 18, 36, 0.5);
  border: 1px solid rgba(0, 245, 255, 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  box-shadow: 0 0 18px rgba(0, 245, 255, 0.15);
}
.dashboard.is-scifi :deep(.el-alert .el-alert__content),
.dashboard.is-scifi :deep(.el-alert .el-alert__description),
.dashboard.is-scifi :deep(.el-alert .el-alert__title) {
  color: #d6f0fa;
}
.dashboard.is-scifi .dash-code {
  background: rgba(0, 245, 255, 0.12);
  color: #e6faff;
  border: 1px solid rgba(0, 245, 255, 0.3);
}

/* Glassmorphism cards. `position: relative` is required so the ::before
   corner-brackets layer (below) anchors to the card. The negative
   `backdrop-filter` chain falls back gracefully on browsers without
   support — the rgba background still reads as a panel. */
.dashboard.is-scifi :deep(.el-card) {
  position: relative;
  background: transparent;
  border: 1px solid rgba(0, 245, 255, 0.28);
  border-radius: 2px;
  backdrop-filter: blur(2px) saturate(140%);
  -webkit-backdrop-filter: blur(2px) saturate(140%);
  box-shadow:
    0 0 24px rgba(0, 245, 255, 0.12),
    inset 0 0 30px rgba(0, 245, 255, 0.04);
  overflow: visible;
}
.dashboard.is-scifi :deep(.el-card:hover) {
  border-color: rgba(0, 245, 255, 0.55);
  box-shadow:
    0 0 32px rgba(0, 245, 255, 0.28),
    inset 0 0 30px rgba(0, 245, 255, 0.06);
}

/* Four neon corner brackets drawn entirely with layered background-images
   on the card's ::before — no extra DOM nodes needed. Eight layered
   gradients = one horizontal + one vertical stroke per corner. Element
   Plus's el-card doesn't use ::before itself, so we own this pseudo. */
.dashboard.is-scifi :deep(.el-card)::before {
  content: '';
  position: absolute;
  inset: -1px;
  pointer-events: none;
  z-index: 1;
  background-image:
    linear-gradient(#00f5ff, #00f5ff), linear-gradient(#00f5ff, #00f5ff),
    linear-gradient(#00f5ff, #00f5ff), linear-gradient(#00f5ff, #00f5ff),
    linear-gradient(#00f5ff, #00f5ff), linear-gradient(#00f5ff, #00f5ff),
    linear-gradient(#00f5ff, #00f5ff), linear-gradient(#00f5ff, #00f5ff);
  background-size:
    18px 2px, 2px 18px,
    18px 2px, 2px 18px,
    18px 2px, 2px 18px,
    18px 2px, 2px 18px;
  background-position:
    left top, left top,
    right top, right top,
    left bottom, left bottom,
    right bottom, right bottom;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 4px rgba(0, 245, 255, 0.7));
}

/* Card header: HUD-style label bar — cyan underline, uppercase, tracked. */
.dashboard.is-scifi :deep(.el-card__header) {
  background: linear-gradient(
    90deg,
    rgba(0, 245, 255, 0.14) 0%,
    rgba(0, 245, 255, 0.04) 50%,
    transparent 100%
  );
  border-bottom: 1px solid rgba(0, 245, 255, 0.3);
  color: #d6f0fa;
}
.dashboard.is-scifi :deep(.el-card__header) .card-head {
  color: #e6faff;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 12px;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
.dashboard.is-scifi :deep(.el-card__body) {
  color: #d6f0fa;
}

/* Tags inside card headers: outlined neon pill instead of filled gray. */
.dashboard.is-scifi :deep(.el-tag) {
  background: rgba(0, 245, 255, 0.08);
  border-color: rgba(0, 245, 255, 0.5);
  color: #7ee9ff;
  text-shadow: 0 0 4px rgba(0, 245, 255, 0.4);
}

/* Segmented control: glass background, glowing active pill. */
.dashboard.is-scifi :deep(.el-segmented) {
  background: rgba(5, 18, 36, 0.55);
  border: 1px solid rgba(0, 245, 255, 0.3);
  --el-segmented-item-selected-bg-color: rgba(0, 245, 255, 0.22);
  --el-segmented-item-selected-color: #e6faff;
  --el-segmented-color: #93c6da;
}

/* KPI delta colors keep success/danger semantics but glow on the dark bg. */
.dashboard.is-scifi .kpi-delta.up   { color: #00ffaa; text-shadow: 0 0 6px rgba(0, 255, 170, 0.5); }
.dashboard.is-scifi .kpi-delta.down { color: #ff3dac; text-shadow: 0 0 6px rgba(255, 61, 172, 0.5); }
</style>

<!--
  Non-scoped (global) style block. Scoped CSS rewrites every selector with
  the component's `data-v-<hash>` suffix, so a scoped rule can never reach
  vue-site's `.site-content` wrapper (which is outside this component's
  template and thus has no scope-id attribute). The wrapper has its own
  opaque `background: var(--color-content-bg)` baked into vue-site's
  stylesheet — without overriding it, any background we paint underneath
  is eclipsed.

  Painting the sci-fi artwork directly on `.site-content` (instead of on
  `body` with a separate transparent override) is the cleaner solution:
  one rule replaces two, the artwork is scoped to the actual content
  area, and the sidebar / top nav keep their own chrome untouched.
  `:has()` is supported in every evergreen browser, and the rule reverts
  automatically when the user picks a non-sci-fi dashboard theme (the
  `.is-scifi` class disappears, the selector no longer matches, and
  vue-site's default `.site-content` background takes over again).
  `background-attachment: fixed` sizes the artboard to the viewport
  (not the `.site-content` box), so scrolling the dashboard leaves the
  HUD locked in place — the cards float over a static scene.
-->
<style>
.site-content:has(.dashboard.is-scifi) {
  background-color: #03070f;
  background-image: url('../assets/scifi-bg.svg');
  background-size: cover;
  background-position: bottom;
  background-attachment: fixed;
  background-repeat: no-repeat;
}
</style>
