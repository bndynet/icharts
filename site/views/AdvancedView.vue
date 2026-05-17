<template>
  <SectionDivider>Advanced</SectionDivider>
  <DemoGrid>

    <DemoCard ref="mixedCard" title="Mixed Line + Bar" tag="series type override">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'line', data, {
  title: 'Revenue vs Trend',
  series: {
    'Revenue': { type: 'bar' },
    'Trend':   { smooth: true, lineStyle: 'dashed' },
  },
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="colorsCard" title="Custom Colors" tag="colorMap">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  colorMap: {
    'Chrome':  '#4285F4',
    'Firefox': '#FF7139',
    'Safari':  '#000000',
    'Edge':    '#0078D4',
  },
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="bgLegendCard" title="Rich Text Background Image" tag="legend.formatLabel + backgroundImage">
      <template #code>
        <pre v-pre class="code-block">import arrowUpUrl from '../assets/arrow-up.svg';
import arrowDownUrl from '../assets/arrow-down.svg';

createChart(el, 'line', data, {
  legend: {
    formatLabel: (name, index) =&gt; {
      const points = data.series[index].data;
      const last = points.at(-1) ?? 0;
      const prev = points.at(-2) ?? last;
      const arrow = last &gt;= prev ? arrowUpUrl : arrowDownUrl;
      return {
        segments: [
          { text: name, style: { padding: [0, 8, 0, 0] } },
          { text: String(last), style: { align: 'right', width: 40, padding: [0, 4, 0, 0] } },
          { text: ' ', style: { width: 14, height: 14, backgroundImage: arrow, verticalAlign: 'middle' } },
        ],
      };
    },
  },
});</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart } from '@bndynet/icharts';
import SectionDivider from '../components/SectionDivider.vue';
import DemoGrid from '../components/DemoGrid.vue';
import DemoCard from '../components/DemoCard.vue';
import { pieData } from './charts/sharedData';
import arrowUpUrl from '../assets/arrow-up.svg';
import arrowDownUrl from '../assets/arrow-down.svg';

type CardRef = InstanceType<typeof DemoCard>;

const mixedCard = ref<CardRef>();
const colorsCard = ref<CardRef>();
const bgLegendCard = ref<CardRef>();

const mixedData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Revenue', data: [820, 932, 901, 934, 1290, 1330] },
    { name: 'Trend', data: [720, 832, 851, 884, 1100, 1230] },
  ],
};

const richLabelData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Visits', data: [210, 240, 280, 260, 320, 360, 390] },
    { name: 'Orders', data: [80, 95, 120, 110, 150, 170, 160] },
  ],
};

// Auto-disposed on unmount via the sentinel installed inside each chart's
// container — see `LineAreaCharts.vue` for the full note.
onMounted(() => {
  createChart(mixedCard.value!.chartEl!, 'line', mixedData, {
    title: 'Revenue vs Trend',
    series: {
      Revenue: { type: 'bar' },
      Trend: { smooth: true, lineStyle: 'dashed' },
    },
  });
  createChart(colorsCard.value!.chartEl!, 'pie', pieData, {
    colorMap: { Chrome: '#4285F4', Firefox: '#FF7139', Safari: '#000000', Edge: '#0078D4' },
  });
  createChart(bgLegendCard.value!.chartEl!, 'line', richLabelData, {
    title: 'Legend Trend Arrow via backgroundImage',
    legend: {
      formatLabel: (name, index) => {
        const points = richLabelData.series[index]?.data ?? [];
        const last = points.at(-1) ?? 0;
        const prev = points.at(-2) ?? last;
        const arrow = last >= prev ? arrowUpUrl : arrowDownUrl;
        return {
          segments: [
            { text: name, style: { padding: [0, 8, 0, 0] } },
            {
              text: String(last),
              style: { align: 'right', width: 40, padding: [0, 4, 0, 0] },
            },
            {
              text: ' ',
              style: {
                width: 14,
                height: 14,
                backgroundImage: arrow,
                verticalAlign: 'middle',
              },
            },
          ],
        };
      },
    },
  });
});
</script>
