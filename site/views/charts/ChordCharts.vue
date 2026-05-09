<template>
  <SectionDivider>Chord Charts</SectionDivider>
  <DemoGrid>

    <DemoCard
      ref="chordCard"
      title="Team Collaboration"
      tag='type="chord"'
      card-style="grid-column: 1 / -1;"
      box-style="height: 480px;"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'chord', chordData, {
  title: 'Team Collaboration',
  tooltip: { formatValue: (v) => v + ' interactions' },
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

const chordCard = ref<CardRef>();

const chordData = {
  nodes: [
    { name: 'Frontend' }, { name: 'Backend' },
    { name: 'Design' }, { name: 'QA' },
    { name: 'DevOps' }, { name: 'Product' },
  ],
  links: [
    { source: 'Frontend', target: 'Backend', value: 42 },
    { source: 'Frontend', target: 'Design', value: 35 },
    { source: 'Frontend', target: 'QA', value: 28 },
    { source: 'Backend', target: 'DevOps', value: 30 },
    { source: 'Backend', target: 'QA', value: 25 },
    { source: 'Design', target: 'Product', value: 40 },
    { source: 'QA', target: 'DevOps', value: 18 },
    { source: 'Product', target: 'Frontend', value: 22 },
    { source: 'Product', target: 'Backend', value: 20 },
  ],
};

onMounted(() => {
  createChart(chordCard.value!.chartEl!, 'chord', chordData, {
    title: 'Team Collaboration',
    tooltip: { formatValue: (v: number) => v + ' interactions' },
  });
});
</script>
