<template>
  <SectionDivider>Liquid Progress Charts</SectionDivider>
  <div class="liquid-grid">
    <DemoGrid>
      <DemoCard
        ref="storageCard"
        title="Storage"
        tag='type="liquidprogress"'
        :box-style="{ height: '220px' }"
      />
      <DemoCard
        ref="cpuCard"
        title="CPU"
        tag='type="liquidprogress"'
        :box-style="{ height: '220px' }"
      />
      <DemoCard
        ref="memoryCard"
        title="Memory"
        tag='type="liquidprogress"'
        :box-style="{ height: '220px' }"
      />
      <DemoCard
        ref="networkCard"
        title="Network"
        tag='type="liquidprogress"'
        :box-style="{ height: '220px' }"
      >
        <template #code>
          <pre v-pre class="code-block">const chart = createChart(el, 'liquidprogress', {
  value: 72, max: 100, label: 'Storage',
}, { colors: ['#22c55e'] });</pre>
        </template>
      </DemoCard>
    </DemoGrid>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createChart, type IChartInstance } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const storageCard = ref<CardRef>();
const cpuCard = ref<CardRef>();
const memoryCard = ref<CardRef>();
const networkCard = ref<CardRef>();

let storageChart: IChartInstance | null = null;
let cpuChart: IChartInstance | null = null;
let memoryChart: IChartInstance | null = null;
let networkChart: IChartInstance | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

onMounted(() => {
  let storage = 72;
  let cpu = 64;
  let memory = 58;
  let network = 80;

  storageChart = createChart(
    storageCard.value!.chartEl!,
    'liquidprogress',
    { value: storage, max: 100, label: 'Storage' },
    { colors: ['#22c55e'] },
  );
  cpuChart = createChart(
    cpuCard.value!.chartEl!,
    'liquidprogress',
    { value: cpu, max: 100, label: 'CPU' },
    { colors: ['#3b82f6'] },
  );
  memoryChart = createChart(
    memoryCard.value!.chartEl!,
    'liquidprogress',
    { value: memory, max: 100, label: 'Memory' },
    { colors: ['#f59e0b'] },
  );
  networkChart = createChart(
    networkCard.value!.chartEl!,
    'liquidprogress',
    { value: network, max: 100, label: 'Network' },
    { colors: ['#a855f7'] },
  );

  timer = setInterval(() => {
    storage = Math.round(clamp(8, 98, storage + (Math.random() - 0.5) * 10));
    // Make CPU jumps more noticeable than other cards.
    cpu = Math.round(clamp(8, 98, cpu + (Math.random() - 0.5) * 18));
    memory = Math.round(clamp(8, 98, memory + (Math.random() - 0.5) * 7));
    network = Math.round(clamp(8, 98, network + (Math.random() - 0.5) * 9));
    storageChart?.update({ value: storage });
    cpuChart?.update({ value: cpu });
    memoryChart?.update({ value: memory });
    networkChart?.update({ value: network });
  }, 800);
});

onUnmounted(() => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<style scoped>
/* Override DemoGrid minmax(480px) so all four cards stay on one row. */
.liquid-grid :deep(.demo-grid) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
</style>
