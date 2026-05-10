<template>
  <SectionDivider>Line &amp; Area Charts</SectionDivider>
  <DemoGrid>

    <DemoCard ref="lineCard" title="Line Chart" tag='type="line"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'line', {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
}, { title: 'Monthly Financials' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="areaCard" title="Area Chart" tag='type="area"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'area', {
  categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  series: [{ name: 'Visits', data: [820,932,901,934,1290,1330,1520] }],
}, { title: 'Weekly Visits' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="stackedAreaCard" title="Stacked Area" tag="stacked: true">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'area', data, {
  stacked: true,
  title: 'Traffic Sources',
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="markCard" title="Line with Mark Lines" tag="markLines / markPoints">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'line', data, {
  series: {
    '*': {
      markLines: ['average'],
      markPoints: ['max', 'min'],
    },
  },
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="sparkCard" title="Spark Line" tag='variant="spark"' box-style="height: 80px;">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'line', data, { variant: 'spark' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="sparkAreaCard" title="Spark Area" tag='type="area" variant="spark"' box-style="height: 80px;">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'area', data, { variant: 'spark', series: { '*': { smooth: 0.6 } } });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="timeStrCard" title="Time Axis — Date Strings" tag="categories: ['2024-01-01', ...]">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'line', {
  categories: ['2024-01-01','2024-02-01','2024-03-01',...],
  series: [{ name: 'Revenue', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="timeTsCard" title="Time Axis — Unix Timestamps" tag="categories: [1704067200000, ...]">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'area', {
  categories: [/* 13-digit ms timestamps */],
  series: [{ name: 'Visits', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';
import { xyData } from './sharedData';

type CardRef = InstanceType<typeof DemoCard>;

const lineCard = ref<CardRef>();
const areaCard = ref<CardRef>();
const stackedAreaCard = ref<CardRef>();
const markCard = ref<CardRef>();
const sparkCard = ref<CardRef>();
const sparkAreaCard = ref<CardRef>();
const timeStrCard = ref<CardRef>();
const timeTsCard = ref<CardRef>();

const weekData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [{ name: 'Visits', data: [820, 932, 901, 934, 1290, 1330, 1520] }],
};

const trafficData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Direct', data: [320, 302, 301, 334, 390, 330, 320] },
    { name: 'Search', data: [120, 132, 101, 134, 90, 230, 210] },
    { name: 'Referral', data: [220, 182, 191, 234, 290, 330, 310] },
  ],
};

const sparkData = {
  categories: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  series: [{ name: 'Trend', data: [5, 8, 3, 12, 6, 9, 15, 7, 11, 4, 8, 13, 6, 10, 14, 3, 9, 7, 12, 8] }],
};

const timeStrData = {
  categories: ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'],
  series: [
    { name: 'Revenue', data: [820, 932, 901, 934, 1290, 1330] },
    { name: 'Expenses', data: [620, 732, 701, 734, 1090, 1130] },
  ],
};

const timeOrigin = Date.UTC(2024, 0, 1);
const timeTsData = {
  categories: Array.from({ length: 7 }, (_, i) => timeOrigin + i * 86400000),
  series: [{ name: 'Visits', data: [120, 145, 98, 167, 203, 180, 221] }],
};

// No manual cleanup needed — `IChart` installs a hidden sentinel custom
// element in each container; the browser's `disconnectedCallback` fires the
// moment Vue tears this view's DOM down, which auto-disposes every chart
// and removes its global-registry entry. See `src/disconnect-sentinel.ts`.
onMounted(() => {
  createChart(lineCard.value!.chartEl!, 'line', xyData, { title: 'Monthly Financials' });
  createChart(areaCard.value!.chartEl!, 'area', weekData, { title: 'Weekly Visits' });
  createChart(stackedAreaCard.value!.chartEl!, 'area', trafficData, {
    stacked: true,
    title: 'Traffic Sources',
  });
  createChart(markCard.value!.chartEl!, 'line', xyData, {
    title: 'With Mark Lines',
    series: { '*': { markLines: ['average'], markPoints: ['max', 'min'] } },
  });
  createChart(sparkCard.value!.chartEl!, 'line', sparkData, { variant: 'spark' });
  createChart(sparkAreaCard.value!.chartEl!, 'area', sparkData, {
    variant: 'spark',
    series: { '*': { smooth: 0.6 } },
  });
  createChart(timeStrCard.value!.chartEl!, 'line', timeStrData, {
    title: 'Monthly Revenue (Date Strings)',
    xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
    tooltip: { dateFormat: 'YYYY-MM-DD' },
  });
  createChart(timeTsCard.value!.chartEl!, 'area', timeTsData, {
    title: 'Daily Visits (Timestamps)',
    xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
    tooltip: { dateFormat: 'YYYY-MM-DD' },
  });
});
</script>
