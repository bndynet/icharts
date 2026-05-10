<template>
  <SectionDivider>Sankey Charts</SectionDivider>
  <DemoGrid>

    <DemoCard ref="sankeyCard" title="Energy Flow" tag='type="sankey"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'sankey', {
  nodes: [{ name: 'Coal' }, { name: 'Solar' }, ...],
  links: [{ source: 'Coal', target: 'Electricity', value: 120 }, ...],
}, { title: 'Energy Flow' });</pre>
      </template>
    </DemoCard>

    <DemoCard ref="sankeyVerticalCard" title="User Journey" tag='variant="vertical"'>
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'sankey', data, {
  title: 'User Journey',
  variant: 'vertical',
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

const sankeyCard = ref<CardRef>();
const sankeyVerticalCard = ref<CardRef>();

const sankeyData = {
  nodes: [
    { name: 'Coal' }, { name: 'Natural Gas' }, { name: 'Solar' },
    { name: 'Electricity' }, { name: 'Heat' },
    { name: 'Industry' }, { name: 'Residential' }, { name: 'Transport' },
  ],
  links: [
    { source: 'Coal', target: 'Electricity', value: 120 },
    { source: 'Coal', target: 'Heat', value: 60 },
    { source: 'Natural Gas', target: 'Electricity', value: 80 },
    { source: 'Natural Gas', target: 'Heat', value: 90 },
    { source: 'Solar', target: 'Electricity', value: 50 },
    { source: 'Electricity', target: 'Industry', value: 130 },
    { source: 'Electricity', target: 'Residential', value: 80 },
    { source: 'Electricity', target: 'Transport', value: 40 },
    { source: 'Heat', target: 'Industry', value: 70 },
    { source: 'Heat', target: 'Residential', value: 80 },
  ],
};

const sankeyJourneyData = {
  nodes: [
    { name: 'Landing Page' }, { name: 'Pricing' }, { name: 'Blog' },
    { name: 'Sign Up' }, { name: 'Trial' },
    { name: 'Converted' }, { name: 'Churned' },
  ],
  links: [
    { source: 'Landing Page', target: 'Pricing', value: 800 },
    { source: 'Landing Page', target: 'Blog', value: 400 },
    { source: 'Pricing', target: 'Sign Up', value: 500 },
    { source: 'Blog', target: 'Sign Up', value: 200 },
    { source: 'Sign Up', target: 'Trial', value: 600 },
    { source: 'Trial', target: 'Converted', value: 380 },
    { source: 'Trial', target: 'Churned', value: 220 },
  ],
};

// Auto-disposed on unmount via the sentinel installed inside each chart's
// container — see `LineAreaCharts.vue` for the full note.
onMounted(() => {
  createChart(sankeyCard.value!.chartEl!, 'sankey', sankeyData, { title: 'Energy Flow' });
  createChart(sankeyVerticalCard.value!.chartEl!, 'sankey', sankeyJourneyData, {
    title: 'User Journey',
    variant: 'vertical',
  });
});
</script>
