<template>
  <SectionDivider>
    Web Component
    <template #extra>
      <el-tag size="small" type="info" style="margin-left: 8px;">&lt;i-chart&gt;</el-tag>
    </template>
  </SectionDivider>

  <el-alert
    description="Drop <i-chart> directly into HTML and bind .data / .options via JS property assignment."
    type="info"
    show-icon
    :closable="false"
    style="margin-bottom: 16px;"
  />

  <DemoGrid>

    <DemoCard title="Line Chart" tag='&lt;i-chart type="line"&gt;'>
      <i-chart ref="wcLineEl" type="line"></i-chart>
      <template #code>
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
      </template>
    </DemoCard>

    <DemoCard title="Doughnut Chart" tag='&lt;i-chart type="pie"&gt;'>
      <i-chart ref="wcPieEl" type="pie"></i-chart>
      <template #code>
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
      </template>
    </DemoCard>

    <DemoCard title="Live Update">
      <template #tag>
        <el-button size="small" type="primary" @click="onWcRefresh">Refresh Data</el-button>
      </template>
      <i-chart ref="wcLiveEl" type="bar"></i-chart>
      <template #code>
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
      </template>
    </DemoCard>

    <DemoCard title="Gauge" tag='&lt;i-chart type="gauge"&gt;'>
      <i-chart ref="wcGaugeEl" type="gauge"></i-chart>
      <template #code>
        <pre v-pre class="code-block">&lt;i-chart id="myChart" type="gauge"&gt;&lt;/i-chart&gt;

&lt;script&gt;
const chart = document.getElementById('myChart');
chart.data = { value: 72, max: 100, label: 'Score' };
chart.options = { title: 'Performance Score', variant: 'percentage' };
&lt;/script&gt;</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';
import { xyData, pieData } from './sharedData';

// Web component refs (typed as any since i-chart is a custom element)
const wcLineEl = ref();
const wcPieEl = ref();
const wcLiveEl = ref();
const wcGaugeEl = ref();

function randomBarData() {
  return Array.from({ length: 4 }, () => Math.round(Math.random() * 500 + 100));
}

function onWcRefresh() {
  if (wcLiveEl.value) {
    wcLiveEl.value.data = {
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [
        { name: 'Product A', data: randomBarData() },
        { name: 'Product B', data: randomBarData() },
      ],
    };
  }
}

onMounted(() => {
  if (wcLineEl.value) {
    wcLineEl.value.data = xyData;
    wcLineEl.value.options = { title: 'Monthly Financials' };
  }
  if (wcPieEl.value) {
    wcPieEl.value.data = pieData;
    wcPieEl.value.options = {
      title: 'Browser Market Share',
      variant: 'doughnut',
      legend: { show: true, position: 'right' },
    };
  }
  if (wcLiveEl.value) {
    wcLiveEl.value.data = {
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [
        { name: 'Product A', data: randomBarData() },
        { name: 'Product B', data: randomBarData() },
      ],
    };
    wcLiveEl.value.options = { title: 'Quarterly Sales' };
  }
  if (wcGaugeEl.value) {
    wcGaugeEl.value.data = { value: 72, max: 100, label: 'Score' };
    wcGaugeEl.value.options = { title: 'Performance Score', variant: 'percentage' };
  }
});
</script>
