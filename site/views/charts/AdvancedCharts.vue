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

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';
import { pieData } from './sharedData';

type CardRef = InstanceType<typeof DemoCard>;

const mixedCard = ref<CardRef>();
const colorsCard = ref<CardRef>();

const mixedData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Revenue', data: [820, 932, 901, 934, 1290, 1330] },
    { name: 'Trend', data: [720, 832, 851, 884, 1100, 1230] },
  ],
};

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
});
</script>
