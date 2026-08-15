<template>
  <SectionDivider>Custom Legend</SectionDivider>

  <el-alert
    type="info"
    :closable="false"
    show-icon
    style="margin-bottom: 16px;"
  >
    <template #default>
      Click the highlighted legend items below: their background changes while
      every line and pie slice stays visible. The line card uses the default
      multiple mode; the pie card uses single mode. <strong>Update data</strong>
      keeps highlights, and <strong>Reset selection</strong> passes a new
      <code>legend.selection.selected</code> list. The <code>formatLabel</code> example
      shows how to customize the text rendered for each entry.
      <code>legend.formatLabel: (name, index) =&gt; string | RichTextSpec</code> maps to
      ECharts' native <code>legend.formatter</code>. Use it to append values, units,
      status, or structured segments (auto-compiled to rich text) per entry.
      Side-edge legends
      (<code>position: 'left' / 'right'</code>) automatically re-measure with the
      formatted text so long values don't bleed into the chart body. See
      <code>LegendOptions</code> in the README for the full contract.
    </template>
  </el-alert>

  <DemoGrid>

    <DemoCard title="Line: multiple selections" tag="legend.selection">
      <div class="selection-demo">
        <div ref="lineSelectionEl" class="selection-chart"></div>
        <div class="selection-controls">
          <el-button-group>
            <el-button size="small" @click="updateLineData">Update data</el-button>
            <el-button size="small" @click="resetLineSelection">Reset selection</el-button>
          </el-button-group>
          <span>Highlighted: {{ describeSelection(lineSelected) }}</span>
        </div>
      </div>
      <template #code>
        <pre v-pre class="code-block">const data = {
  categories: ['Jan', 'Feb', 'Mar'],
  series: [
    { name: 'Revenue', data: [820, 932, 901] },
    { name: 'Expenses', data: [620, 732, 701] },
  ],
};
const chart = createChart(el, 'line', data, {
  legend: {
    selection: {
      selected: ['Revenue'],
      onChange: ({ selected }) => console.log(selected),
    },
  },
});

// Click Expenses: both entries get backgrounds, and both lines stay visible.
chart.update({
  ...data,
  series: data.series.map((s) => ({ ...s, data: s.data.map((v) => v + 100) })),
});

// Explicitly passing selected resets the background highlights.
chart.update(undefined, { legend: { selection: { selected: ['Revenue'] } } });</pre>
      </template>
    </DemoCard>

    <DemoCard title="Pie: single selection" tag="mode: single">
      <div class="selection-demo">
        <div ref="pieSelectionEl" class="selection-chart"></div>
        <div class="selection-controls">
          <el-button-group>
            <el-button size="small" @click="updatePieData">Update data</el-button>
            <el-button size="small" @click="resetPieSelection">Reset selection</el-button>
          </el-button-group>
          <span>Highlighted: {{ describeSelection(pieSelected) }}</span>
        </div>
      </div>
      <template #code>
        <pre v-pre class="code-block">const data = [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
];
const chart = createChart(el, 'pie', data, {
  legend: {
    show: true,
    selection: {
      mode: 'single',
      selected: ['Chrome'],
      onChange: ({ selected }) => console.log(selected),
    },
  },
});

// Click another legend item: highlight moves; all slices stay visible.
chart.update(data.map((slice) => ({ ...slice, value: slice.value + 5 })));</pre>
      </template>
    </DemoCard>

    <!-- ─────────── Pie: combined cases (value + newline + emoji) ─────────── -->
    <DemoCard
      ref="pieValueCard"
      title="Pie"
      tag="formatLabel"
      card-style="grid-column: 1 / -1;"
    >
      <template #code>
        <pre v-pre class="code-block">const pieTotal = pieData.reduce((sum, d) =&gt; sum + d.value, 0);
const pieByName = new Map(pieData.map((d) =&gt; [d.name, d.value]));
const iconByName: Record&lt;string, string&gt; = {
  Chrome: '🌐',
  Safari: '🧭',
  Edge: '🧩',
  Firefox: '🦊',
  Other: '📦',
};

createChart(el, 'pie', pieData, {
  legend: {
    show: true,
    position: 'right',
    formatLabel: (name) =&gt; {
      const v = pieByName.get(name) ?? 0;
      const pct = ((v / pieTotal) * 100).toFixed(0);
      return {
        segments: [
          {
            text: `${iconByName[name] ?? '•'} ${name === 'Chrome' ? 'Google Chrome' : name}`,
            width: 80,
            style: { fontWeight: 800 },
          },
          {
            text: `${v} (${pct}%)`,
            width: 60,
            align: 'right',
            style: { color: '#9aa1ad' },
          },
        ],
      };
    },
  },
  padding: 20,
});</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart, type IChartInstance } from '@bndynet/icharts';
import SectionDivider from '../components/SectionDivider.vue';
import DemoGrid from '../components/DemoGrid.vue';
import DemoCard from '../components/DemoCard.vue';
import { pieData } from './charts/sharedData';

type CardRef = InstanceType<typeof DemoCard>;

const pieValueCard = ref<CardRef>();
const lineSelectionEl = ref<HTMLElement>();
const pieSelectionEl = ref<HTMLElement>();
const lineSelected = ref<string[]>(['Revenue']);
const pieSelected = ref<string[]>(['Chrome']);
let lineChart: IChartInstance<'line'> | undefined;
let pieChart: IChartInstance<'pie'> | undefined;
let lineFrame = 0;
let pieFrame = 0;

function describeSelection(selected: string[]): string {
  return selected.length ? selected.join(' · ') : 'none';
}

function onLineChange(event: { selected: string[] }): void {
  lineSelected.value = event.selected;
}

function onPieChange(event: { selected: string[] }): void {
  pieSelected.value = event.selected;
}

function lineData(frame: number) {
  return {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    series: [
      { name: 'Revenue', data: [820, 932, 901, 934, 1290, 1330].map((v) => v + frame * 80) },
      { name: 'Expenses', data: [620, 732, 701, 734, 1090, 1130].map((v) => v + frame * 40) },
    ],
  };
}

function updateLineData(): void {
  lineChart?.update(lineData(++lineFrame));
}

function resetLineSelection(): void {
  lineChart?.update(undefined, { legend: { selection: { selected: ['Revenue'], onChange: onLineChange } } });
  lineSelected.value = ['Revenue'];
}

function updatePieData(): void {
  pieFrame += 1;
  pieChart?.update(pieData.map((slice, i) => ({ ...slice, value: slice.value + pieFrame * (i + 1) })));
}

function resetPieSelection(): void {
  pieChart?.update(undefined, { legend: { show: true, selection: { mode: 'single', selected: ['Chrome'], onChange: onPieChange } } });
  pieSelected.value = ['Chrome'];
}

// Charts are auto-disposed when Vue tears down this view — see the note in
// `LineAreaCharts.vue` for the disconnect-sentinel pattern.
onMounted(() => {
  lineChart = createChart(lineSelectionEl.value!, 'line', lineData(lineFrame), {
    title: 'Monthly Financials',
    legend: { selection: { selected: ['Revenue'], onChange: onLineChange } },
  });

  pieChart = createChart(pieSelectionEl.value!, 'pie', pieData, {
    title: 'Browser Market Share',
    legend: { show: true, selection: { mode: 'single', selected: ['Chrome'], onChange: onPieChange } },
  });

  // ─── Pie: combined cases (value + newline + emoji) ────────────────────
  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0);
  const pieByName = new Map(pieData.map((d) => [d.name, d.value]));
  const iconByName: Record<string, string> = {
    Chrome: '🌐',
    Safari: '🧭',
    Edge: '🧩',
    Firefox: '🦊',
    Other: '📦',
  };
  createChart(pieValueCard.value!.chartEl!, 'pie', pieData, {
    legend: {
      show: true,
      position: 'right',
      formatLabel: (name) => {
        const v = pieByName.get(name) ?? 0;
        const pct = ((v / pieTotal) * 100).toFixed(0);
        return {
          segments: [
            {
              text: `${iconByName[name] ?? '•'} ${name === 'Chrome' ? 'Google Chrome' : name}`,
              width: 80,
              style: { fontWeight: 800 }
            },
            {
              text: `${v} (${pct}%)`,
              width: 60,
              align: 'right',
              style: { color: '#9aa1ad' },
            },
          ],
        };
      },
    },
    padding: 20,
  });
});
</script>

<style scoped>
.selection-demo { display: flex; flex-direction: column; height: 100%; }
.selection-chart { flex: 1; min-height: 0; width: 100%; }
.selection-controls { display: flex; align-items: center; gap: 8px; padding: 4px 8px; flex-wrap: wrap; font-size: 12px; }
</style>
