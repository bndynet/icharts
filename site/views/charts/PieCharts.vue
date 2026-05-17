<template>
  <SectionDivider>Pie Charts</SectionDivider>
  <DemoGrid>

    <DemoCard ref="pieCard" title="Pie Chart" tag='type="pie"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'pie', [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
], { title: 'Browser Market Share' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="doughnutCard" title="Doughnut" tag='variant="doughnut"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  variant: 'doughnut',
  legend: { show: true, position: 'right' },
  centerLabels: [
    `${pieData.reduce((sum, item) => sum + item.value, 0)}`,
    'Total',
  ],
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="roseCard" title="Nightingale Rose" tag='variant="nightingale"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  variant: 'nightingale',
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

const pieCard = ref<CardRef>();
const doughnutCard = ref<CardRef>();
const roseCard = ref<CardRef>();

// Auto-disposed on unmount via the sentinel installed inside each chart's
// container — see `LineAreaCharts.vue` for the full note.
onMounted(() => {
  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  createChart(pieCard.value!.chartEl!, 'pie', pieData, { title: 'Browser Market Share' });
  createChart(doughnutCard.value!.chartEl!, 'pie', pieData, {
    title: 'Browser Market Share',
    variant: 'doughnut',
    legend: { show: true, position: 'right' },
    centerLabels: [`${total}`, 'TOTAL'],
  });
  createChart(roseCard.value!.chartEl!, 'pie', pieData, {
    title: 'Nightingale Rose',
    variant: 'nightingale',
  });
});
</script>
