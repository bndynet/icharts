<template>
  <SectionDivider>Treemap</SectionDivider>
  <DemoGrid>

    <DemoCard
      ref="defaultCard"
      title="Default — disk usage"
      tag='type="treemap"'
      card-style="grid-column: 1 / -1;"
      box-style="height: 520px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Hierarchical data: each node has a name + value (required on leaves;
// internal nodes may omit it — ECharts sums children automatically).
// Click any node to drill into its sub-tree, then use the breadcrumb
// at the bottom to navigate back.
createChart(el, 'treemap', [
  {
    name: 'src',
    children: [
      { name: 'components', value: 18 },
      { name: 'adapters',   value: 42 },
      { name: 'themes',     value: 12 },
    ],
  },
  {
    name: 'site',
    children: [
      { name: 'views',      value: 24 },
      { name: 'components', value: 9  },
    ],
  },
  { name: 'docs',  value: 8 },
  { name: 'tests', value: 15 },
], {
  title: 'Repo Size by Folder',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="leafDepthCard"
      title="Initial collapse (leafDepth)"
      tag="leafDepth=2"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">// leafDepth: 2 → only the first two levels render. Drill into a
// node to expose deeper levels. Useful for very deep hierarchies.
createChart(el, 'treemap', diskData, {
  title: 'Disk Usage',
  leafDepth: 2,
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="customColorsCard"
      title="Per-node color + colorMap"
      tag="node.color + options.colorMap"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Per-node `color` pins the rectangle (and its descendants inherit
// ECharts' tinting from that color). `colorMap` keyed by root-level
// node name works the same way every other chart in the lib does.
createChart(el, 'treemap', [
  { name: 'Engineering', value: 60, color: '#0ea5e9' },
  { name: 'Product',     value: 25 },
  { name: 'Operations',  value: 15 },
], {
  title: 'Headcount',
  colorMap: {
    Product:    '#10b981',
    Operations: '#f59e0b',
  },
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="customTooltipCard"
      title="Custom tooltip — tooltip.customHtml"
      tag="customHtml + formatValue"
      card-style="grid-column: 1 / -1;"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">// The default sync row is replaced by `customHtml`. The `ctx.kind ===
// 'item'` payload carries `name`, `value`, and the painted `color`,
// so callbacks can render rich HTML without re-implementing tooltip
// positioning / debounce.
createChart(el, 'treemap', diskData, {
  title: 'Disk Usage',
  tooltip: {
    formatValue: (v) => `${v.toLocaleString()} MB`,
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      return `&lt;div style="display:flex;align-items:center;gap:8px"&gt;
        &lt;span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ctx.color}"&gt;&lt;/span&gt;
        &lt;strong&gt;${ctx.name}&lt;/strong&gt; — ${(ctx.value as number).toLocaleString()} MB
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
import { createChart, type TreemapData } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const defaultCard = ref<CardRef>();
const leafDepthCard = ref<CardRef>();
const customColorsCard = ref<CardRef>();
const customTooltipCard = ref<CardRef>();

// Small, readable hierarchy that still demonstrates 3 levels of nesting.
// Numeric values are arbitrary "size" units (MB). Leaf values drive the
// rectangle area; internal nodes are summed automatically by ECharts.
const repoData: TreemapData = [
  {
    name: 'src',
    children: [
      { name: 'components', value: 18 },
      {
        name: 'adapters',
        children: [
          { name: 'line', value: 8 },
          { name: 'bar', value: 7 },
          { name: 'pie', value: 9 },
          { name: 'gauge', value: 4 },
          { name: 'tree', value: 14 },
        ],
      },
      { name: 'themes', value: 12 },
      { name: 'types', value: 10 },
    ],
  },
  {
    name: 'site',
    children: [
      { name: 'views', value: 24 },
      { name: 'components', value: 9 },
    ],
  },
  { name: 'docs', value: 8 },
  { name: 'tests', value: 15 },
];

// Inspired by the ECharts treemap-disk example (numbers trimmed so the
// chart reads cleanly at 460 px tall without scrolling).
const diskData: TreemapData = [
  {
    name: '/Applications',
    children: [
      { name: 'Xcode.app', value: 12_400 },
      { name: 'Safari.app', value: 1_200 },
      { name: 'Finder.app', value: 200 },
    ],
  },
  {
    name: '/Users',
    children: [
      { name: 'Documents', value: 4_800 },
      { name: 'Downloads', value: 3_100 },
      { name: 'Photos', value: 9_300 },
      { name: 'Music', value: 2_400 },
    ],
  },
  {
    name: '/Library',
    children: [
      { name: 'Caches', value: 1_900 },
      { name: 'Logs', value: 320 },
    ],
  },
  { name: '/System', value: 8_700 },
];

const teamData: TreemapData = [
  { name: 'Engineering', value: 60, color: '#0ea5e9' },
  { name: 'Product', value: 25 },
  { name: 'Operations', value: 15 },
];

onMounted(() => {
  createChart(defaultCard.value!.chartEl!, 'treemap', repoData, {
    title: 'Repo Size by Folder',
  });
  createChart(leafDepthCard.value!.chartEl!, 'treemap', diskData, {
    title: 'Disk Usage',
    leafDepth: 2,
  });
  createChart(customColorsCard.value!.chartEl!, 'treemap', teamData, {
    title: 'Headcount',
    colorMap: {
      Product: '#10b981',
      Operations: '#f59e0b',
    },
  });
  createChart(customTooltipCard.value!.chartEl!, 'treemap', diskData, {
    title: 'Disk Usage',
    tooltip: {
      formatValue: (v) => `${(v as number).toLocaleString()} MB`,
      customHtml: async (ctx) => {
        if (ctx.kind !== 'item') return '';
        return `<div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ctx.color ?? '#888'}"></span>
          <strong>${ctx.name}</strong> — ${(ctx.value as number).toLocaleString()} MB
        </div>`;
      },
    },
  });
});
</script>
