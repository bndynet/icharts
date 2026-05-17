<template>
  <SectionDivider>Word Cloud</SectionDivider>
  <DemoGrid>
    <DemoCard ref="defaultCard" title="Word Cloud" tag='type="wordcloud"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'wordcloud', words);</pre>
      </template>
    </DemoCard>

    <DemoCard ref="diamondCard" title="Diamond" tag='variant="diamond"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'wordcloud', words, {
  variant: 'diamond',
});</pre>
      </template>
    </DemoCard>

    <DemoCard ref="posterCard" title="Poster" tag='variant="poster"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'wordcloud', words, {
  variant: 'poster',
});</pre>
      </template>
    </DemoCard>
  </DemoGrid>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { createChart } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const defaultCard = ref<CardRef>();
const diamondCard = ref<CardRef>();
const posterCard = ref<CardRef>();

const words = [
  { name: 'TypeScript', value: 130 },
  { name: 'Visualization', value: 120 },
  { name: 'Lit', value: 90 },
  { name: 'Web Components', value: 80 },
  { name: 'Dashboard', value: 75 },
  { name: 'Analytics', value: 72 },
  { name: 'Monitoring', value: 69 },
  { name: 'Theme', value: 65 },
  { name: 'Palette', value: 62 },
  { name: 'Tooltip', value: 55 },
  { name: 'Legend', value: 53 },
  { name: 'Adapter', value: 50 },
  { name: 'Registry', value: 45 },
  { name: 'ColorMap', value: 40 },
  { name: 'Data Pipeline', value: 38 },
  { name: 'Realtime', value: 35 },
  { name: 'Performance', value: 33 },
  { name: 'Accessibility', value: 30 },
];

onMounted(() => {
  createChart(defaultCard.value!.chartEl!, 'wordcloud', words);

  createChart(diamondCard.value!.chartEl!, 'wordcloud', words, {
    variant: 'diamond',
  });
  createChart(posterCard.value!.chartEl!, 'wordcloud', words, {
    variant: 'poster',
  });
});
</script>
