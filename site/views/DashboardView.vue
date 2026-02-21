<template>
  <div style="max-width:1400px;margin:0 auto;">

    <el-alert
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom:24px;"
    >
      <template #default>
        Enabled via
        <el-tag size="small" type="info" effect="plain" style="margin:0 4px;">
          configure({ consistentColors: true })
        </el-tag>
        — all charts sharing a series name display the same color automatically.
      </template>
    </el-alert>

    <!-- ── Section 1 ──────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">
        Revenue by Product Line — Multiple Views
      </el-text>
    </el-divider>
    <el-text type="info" size="small" tag="p" style="margin-bottom:16px;">
      Five product lines (<strong>Alpha, Beta, Gamma, Delta, Epsilon</strong>) appear across every chart.
      Because <el-tag size="small" type="info" effect="plain">consistentColors</el-tag> is on,
      each product always keeps its assigned color.
    </el-text>

    <div class="dash-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Monthly Revenue Trend</span>
            <el-tag type="info" size="small" effect="plain">line</el-tag>
          </div>
        </template>
        <div ref="chartLineEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Cumulative Revenue</span>
            <el-tag type="info" size="small" effect="plain">area (stacked)</el-tag>
          </div>
        </template>
        <div ref="chartAreaEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Quarterly Totals</span>
            <el-tag type="info" size="small" effect="plain">bar</el-tag>
          </div>
        </template>
        <div ref="chartBarEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Quarterly Breakdown</span>
            <el-tag type="info" size="small" effect="plain">bar (stacked)</el-tag>
          </div>
        </template>
        <div ref="chartStackedBarEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Annual Revenue Share</span>
            <el-tag type="info" size="small" effect="plain">pie</el-tag>
          </div>
        </template>
        <div ref="chartPieEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Revenue Distribution</span>
            <el-tag type="info" size="small" effect="plain">pie (doughnut)</el-tag>
          </div>
        </template>
        <div ref="chartDoughnutEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Revenue vs Growth Rate</span>
            <el-tag type="info" size="small" effect="plain">line + bar mixed</el-tag>
          </div>
        </template>
        <div ref="chartMixedEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Q4 Revenue Ranking</span>
            <el-tag type="info" size="small" effect="plain">bar (horizontal)</el-tag>
          </div>
        </template>
        <div ref="chartHbarEl" class="chart-box"></div>
      </el-card>

    </div>

    <!-- ── Section 2 ──────────────────────────────────────────── -->
    <el-divider content-position="left">
      <el-text type="info" size="small" style="font-weight:600;letter-spacing:.06em;text-transform:uppercase;">
        Subset Charts — Colors Stay Consistent
      </el-text>
    </el-divider>
    <el-text type="info" size="small" tag="p" style="margin-bottom:16px;">
      Even when a chart shows only 2 or 3 of the 5 products, each product retains its global color.
    </el-text>

    <div class="dash-grid">

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Alpha vs Gamma</span>
            <el-tag type="info" size="small" effect="plain">line (subset)</el-tag>
          </div>
        </template>
        <div ref="chartSubsetLineEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Beta + Delta + Epsilon</span>
            <el-tag type="info" size="small" effect="plain">pie (subset)</el-tag>
          </div>
        </template>
        <div ref="chartSubsetPieEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Delta vs Epsilon</span>
            <el-tag type="info" size="small" effect="plain">bar (subset)</el-tag>
          </div>
        </template>
        <div ref="chartSubsetBarEl" class="chart-box"></div>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="card-head">
            <span>Alpha + Beta + Delta</span>
            <el-tag type="info" size="small" effect="plain">area (subset)</el-tag>
          </div>
        </template>
        <div ref="chartSubsetAreaEl" class="chart-box"></div>
      </el-card>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createChart, configure, switchTheme } from '@bndynet/icharts'
import { appTheme } from '../useAppTheme'

// ── Template refs ────────────────────────────────────────────────────────────
const chartLineEl        = ref<HTMLElement>()
const chartAreaEl        = ref<HTMLElement>()
const chartBarEl         = ref<HTMLElement>()
const chartStackedBarEl  = ref<HTMLElement>()
const chartPieEl         = ref<HTMLElement>()
const chartDoughnutEl    = ref<HTMLElement>()
const chartMixedEl       = ref<HTMLElement>()
const chartHbarEl        = ref<HTMLElement>()
const chartSubsetLineEl  = ref<HTMLElement>()
const chartSubsetPieEl   = ref<HTMLElement>()
const chartSubsetBarEl   = ref<HTMLElement>()
const chartSubsetAreaEl  = ref<HTMLElement>()

// ── Dataset ──────────────────────────────────────────────────────────────────
const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

const monthly: Record<string, number[]> = {
  Alpha:   [180,210,195,240,260,275,290,310,305,330,350,380],
  Beta:    [120,135,140,155,160,170,185,190,200,215,225,240],
  Gamma:   [ 90, 95,100,110,115,125,130,140,145,155,160,175],
  Delta:   [ 60, 70, 65, 75, 80, 85, 95,100,105,110,120,130],
  Epsilon: [ 40, 45, 50, 55, 58, 62, 68, 72, 78, 82, 88, 95],
}

function quarterSum(data: number[]): number[] {
  return [
    data.slice(0, 3).reduce((a, b) => a + b, 0),
    data.slice(3, 6).reduce((a, b) => a + b, 0),
    data.slice(6, 9).reduce((a, b) => a + b, 0),
    data.slice(9, 12).reduce((a, b) => a + b, 0),
  ]
}

function yearTotal(data: number[]): number {
  return data.reduce((a, b) => a + b, 0)
}

const products = Object.keys(monthly)

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  configure({ consistentColors: true })

  const monthlyLineData = {
    categories: months,
    series: products.map(name => ({ name, data: monthly[name] })),
  }
  const quarterlyBarData = {
    categories: quarters,
    series: products.map(name => ({ name, data: quarterSum(monthly[name]) })),
  }
  const pieData = products.map(name => ({ name, value: yearTotal(monthly[name]) }))

  createChart(chartLineEl.value!, 'line', monthlyLineData, { title: 'Monthly Revenue by Product' })
  createChart(chartAreaEl.value!, 'area', monthlyLineData, { stacked: true, title: 'Cumulative Revenue' })
  createChart(chartBarEl.value!, 'bar', quarterlyBarData, { title: 'Quarterly Revenue' })
  createChart(chartStackedBarEl.value!, 'bar', quarterlyBarData, { stacked: true, title: 'Quarterly Breakdown' })
  createChart(chartPieEl.value!, 'pie', pieData, { title: 'Annual Revenue Share' })
  createChart(chartDoughnutEl.value!, 'pie', pieData, {
    title: 'Revenue Distribution',
    variant: 'doughnut',
    legend: { show: true, position: 'right' },
  })
  createChart(chartMixedEl.value!, 'line', {
    categories: quarters,
    series: [
      { name: 'Alpha', data: quarterSum(monthly.Alpha) },
      { name: 'Beta',  data: quarterSum(monthly.Beta)  },
    ],
  }, {
    title: 'Alpha vs Beta (Quarterly)',
    series: { Alpha: { type: 'bar' }, Beta: { type: 'bar' } },
  })
  createChart(chartHbarEl.value!, 'bar', {
    categories: products,
    series: [{ name: 'Q4 Revenue', data: products.map(p => quarterSum(monthly[p])[3]) }],
  }, { variant: 'horizontal', title: 'Q4 Revenue Ranking' })

  // Subset charts
  createChart(chartSubsetLineEl.value!, 'line', {
    categories: months,
    series: [
      { name: 'Alpha', data: monthly.Alpha },
      { name: 'Gamma', data: monthly.Gamma },
    ],
  }, { title: 'Alpha vs Gamma — Monthly' })

  createChart(chartSubsetPieEl.value!, 'pie', [
    { name: 'Beta',    value: yearTotal(monthly.Beta)    },
    { name: 'Delta',   value: yearTotal(monthly.Delta)   },
    { name: 'Epsilon', value: yearTotal(monthly.Epsilon) },
  ], { title: 'Beta + Delta + Epsilon', variant: 'doughnut' })

  createChart(chartSubsetBarEl.value!, 'bar', {
    categories: quarters,
    series: [
      { name: 'Delta',   data: quarterSum(monthly.Delta)   },
      { name: 'Epsilon', data: quarterSum(monthly.Epsilon) },
    ],
  }, { title: 'Delta vs Epsilon — Quarterly' })

  createChart(chartSubsetAreaEl.value!, 'area', {
    categories: months,
    series: [
      { name: 'Alpha', data: monthly.Alpha },
      { name: 'Beta',  data: monthly.Beta  },
      { name: 'Delta', data: monthly.Delta },
    ],
  }, { stacked: true, title: 'Alpha + Beta + Delta' })

  // Apply the currently active theme to all freshly created charts.
  switchTheme(appTheme.value)
})

onUnmounted(() => {
  configure({ consistentColors: false })
})
</script>

<style scoped>
.dash-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-box {
  height: 340px;
}
</style>
