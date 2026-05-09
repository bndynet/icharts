<template>
  <SectionDivider>Bar Charts</SectionDivider>
  <DemoGrid>

    <DemoCard ref="barCard" title="Bar Chart" tag='type="bar"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'bar', {
  categories: ['Q1','Q2','Q3','Q4'],
  series: [
    { name: 'Product A', data: [430,460,390,510] },
    { name: 'Product B', data: [320,382,301,354] },
  ],
}, { title: 'Quarterly Sales' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="stackedBarCard" title="Stacked Bar" tag="stacked: true">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'bar', data, {
  stacked: true,
  title: 'Stacked Revenue',
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="hbarCard" title="Horizontal Bar" tag='variant="horizontal"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'bar', data, {
  variant: 'horizontal',
  title: 'Browser Share',
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="colorByCategoryCard" title="Distinct Colors per Category" tag="colorByCategory">
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'bar', {
  categories: ['Chrome', 'Firefox', 'Safari', 'Edge'],
  series: [{ name: 'Share', data: [65, 15, 12, 8] }],
}, {
  title: 'Browser Share',
  colorByCategory: true,
  colorMap: {
    Chrome:  '#4285F4',
    Firefox: '#FF7139',
    Safari:  '#1B88CA',
    Edge:    '#0078D7',
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

type CardRef = InstanceType<typeof DemoCard>;

const barCard = ref<CardRef>();
const stackedBarCard = ref<CardRef>();
const hbarCard = ref<CardRef>();
const colorByCategoryCard = ref<CardRef>();

const barData = {
  categories: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [
    { name: 'Product A', data: [430, 460, 390, 510] },
    { name: 'Product B', data: [320, 382, 301, 354] },
  ],
};

const hbarData = {
  categories: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'],
  series: [{ name: 'Share %', data: [65, 15, 12, 5, 3] }],
};

onMounted(() => {
  createChart(barCard.value!.chartEl!, 'bar', barData, { title: 'Quarterly Sales' });
  createChart(stackedBarCard.value!.chartEl!, 'bar', barData, { stacked: true, title: 'Stacked Revenue' });
  createChart(hbarCard.value!.chartEl!, 'bar', hbarData, { variant: 'horizontal', title: 'Browser Share' });
  createChart(
    colorByCategoryCard.value!.chartEl!,
    'bar',
    {
      categories: ['Chrome', 'Firefox', 'Safari', 'Edge'],
      series: [{ name: 'Share', data: [65, 15, 12, 8] }],
    },
    {
      title: 'Browser Share',
      colorByCategory: true,
      colorMap: {
        Chrome: '#4285F4',
        Firefox: '#FF7139',
        Safari: '#1B88CA',
        Edge: '#0078D7',
      },
    },
  );
});
</script>
