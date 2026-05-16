<template>
  <SectionDivider>Custom Legend (formatLabel)</SectionDivider>

  <el-alert
    type="info"
    :closable="false"
    show-icon
    style="margin-bottom: 16px;"
  >
    <template #default>
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

    <!-- ─────────── Pie: combined cases (value + newline + emoji) ─────────── -->
    <DemoCard
      ref="pieValueCard"
      title="Pie"
      tag="formatLabel"
      card-style="grid-column: 1 / -1;"
    >
      <template #code>
        <pre v-pre class="code-block">const total = pieData.reduce((s, d) =&gt; s + d.value, 0);
const byName = new Map(pieData.map((d) =&gt; [d.name, d.value]));
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
      const v = byName.get(name) ?? 0;
      const pct = ((v / total) * 100).toFixed(1);
      return {
        segments: [
          {
            text: `${iconByName[name] ?? '•'} ${name === 'Chrome' ? 'Google Chrome' : name}`,
            width: 60,
            style: { fontSize: 24, verticalAlign: 'middle', lineHeight: 46 },
          },
          {
            text: `${v}\n(${pct}%)`,
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
import { createChart } from '@bndynet/icharts';
import SectionDivider from '../components/SectionDivider.vue';
import DemoGrid from '../components/DemoGrid.vue';
import DemoCard from '../components/DemoCard.vue';
import { pieData } from './charts/sharedData';

type CardRef = InstanceType<typeof DemoCard>;

const pieValueCard = ref<CardRef>();

// Charts are auto-disposed when Vue tears down this view — see the note in
// `LineAreaCharts.vue` for the disconnect-sentinel pattern.
onMounted(() => {
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
