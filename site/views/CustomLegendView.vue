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
      title="Pie — combined cases"
      tag="formatLabel"
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
  title: 'Browser Market Share (combined)',
  legend: {
    show: true,
    position: 'right',
    formatLabel: (name) =&gt; {
      const v = byName.get(name) ?? 0;
      const pct = ((v / total) * 100).toFixed(1);
      return {
        segments: [
          {
            text: `${iconByName[name] ?? '•'} ${name}`,
            width: 60,
            style: { fontSize: 24, verticalAlign: 'middle', lineHeight: 46 },
          },
          { text: `${v}\n(${pct}%)`, width: 60, align: 'right' },
        ],
      };
    },
  },
  padding: 20,
});</pre>
      </template>
    </DemoCard>

    <!-- ─────────── Line: append latest value next to each series ─────────── -->
    <DemoCard
      ref="lineLatestCard"
      title="Line — append latest value"
      tag="formatLabel"
    >
      <template #code>
        <pre v-pre class="code-block">const lastByName = new Map(
  xyData.series.map((s) =&gt; [s.name, s.data[s.data.length - 1]]),
);

createChart(el, 'line', xyData, {
  title: 'Monthly Financials',
  legend: {
    formatLabel: (n) =&gt; `${n}  $${lastByName.get(n)?.toLocaleString()}`,
  },
});</pre>
      </template>
    </DemoCard>

    <!-- ─────────── Bar: structured segments (two-style entry) ─────────── -->
    <DemoCard
      ref="barRichCard"
      title="Bar — two-style entry (no manual rich)"
      tag="formatLabel + RichTextSpec"
    >
      <template #code>
        <pre v-pre class="code-block">// Return structured segments; icharts compiles them to ECharts rich text.
const lastByName = new Map(
  barData.series.map((s) =&gt; [s.name, s.data[s.data.length - 1]]),
);

createChart(el, 'bar', barData, {
  title: 'Weekly Sales',
  legend: {
    position: 'right',
    formatLabel: (n) =&gt; ({
      segments: [
        { text: n, width: 60, style: { fontWeight: 600 } },
        {
          text: `$${lastByName.get(n)?.toLocaleString()}`,
          width: 40,
          align: 'right',
          style: { color: '#8a8f99', fontSize: 11 },
        },
      ],
    }),
  },
});</pre>
      </template>
    </DemoCard>

    <!-- ─────────── Radar: prefix entries with a marker ─────────── -->
    <DemoCard
      ref="radarMarkerCard"
      title="Radar — prefix marker"
      tag="formatLabel"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'radar', radarData, {
  title: 'Q3 Capability Audit',
  legend: {
    show: true,
    position: 'right',
    formatLabel: (n) =&gt; `▣ ${n}`,
  },
});</pre>
      </template>
    </DemoCard>

    <!-- ─────────── Network: category counts ─────────── -->
    <DemoCard
      ref="networkCountCard"
      title="Network — category counts"
      tag="formatLabel"
      card-style="grid-column: 1 / -1;"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Category legend → format each category name with its node count.
const countByCat = networkData.nodes.reduce&lt;Record&lt;string, number&gt;&gt;((acc, n) =&gt; {
  if (n.category) acc[n.category] = (acc[n.category] ?? 0) + 1;
  return acc;
}, {});

createChart(el, 'network', networkData, {
  title: 'Team Collaboration',
  legend: {
    position: 'top',
    formatLabel: (cat) =&gt; `${cat} (${countByCat[cat] ?? 0})`,
  },
});</pre>
      </template>
    </DemoCard>

    <!-- ─────────── Defensive: throwing formatter falls back to raw name ─────────── -->
    <DemoCard
      ref="defensiveCard"
      title="Defensive — throws fall back to raw name"
      tag="safe by design"
    >
      <template #code>
        <pre v-pre class="code-block">// A buggy formatter shouldn't blank out the legend. The library wraps
// every formatLabel call in try/catch and falls back to the raw name
// (and to the raw name's width for side-legend reservation). The chart
// still renders normally; only the entry whose lookup failed loses its
// custom decoration.
const badLookup: Record&lt;string, number&gt; = { Pro: 99 };

createChart(el, 'pie', pieData, {
  title: 'Defensive Fallback (Pro shows formatted, others fall back)',
  legend: {
    show: true,
    formatLabel: (n) =&gt; {
      // Throws for everything except Pro — others render as plain names.
      return `${n} → ${badLookup[n].toFixed(0)}`;
    },
  },
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
import { pieData, xyData } from './charts/sharedData';

type CardRef = InstanceType<typeof DemoCard>;

const pieValueCard = ref<CardRef>();
const lineLatestCard = ref<CardRef>();
const barRichCard = ref<CardRef>();
const radarMarkerCard = ref<CardRef>();
const networkCountCard = ref<CardRef>();
const defensiveCard = ref<CardRef>();

// Bar-specific dataset: weekly sales across two regions. Kept inline so the
// "show code" pre block in the card matches the actual runtime values.
const barData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'North',  data: [320, 420, 380, 510, 470, 380, 250] },
    { name: 'South',  data: [280, 360, 340, 420, 510, 460, 320] },
    { name: 'East',   data: [180, 240, 220, 310, 360, 320, 210] },
  ],
};

// Radar dataset (two polygons, four indicators).
// Note: radar's RadarDataSeries uses `values` (not `data`) — the indicator
// arrays line up by index, see `RadarDataSeries` in `src/types/radar.ts`.
const radarData = {
  indicators: [
    { name: 'Performance', max: 100 },
    { name: 'Reliability', max: 100 },
    { name: 'Security',    max: 100 },
    { name: 'Usability',   max: 100 },
  ],
  series: [
    { name: 'Q3 Actual', values: [82, 76, 88, 90] },
    { name: 'Q3 Target', values: [85, 80, 90, 92] },
  ],
};

// Compact network dataset (4 categories × ~3 nodes each).
const networkData = {
  categories: ['Frontend', 'Backend', 'Design', 'Product'],
  nodes: [
    { name: 'Alice', category: 'Frontend', value: 12 },
    { name: 'Bob',   category: 'Frontend', value: 8 },
    { name: 'Sam',   category: 'Frontend', value: 6 },
    { name: 'Carol', category: 'Backend',  value: 14 },
    { name: 'Dan',   category: 'Backend',  value: 9 },
    { name: 'Tom',   category: 'Backend',  value: 7 },
    { name: 'Eve',   category: 'Design',   value: 10 },
    { name: 'Leo',   category: 'Design',   value: 6 },
    { name: 'Helen', category: 'Product',  value: 13 },
    { name: 'Ian',   category: 'Product',  value: 8 },
  ],
  links: [
    { source: 'Alice', target: 'Carol', value: 8 },
    { source: 'Bob',   target: 'Dan',   value: 5 },
    { source: 'Eve',   target: 'Alice', value: 6 },
    { source: 'Leo',   target: 'Sam',   value: 5 },
    { source: 'Helen', target: 'Alice', value: 5 },
    { source: 'Helen', target: 'Carol', value: 6 },
    { source: 'Helen', target: 'Eve',   value: 4 },
    { source: 'Ian',   target: 'Bob',   value: 3 },
    { source: 'Carol', target: 'Dan',   value: 7 },
    { source: 'Carol', target: 'Tom',   value: 5 },
  ],
};

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
    title: 'Browser Market Share (combined)',
    legend: {
      show: true,
      position: 'right',
      formatLabel: (name) => {
        const v = pieByName.get(name) ?? 0;
        const pct = ((v / pieTotal) * 100).toFixed(0);
        return {
          segments: [
            {
              text: `${iconByName[name] ?? '•'} ${name}`,
              width: 80,
              style: { fontWeight: 800 }
            },
            { text: `${v} (${pct}%)`, width: 60, align: 'right' },
          ],
        };
      },
    },
    padding: 20,
  });

  // ─── Line: append latest value next to each series ────────────────────
  const lineLastByName = new Map(
    xyData.series.map((s) => [s.name, s.data[s.data.length - 1]]),
  );
  createChart(lineLatestCard.value!.chartEl!, 'line', xyData, {
    title: 'Monthly Financials',
    legend: {
      formatLabel: (n) => `${n}  $${(lineLastByName.get(n) ?? 0).toLocaleString()}`,
    },
  });

  // ─── Bar: structured segments two-style entry ─────────────────────────
  const barLastByName = new Map(
    barData.series.map((s) => [s.name, s.data[s.data.length - 1]]),
  );
  createChart(barRichCard.value!.chartEl!, 'bar', barData, {
    title: 'Weekly Sales',
    legend: {
      position: 'right',
      formatLabel: (n) => ({
        segments: [
          { text: n, width: 60, style: { fontWeight: 600 } },
          {
            text: `$${(barLastByName.get(n) ?? 0).toLocaleString()}`,
            width: 40,
            align: 'right',
            style: { color: '#8a8f99', fontSize: 11 },
          },
        ],
      }),
    },
  });

  // ─── Radar: prefix marker ─────────────────────────────────────────────
  createChart(radarMarkerCard.value!.chartEl!, 'radar', radarData, {
    title: 'Q3 Capability Audit',
    legend: {
      show: true,
      position: 'right',
      formatLabel: (n) => `▣ ${n}`,
    },
  });

  // ─── Network: category counts ─────────────────────────────────────────
  const countByCat = networkData.nodes.reduce<Record<string, number>>(
    (acc, n) => {
      if (n.category) acc[n.category] = (acc[n.category] ?? 0) + 1;
      return acc;
    },
    {},
  );
  createChart(networkCountCard.value!.chartEl!, 'network', networkData, {
    title: 'Team Collaboration',
    legend: {
      position: 'top',
      formatLabel: (cat) => `${cat} (${countByCat[cat] ?? 0})`,
    },
  });

  // ─── Defensive: throwing formatter falls back to raw name ─────────────
  // `badLookup` is intentionally missing entries for everything except
  // "Chrome" → so the formatter throws on undefined.toFixed for the other
  // slices. The library catches the throw and renders the raw slice name
  // for those entries, keeping the legend usable.
  const badLookup: Record<string, number> = { Chrome: 99 };
  createChart(defensiveCard.value!.chartEl!, 'pie', pieData, {
    title: 'Defensive Fallback',
    legend: {
      show: true,
      formatLabel: (n) => `${n} → ${badLookup[n].toFixed(0)}`,
    },
  });
});
</script>
