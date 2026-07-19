<template>
  <SectionDivider>Heatmap</SectionDivider>
  <DemoGrid>

    <DemoCard
      ref="defaultCard"
      title="Default — weekly activity"
      tag='type="heatmap"'
      card-style="grid-column: 1 / -1;"
      box-style="height: 440px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Grid of cells over two category axes. `x`/`y` are 0-based indices
// (or the category label itself); `value` drives the visualMap color.
createChart(el, 'heatmap', {
  xCategories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  yCategories: ['Morning', 'Afternoon', 'Evening'],
  data: [
    { x: 0, y: 0, value: 12 }, { x: 1, y: 0, value:  8 },
    { x: 2, y: 0, value: 25 }, { x: 3, y: 0, value: 16 },
    { x: 4, y: 0, value: 10 }, { x: 0, y: 1, value:  4 },
    { x: 1, y: 1, value: 30 }, { x: 2, y: 1, value: 22 },
    { x: 3, y: 1, value: 13 }, { x: 4, y: 1, value: 19 },
    { x: 0, y: 2, value:  2 }, { x: 1, y: 2, value: 14 },
    { x: 2, y: 2, value: 28 }, { x: 3, y: 2, value: 17 },
    { x: 4, y: 2, value: 21 },
  ],
}, {
  title: 'Weekly Activity',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="labelsCard"
      title="Cell labels + horizontal scale"
      tag="showCellLabel + visualMap.orient"
      card-style="grid-column: 1 / -1;"
      box-style="height: 440px;"
    >
      <template #code>
        <pre v-pre class="code-block">// showCellLabel draws each value inside its cell. The color legend
// defaults to vertical on the right — switch it to a horizontal bar
// at the bottom with `visualMap.orient: 'horizontal'`.
createChart(el, 'heatmap', activityData, {
  title: 'Activity (labelled)',
  showCellLabel: true,
  visualMap: { orient: 'horizontal' },
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="customTooltipCard"
      title="Custom tooltip + colors"
      tag="tooltip.customHtml + colors"
      card-style="grid-column: 1 / -1;"
      box-style="height: 440px;"
    >
      <template #code>
        <pre v-pre class="code-block">// The base ramp color comes from the normal color pipeline
// (colors / colorMap / theme). `customHtml` receives an item ctx
// with `name` ("x × y"), `value`, and the painted `color`.
createChart(el, 'heatmap', activityData, {
  title: 'Weekly Activity',
  colors: ['#0ea5e9'],
  tooltip: {
    formatValue: (v) => `${v} events`,
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      return `&lt;div style="display:flex;align-items:center;gap:8px"&gt;
        &lt;span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ctx.color}"&gt;&lt;/span&gt;
        &lt;strong&gt;${ctx.name}&lt;/strong&gt; — ${ctx.value} events
      &lt;/div&gt;`;
    },
  },
});</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart, type HeatmapData } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const defaultCard = ref<CardRef>();
const labelsCard = ref<CardRef>();
const customTooltipCard = ref<CardRef>();

const activityData: HeatmapData = {
  xCategories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  yCategories: ['Morning', 'Afternoon', 'Evening'],
  data: [
    { x: 0, y: 0, value: 12 }, { x: 1, y: 0, value: 8 },
    { x: 2, y: 0, value: 25 }, { x: 3, y: 0, value: 16 },
    { x: 4, y: 0, value: 10 }, { x: 0, y: 1, value: 4 },
    { x: 1, y: 1, value: 30 }, { x: 2, y: 1, value: 22 },
    { x: 3, y: 1, value: 13 }, { x: 4, y: 1, value: 19 },
    { x: 0, y: 2, value: 2 },  { x: 1, y: 2, value: 14 },
    { x: 2, y: 2, value: 28 }, { x: 3, y: 2, value: 17 },
    { x: 4, y: 2, value: 21 },
  ],
};

onMounted(() => {
  createChart(defaultCard.value!.chartEl!, 'heatmap', activityData, {
    title: 'Weekly Activity',
  });
  createChart(labelsCard.value!.chartEl!, 'heatmap', activityData, {
    title: 'Activity (labelled)',
    showCellLabel: true,
    visualMap: { orient: 'horizontal' },
  });
  createChart(customTooltipCard.value!.chartEl!, 'heatmap', activityData, {
    title: 'Weekly Activity',
    colors: ['#0ea5e9'],
    tooltip: {
      formatValue: (v) => `${v} events`,
      customHtml: async (ctx) => {
        if (ctx.kind !== 'item') return '';
        return `<div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ctx.color ?? '#888'}"></span>
          <strong>${ctx.name}</strong> — ${ctx.value} events
        </div>`;
      },
    },
  });
});
</script>
