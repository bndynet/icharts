<template>
  <div class="dashboard">

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
        <span class="dash-theme-label">Dashboard theme</span>
        <el-segmented v-model="activeTheme" :options="themeOptions" size="small" />
      </div>
    </header>

    <el-alert type="success" :closable="false" show-icon class="dash-alert">
      <template #default>
        Every one of the eight built-in chart types is rendered below — line,
        area, bar, pie, gauge, sankey, chord and radar — all reading from a
        single shared dataset. Enabled via
        <code class="dash-code">configure({ consistentColors: true })</code>,
        every series name keeps the same color across every chart. On top of
        that, the <strong>Premium</strong> tier is pinned to
        <span class="dash-pin-swatch" />
        <code class="dash-code">#FFD166</code>
        via a single shared
        <code class="dash-code">colorMap</code>
        passed to each chart. Switch the theme above to watch every other
        color update while Premium stays the same gold everywhere.
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

    <!-- ── Section: trend + share ─────────────────────────────────────────── -->
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
            <span>Annual revenue share</span>
            <el-tag type="info" size="small" effect="plain">doughnut</el-tag>
          </div>
        </template>
        <div ref="shareEl" class="chart-box-lg"></div>
      </el-card>
    </div>

    <!-- ── Section: 3-col grid ─────────────────────────────────────────────── -->
    <div class="dash-row dash-row-three">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Cumulative revenue</span>
            <el-tag type="info" size="small" effect="plain">area · stacked</el-tag>
          </div>
        </template>
        <div ref="cumulativeEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Quarterly breakdown</span>
            <el-tag type="info" size="small" effect="plain">bar · stacked</el-tag>
          </div>
        </template>
        <div ref="quarterlyEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Q4 revenue ranking</span>
            <el-tag type="info" size="small" effect="plain">bar · horizontal</el-tag>
          </div>
        </template>
        <div ref="rankingEl" class="chart-box"></div>
      </el-card>
    </div>

    <!-- ── Section: sankey + 2 gauges ────────────────────────────────────── -->
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

    <!-- ── Section: chord + radar ────────────────────────────────────────── -->
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

    <!-- ── Section: mixed + nightingale + half-doughnut ──────────────────── -->
    <div class="dash-row dash-row-5-4-3">
      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Premium vs Pro · revenue &amp; growth</span>
            <el-tag type="info" size="small" effect="plain">bar + line mixed</el-tag>
          </div>
        </template>
        <div ref="mixedEl" class="chart-box-lg"></div>
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

  registerTheme({
    name: 'dash-ocean',
    colorMode: 'light',
    palette: ['#0ea5e9', '#14b8a6', '#8b5cf6', '#0891b2', '#f43f5e'],
  });

  registerTheme({
    name: 'dash-midnight',
    colorMode: 'dark',
    palette: ['#60a5fa', '#22d3ee', '#a78bfa', '#34d399', '#f472b6'],
  });

  registerTheme({
    name: 'dash-sunset',
    colorMode: 'light',
    colors: {
      textPrimary: '#3b1d10',
      textSecondary: '#7c2d12',
      gridLine: '#ffedd5',
      axisLine: '#fdba74',
    },
    palette: ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#0ea5e9'],
  });

  registerTheme({
    name: 'dash-forest',
    colorMode: 'dark',
    colors: {
      surface: '#0a3622',
      surfaceText: '#dcfce7',
      textPrimary: '#dcfce7',
      textSecondary: '#86efac',
      gridLine: '#14532d',
      axisLine: '#166534',
      tooltipBackground: '#0a3622',
      tooltipBorderColor: '#166534',
    },
    palette: ['#34d399', '#22d3ee', '#a3e635', '#5eead4', '#86efac'],
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
  { label: 'Ocean',    value: 'dash-ocean',    colorMode: 'light' },
  { label: 'Midnight', value: 'dash-midnight', colorMode: 'dark'  },
  { label: 'Sunset',   value: 'dash-sunset',   colorMode: 'light' },
  { label: 'Forest',   value: 'dash-forest',   colorMode: 'dark'  },
];

const activeTheme = ref<string>(
  siteTheme.value === 'dark' ? 'dash-midnight' : 'dash-ocean',
);

// ── Shared dataset — every chart on the page reads from `monthly` ──────────
const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const tiers    = ['Premium', 'Pro', 'Standard', 'Basic', 'Trial'];

// One shared colorMap, one pin: every chart that names a "Premium" series or
// slice renders it in this exact gold. `options.colorMap` sits above the
// theme palette in the resolver priority chain, so this pin survives every
// theme switch the dashboard supports.
const PIN_COLOR_MAP = { Premium: '#FFD166' } as const;

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
    sparkData: [3.2, 3.1, 2.9, 2.8, 2.8, 2.6, 2.5, 2.4, 2.3, 2.3, 2.2, 2.1],
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
  switchTheme(activeTheme.value);

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
  // bar by its tier name — that's how the Premium bar still picks up the
  // pinned gold even though the only series is "Q4 revenue".
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
  // Premium appears as a sink node — pinned to gold via PIN_COLOR_MAP and
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
  // every tier on the same color — and Premium stays gold via colorMap.
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
watch(activeTheme, async (next) => {
  const meta = themeOptions.find((o) => o.value === next);
  if (meta && siteTheme.value !== meta.colorMode) {
    syncSiteTheme(meta.colorMode);
    await nextTick();
  }
  switchTheme(next);
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
}

/* ── Header ───────────────────────────────────────────────────────────── */
.dash-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
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
  margin-bottom: 24px;
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
  background: #FFD166;
  border: 1px solid rgba(0, 0, 0, 0.12);
  vertical-align: -1px;
  margin: 0 4px 0 2px;
}

/* ── KPI cards ────────────────────────────────────────────────────────── */
.dash-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 880px) {
  .dash-kpi-grid { grid-template-columns: 1fr; }
}
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
.dash-row {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}
.dash-row-8-4    { grid-template-columns: 2fr 1fr; }
.dash-row-three  { grid-template-columns: repeat(3, 1fr); }
.dash-row-1-1    { grid-template-columns: 1fr 1fr; }
.dash-row-5-4-3  { grid-template-columns: 5fr 4fr 3fr; }

@media (max-width: 1280px) {
  .dash-row-5-4-3 {
    grid-template-columns: 1fr 1fr;
  }
  .dash-row-5-4-3 > :nth-child(3) {
    grid-column: 1 / -1;
  }
}
@media (max-width: 1100px) {
  .dash-row-8-4,
  .dash-row-1-1 {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 880px) {
  .dash-row-three,
  .dash-row-5-4-3 {
    grid-template-columns: 1fr;
  }
  .dash-row-5-4-3 > :nth-child(3) {
    grid-column: auto;
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

.chart-box {
  height: 280px;
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
</style>
