<template>
  <SectionDivider>Gauge Charts</SectionDivider>
  <DemoGrid>

    <DemoCard ref="gaugeCard" title="Gauge" tag='type="gauge"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'gauge', {
  value: 72, max: 100, label: 'Score',
}, { title: 'Performance Score' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="gaugePctCard" title="Percentage Gauge" tag='variant="percentage"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'gauge', {
  value: 85, max: 100, label: 'CPU',
}, { title: 'CPU Usage', variant: 'percentage' });</pre>
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

const gaugeCard = ref<CardRef>();
const gaugePctCard = ref<CardRef>();

onMounted(() => {
  createChart(
    gaugeCard.value!.chartEl!,
    'gauge',
    { value: 72, max: 100, label: 'Score' },
    { title: 'Performance Score' },
  );
  createChart(
    gaugePctCard.value!.chartEl!,
    'gauge',
    { value: 85, max: 100, label: 'CPU' },
    { title: 'CPU Usage', variant: 'percentage' },
  );
});
</script>
