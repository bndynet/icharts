<template>
  <SectionDivider>Radar Charts</SectionDivider>
  <DemoGrid>

    <DemoCard ref="radarCard" title="Radar Chart" tag='type="radar"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'radar', {
  indicators: [
    { name: 'Sales',          max: 6500 },
    { name: 'Administration', max: 16000 },
    { name: 'IT',             max: 30000 },
    { name: 'Support',        max: 38000 },
    { name: 'Development',    max: 52000 },
    { name: 'Marketing',      max: 25000 },
  ],
  series: [
    { name: 'Allocated Budget', values: [4200, 3000, 20000, 35000, 50000, 18000] },
    { name: 'Actual Spending',  values: [5000, 14000, 28000, 26000, 42000, 21000] },
  ],
}, { title: 'Budget vs Spending' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="radarCircleCard" title="Circular Radar" tag='variant="circle"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'radar', radarData, {
  title: 'Player Skill Profile',
  variant: 'circle',
  filled: false,
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

const radarCard = ref<CardRef>();
const radarCircleCard = ref<CardRef>();

const radarData = {
  indicators: [
    { name: 'Sales', max: 6500 },
    { name: 'Administration', max: 16000 },
    { name: 'IT', max: 30000 },
    { name: 'Support', max: 38000 },
    { name: 'Development', max: 52000 },
    { name: 'Marketing', max: 25000 },
  ],
  series: [
    { name: 'Allocated Budget', values: [4200, 3000, 20000, 35000, 50000, 18000] },
    { name: 'Actual Spending', values: [5000, 14000, 28000, 26000, 42000, 21000] },
  ],
};

const radarSkillsData = {
  indicators: [
    { name: 'Speed', max: 100 },
    { name: 'Strength', max: 100 },
    { name: 'Agility', max: 100 },
    { name: 'Stamina', max: 100 },
    { name: 'Accuracy', max: 100 },
    { name: 'Strategy', max: 100 },
  ],
  series: [
    { name: 'Player A', values: [90, 70, 85, 80, 75, 65] },
    { name: 'Player B', values: [70, 90, 65, 75, 80, 85] },
    { name: 'Player C', values: [80, 75, 90, 70, 85, 78] },
  ],
};

onMounted(() => {
  createChart(radarCard.value!.chartEl!, 'radar', radarData, { title: 'Budget vs Spending' });
  createChart(radarCircleCard.value!.chartEl!, 'radar', radarSkillsData, {
    title: 'Player Skill Profile',
    variant: 'circle',
    filled: false,
  });
});
</script>
