<template>
  <SectionDivider>Gauge Charts</SectionDivider>
  <DemoGrid>

    <DemoCard ref="gaugeCard" title="Gauge (live)" tag='type="gauge" · live'>
      <template #code>
        <pre v-pre class="code-block">const chart = createChart(el, 'gauge', {
  value: 72, max: 100, label: 'Score',
}, { title: 'Performance Score' });

let value = 72;
setInterval(() => {
  value = Math.round(Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 8)));
  // Omitted max/label reuse the previous frame; pass '' to clear label.
  chart.update({ value });
}, 800);</pre>
      </template>
    </DemoCard>

    <DemoCard ref="gaugePctCard" title="Percentage Gauge (live)" tag='variant="percentage" · live'>
      <template #code>
        <pre v-pre class="code-block">const chart = createChart(el, 'gauge', {
  value: 85, max: 100, label: 'CPU',
}, { title: 'CPU Usage', variant: 'percentage' });

let cpu = 85;
setInterval(() => {
  cpu = Math.round(Math.max(5, Math.min(98, cpu + (Math.random() - 0.5) * 6)));
  chart.update({ value: cpu });
}, 600);</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createChart, type IChartInstance } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const gaugeCard = ref<CardRef>();
const gaugePctCard = ref<CardRef>();

const TICK_MS = 700;

let gaugeChart: IChartInstance | null = null;
let pctChart: IChartInstance | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

// Auto-disposed on unmount via the sentinel installed inside each chart's
// container — see `LineAreaCharts.vue` for the full note.
onMounted(() => {
  let score = 72;
  let cpu = 85;

  gaugeChart = createChart(
    gaugeCard.value!.chartEl!,
    'gauge',
    { value: score, max: 100, label: 'Score' },
    { title: 'Performance Score' },
  );
  pctChart = createChart(
    gaugePctCard.value!.chartEl!,
    'gauge',
    { value: cpu, max: 100, label: 'CPU' },
    { title: 'CPU Usage', variant: 'percentage' },
  );

  timer = setInterval(() => {
    score = Math.round(clamp(0, 100, score + (Math.random() - 0.5) * 8));
    cpu = Math.round(clamp(5, 98, cpu + (Math.random() - 0.5) * 6));
    gaugeChart?.update({ value: score });
    pctChart?.update({ value: cpu });
  }, TICK_MS);
});

onUnmounted(() => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
});
</script>
