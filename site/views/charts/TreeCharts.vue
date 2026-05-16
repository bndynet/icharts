<template>
  <SectionDivider>Tree Charts</SectionDivider>
  <DemoGrid>

    <DemoCard
      ref="lrCard"
      title="Left → Right (default)"
      tag='type="tree"'
      card-style="grid-column: 1 / -1;"
      box-style="height: 520px;"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'tree', {
  name: 'flare',
  children: [
    { name: 'analytics', children: [
      { name: 'cluster', children: [
        { name: 'AgglomerativeCluster' },
        { name: 'CommunityStructure' },
      ]},
      { name: 'graph', children: [
        { name: 'BetweennessCentrality' },
        { name: 'LinkDistance' },
      ]},
    ]},
    { name: 'data', children: [
      { name: 'DataField' },
      { name: 'DataTable' },
    ]},
    { name: 'display', children: [
      { name: 'DirtySprite' },
      { name: 'TextSprite' },
    ]},
  ],
}, {
  title: 'Project Hierarchy',
  // direction defaults to 'left-to-right'
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="tbCard"
      title="Top → Bottom (labels rotate -90°)"
      tag="direction='top-to-bottom'"
      card-style="grid-column: 1 / -1;"
      box-style="height: 600px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Vertical layouts auto-rotate labels -90° (read top-to-bottom),
// matching ECharts' own `tree-vertical` reference example.
// Long node names like 'AgglomerativeCluster' stack vertically
// instead of competing for horizontal space with siblings.
createChart(el, 'tree', projectData, {
  title: 'Project Hierarchy',
  direction: 'top-to-bottom',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="rlCard"
      title="Right → Left"
      tag="direction='right-to-left'"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'tree', orgData, {
  title: 'Reverse Tree',
  direction: 'right-to-left',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="btCard"
      title="Bottom → Top (mirror of top-to-bottom)"
      tag="direction='bottom-to-top'"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'tree', orgData, {
  title: 'Roots Up',
  direction: 'bottom-to-top',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="collapsedCard"
      title="Initial collapse + per-node color"
      tag="initialTreeDepth=2"
      card-style="grid-column: 1 / -1;"
      box-style="height: 520px;"
    >
      <template #code>
        <pre v-pre class="code-block">// initialTreeDepth: 2 → only the first two levels render expanded;
// deeper levels start collapsed and reveal on click.
//
// Per-node `color` pins specific branches (root + critical leaf).
createChart(el, 'tree', {
  name: 'Company',
  color: '#0ea5e9',
  children: [
    { name: 'Engineering', children: [
      { name: 'Frontend', children: [
        { name: 'Web' }, { name: 'Mobile' }, { name: 'Design Sys' },
      ]},
      { name: 'Backend', children: [
        { name: 'API' }, { name: 'Data' }, { name: 'Infra', color: '#ef4444' },
      ]},
    ]},
    { name: 'Product', children: [
      { name: 'PMs' }, { name: 'UX Research' },
    ]},
    { name: 'Operations', children: [
      { name: 'Finance' }, { name: 'HR' }, { name: 'Legal' },
    ]},
  ],
}, {
  title: 'Initially Collapsed Tree',
  initialTreeDepth: 2,
});</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart, type TreeData } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const lrCard = ref<CardRef>();
const rlCard = ref<CardRef>();
const tbCard = ref<CardRef>();
const btCard = ref<CardRef>();
const collapsedCard = ref<CardRef>();

// Mirrors the ECharts `tree-basic` reference data (trimmed to a readable
// depth so the four direction demos stay legible without scrolling).
const projectData: TreeData = {
  name: 'flare',
  children: [
    {
      name: 'analytics',
      children: [
        {
          name: 'cluster',
          children: [
            { name: 'AgglomerativeCluster' },
            { name: 'CommunityStructure' },
            { name: 'HierarchicalCluster' },
          ],
        },
        {
          name: 'graph',
          children: [
            { name: 'BetweennessCentrality' },
            { name: 'LinkDistance' },
            { name: 'ShortestPaths' },
          ],
        },
      ],
    },
    {
      name: 'data',
      children: [
        { name: 'DataField' },
        { name: 'DataSet' },
        { name: 'DataTable' },
      ],
    },
    {
      name: 'display',
      children: [
        { name: 'DirtySprite' },
        { name: 'LineSprite' },
        { name: 'TextSprite' },
      ],
    },
  ],
};

// Compact org chart — small enough to read in all four directions inside a
// 460 px card.
const orgData: TreeData = {
  name: 'CEO',
  children: [
    {
      name: 'CTO',
      children: [
        { name: 'Frontend' },
        { name: 'Backend' },
        { name: 'DevOps' },
      ],
    },
    {
      name: 'CPO',
      children: [{ name: 'PM' }, { name: 'Design' }],
    },
    {
      name: 'CFO',
      children: [{ name: 'Finance' }, { name: 'Legal' }],
    },
  ],
};

const collapsedData: TreeData = {
  name: 'Company',
  color: '#0ea5e9',
  children: [
    {
      name: 'Engineering',
      children: [
        {
          name: 'Frontend',
          children: [
            { name: 'Web' },
            { name: 'Mobile' },
            { name: 'Design Sys' },
          ],
        },
        {
          name: 'Backend',
          children: [
            { name: 'API' },
            { name: 'Data' },
            { name: 'Infra', color: '#ef4444' },
          ],
        },
      ],
    },
    {
      name: 'Product',
      children: [{ name: 'PMs' }, { name: 'UX Research' }],
    },
    {
      name: 'Operations',
      children: [
        { name: 'Finance' },
        { name: 'HR' },
        { name: 'Legal' },
      ],
    },
  ],
};

// Auto-disposed on unmount via the sentinel installed inside each chart's
// container — see `LineAreaCharts.vue` for the full note.
onMounted(() => {
  createChart(lrCard.value!.chartEl!, 'tree', projectData, {
    title: 'Project Hierarchy',
  });
  createChart(rlCard.value!.chartEl!, 'tree', orgData, {
    title: 'Reverse Tree',
    direction: 'right-to-left',
  });
  createChart(tbCard.value!.chartEl!, 'tree', projectData, {
    title: 'Project Hierarchy',
    direction: 'top-to-bottom',
  });
  createChart(btCard.value!.chartEl!, 'tree', orgData, {
    title: 'Roots Up',
    direction: 'bottom-to-top',
  });
  createChart(collapsedCard.value!.chartEl!, 'tree', collapsedData, {
    title: 'Initially Collapsed Tree',
    initialTreeDepth: 2,
  });
});
</script>
