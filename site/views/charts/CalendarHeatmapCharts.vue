<template>
  <SectionDivider>Calendar Heatmap</SectionDivider>
  <DemoGrid>

    <DemoCard
      ref="defaultCard"
      title="Default — yearly activity"
      tag='type="calendarheatmap"'
      card-style="grid-column: 1 / -1;"
      box-style="height: 300px;"
    >
      <template #code>
        <pre v-pre class="code-block">// One cell per day, colored by value — a GitHub-contribution-style
// grid. `date` is 'YYYY-MM-DD'; missing days render as empty cells.
createChart(el, 'calendarheatmap', activity2024, {
  title: 'Commit Activity 2024',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="rangeCard"
      title="Cross-year range"
      tag="range + colors"
      card-style="grid-column: 1 / -1;"
      box-style="height: 300px;"
    >
      <template #code>
        <pre v-pre class="code-block">// A range crossing a year boundary renders the months in sequence
// and labels the year as "2024-2025".
createChart(el, 'calendarheatmap', crossYearActivity, {
  title: 'Rolling 12 Months',
  range: ['2024-10-01', '2025-09-30'],
  colors: ['#10b981'],
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="customTooltipCard"
      title="Custom tooltip"
      tag="tooltip.customHtml"
      card-style="grid-column: 1 / -1;"
      box-style="height: 300px;"
    >
      <template #code>
        <pre v-pre class="code-block">// customHtml receives ctx.kind === 'item' with `name` (the date),
// `value`, and the painted `color`.
createChart(el, 'calendarheatmap', activity2024, {
  title: 'Commit Activity 2024',
  tooltip: {
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      return `&lt;strong&gt;${ctx.name}&lt;/strong&gt; — ${ctx.value} commits`;
    },
  },
});</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart, type CalendarHeatmapData } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const defaultCard = ref<CardRef>();
const rangeCard = ref<CardRef>();
const customTooltipCard = ref<CardRef>();

/** Deterministic pseudo-random activity over an explicit [start, end] span. */
function buildRangeActivity(
  startISO: string,
  endISO: string,
): CalendarHeatmapData {
  const data: CalendarHeatmapData = [];
  const start = Date.parse(`${startISO}T00:00:00Z`);
  const end = Date.parse(`${endISO}T00:00:00Z`);
  let i = 0;
  for (let t = start; t <= end; t += 86_400_000, i += 1) {
    const date = new Date(t).toISOString().slice(0, 10);
    const noise = Math.sin(i * 12.9898) * 43_758.5453;
    const raw = Math.floor((noise - Math.floor(noise)) * 24);
    const value = Math.max(0, raw - (i % 7 === 0 ? 8 : 0));
    data.push({ date, value });
  }
  return data;
}

/** A full year, expressed as a [start, end] span. */
function buildYearActivity(year: number): CalendarHeatmapData {
  return buildRangeActivity(`${year}-01-01`, `${year}-12-31`);
}

const activity2024 = buildYearActivity(2024);
const crossYearActivity = buildRangeActivity('2024-10-01', '2025-09-30');

onMounted(() => {
  createChart(defaultCard.value!.chartEl!, 'calendarheatmap', activity2024, {
    title: 'Commit Activity 2024',
  });
  createChart(rangeCard.value!.chartEl!, 'calendarheatmap', crossYearActivity, {
    title: 'Rolling 12 Months',
    range: ['2024-10-01', '2025-09-30'],
    colors: ['#10b981'],
  });
  createChart(customTooltipCard.value!.chartEl!, 'calendarheatmap', activity2024, {
    title: 'Commit Activity 2024',
    tooltip: {
      customHtml: async (ctx) => {
        if (ctx.kind !== 'item') return '';
        return `<strong>${ctx.name}</strong> — ${ctx.value} commits`;
      },
    },
  });
});
</script>
