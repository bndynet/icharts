<template>
  <div style="max-width: 1280px; margin: 0 auto;">
    <el-alert
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 24px;"
    >
      <template #default>
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">tooltip.customHtml</el-tag>
        receives a unified
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">TooltipContext</el-tag>
        — narrow with
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">ctx.kind</el-tag>:
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">axis</el-tag>
        (line / bar / area),
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">item</el-tag>
        (pie, sankey/chord node), or
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">edge</el-tag>
        (sankey/chord link). Async HTML is appended after the default sync tooltip.
      </template>
    </el-alert>

    <div class="demo-grid">
      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Axis — tooltip.customHtml</span>
            <el-tag type="success" size="small" effect="plain">kind: axis</el-tag>
          </div>
        </template>
        <div ref="chartAxisEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'line', data, {
  title: 'Async extra row',
  tooltip: {
    placeholder: 'Loading detail…',
    customHtml: async (ctx) => {
      if (ctx.kind !== 'axis') return '';
      const res = await fetch(`/api/series-detail?i=${ctx.dataIndex}`);
      const { rollingAvg } = await res.json();
      return `7-day avg: &lt;strong&gt;${rollingAvg}&lt;/strong&gt; (${ctx.axisValueLabel})`;
    },
  },
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Pie — tooltip.customHtml</span>
            <el-tag type="success" size="small" effect="plain">kind: item</el-tag>
          </div>
        </template>
        <div ref="chartPieEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  tooltip: {
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      const r = await fetch(`/api/slice-meta?name=${encodeURIComponent(ctx.name)}`);
      return (await r.json()).note;
    },
  },
});</pre>
        </details>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createChart, configure, switchTheme } from '@bndynet/icharts';
import { useTheme } from '@bndynet/vue-site';

const { theme } = useTheme();

const chartAxisEl = ref<HTMLElement>();
const chartPieEl = ref<HTMLElement>();

const lineData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [{ name: 'Visitors', data: [120, 200, 150, 80, 210, 340, 310] }],
};

const pieData = [
  { name: 'North', value: 40 },
  { name: 'South', value: 35 },
  { name: 'East', value: 25 },
];

onMounted(() => {
  configure({ consistentColors: false });

  createChart(chartAxisEl.value!, 'line', lineData, {
    title: 'Hover: extra row loads via tooltip.customHtml',
    tooltip: {
      placeholder: 'Loading detail…',
      customHtml: async (ctx) => {
        if (ctx.kind !== 'axis') return '';
        await new Promise<void>((r) => {
          window.setTimeout(r, 420);
        });
        const n = Math.round(80 + Math.random() * 40);
        return `7-day rolling avg (simulated): <strong>${n}</strong> · <span style="opacity:.9">${ctx.axisValueLabel}</span>`;
      },
    },
  });

  createChart(chartPieEl.value!, 'pie', pieData, {
    title: 'Hover slice: tooltip.customHtml (kind: item)',
    tooltip: {
      placeholder: 'Loading…',
      customHtml: async (ctx) => {
        if (ctx.kind !== 'item') return '';
        await new Promise<void>((r) => {
          window.setTimeout(r, 350);
        });
        return `Simulated detail for region <strong>${ctx.name}</strong>`;
      },
    },
  });

  switchTheme(theme.value);
});

onUnmounted(() => {
  configure({ consistentColors: false });
});
</script>

<style scoped>
.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 16px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-box {
  height: 320px;
}

pre.code-block {
  padding: 12px;
  margin: 0;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-small);
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  color: var(--el-text-color-secondary);
}

details > summary {
  font-size: 12px;
  color: var(--el-color-primary);
  cursor: pointer;
  padding-top: 10px;
  list-style: none;
  user-select: none;
}

details > summary::-webkit-details-marker {
  display: none;
}

details[open] > summary {
  padding-bottom: 6px;
}
</style>
