<template>
  <div style="max-width: 1280px; margin: 0 auto;">
    <el-alert
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 24px;"
    >
      <template #default>
        Both
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">tooltip.customHtml</el-tag>
        and
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">tooltip.appendHtml</el-tag>
        receive a unified
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">TooltipContext</el-tag>
        — narrow with
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">ctx.kind</el-tag>:
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">axis</el-tag>
        (line / bar / area),
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">item</el-tag>
        (pie, sankey/chord node), or
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">edge</el-tag>
        (sankey/chord link).
        <strong>customHtml</strong> fully replaces the default tooltip body;
        <strong>appendHtml</strong> keeps the default body and adds extras below it
        with a thin separator. Both can be combined in the same chart.
        <br/>
        <span style="opacity: 0.8;">
          Item / axis hovers expose
          <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">color</el-tag>
          (resolved hex/rgb); edge hovers expose
          <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">sourceColor</el-tag>
          and
          <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">targetColor</el-tag>
          — looked up from the source/target node names because
          ECharts reports the literal string "gradient" for sankey/chord links.
        </span>
      </template>
    </el-alert>

    <div class="demo-grid">
      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Axis — tooltip.customHtml (replaces default body)</span>
            <el-tag type="success" size="small" effect="plain">kind: axis</el-tag>
          </div>
        </template>
        <div ref="chartAxisEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'line', data, {
  tooltip: {
    placeholder: 'Loading…',
    // customHtml owns the entire tooltip body — the built-in
    // axisValue + series rows are NOT rendered. Use it when you
    // want full control. Here we dump `ctx` so you can see every
    // field available for line / bar / area axis hovers.
    customHtml: async (ctx) =&gt; {
      if (ctx.kind !== 'axis') return '';
      // ctx fields: kind, axisValueLabel, dataIndex,
      //            rawAxisValue, series: [{ name, value, marker }]
      return `&lt;b&gt;ctx (kind: ${ctx.kind})&lt;/b&gt;&lt;pre&gt;${formatCtx(ctx)}&lt;/pre&gt;`;
    },
  },
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Pie — tooltip.appendHtml (keeps default body)</span>
            <el-tag type="success" size="small" effect="plain">kind: item</el-tag>
          </div>
        </template>
        <div ref="chartPieEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'pie', pieData, {
  tooltip: {
    placeholder: 'Loading…',
    // appendHtml keeps the default name + value + percent row and
    // adds your async HTML below it with a thin separator. Here we
    // dump `ctx` so you can see every field available for pie /
    // sankey / chord / network / tree / word-cloud item hovers.
    appendHtml: async (ctx) =&gt; {
      if (ctx.kind !== 'item') return '';
      // ctx fields: kind, dataIndex, name, value, percent?, marker?, color?
      return `&lt;b&gt;ctx (kind: ${ctx.kind})&lt;/b&gt;&lt;pre&gt;${formatCtx(ctx)}&lt;/pre&gt;`;
    },
  },
});</pre>
        </details>
      </el-card>

      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Sankey — tooltip.customHtml on link hover (sourceColor + targetColor)</span>
            <el-tag type="success" size="small" effect="plain">kind: edge</el-tag>
          </div>
        </template>
        <div ref="chartSankeyEl" class="chart-box"></div>
        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">createChart(el, 'sankey', sankeyData, {
  tooltip: {
    placeholder: 'Loading…',
    // For link hovers, ECharts' own `params.color` is the literal
    // string "gradient" — useless to render. The library instead
    // looks up `sourceColor` and `targetColor` from the resolved
    // palette via the source/target node names. The two swatches
    // below render with those resolved colors.
    customHtml: async (ctx) =&gt; {
      if (ctx.kind !== 'edge') return '';
      // ctx fields: kind, dataIndex, source, target, value,
      //             sourceColor?, targetColor?
      return swatchRowHtml(ctx) + `&lt;pre&gt;${formatCtx(ctx)}&lt;/pre&gt;`;
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
import {
  createChart,
  configure,
  switchTheme,
  type TooltipContext,
} from '@bndynet/icharts';
import { useTheme } from '@bndynet/vue-site';

const { theme } = useTheme();

const chartAxisEl = ref<HTMLElement>();
const chartPieEl = ref<HTMLElement>();
const chartSankeyEl = ref<HTMLElement>();

const lineData = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [{ name: 'Visitors', data: [120, 200, 150, 80, 210, 340, 310] }],
};

const pieData = [
  { name: 'North', value: 40 },
  { name: 'South', value: 35 },
  { name: 'East', value: 25 },
];

const sankeyData = {
  nodes: [
    { name: 'Visitors' },
    { name: 'Signup' },
    { name: 'Trial' },
    { name: 'Paid' },
    { name: 'Churned' },
  ],
  links: [
    { source: 'Visitors', value: 240, target: 'Signup' },
    { source: 'Signup', value: 160, target: 'Trial' },
    { source: 'Trial', value: 90, target: 'Paid' },
    { source: 'Trial', value: 70, target: 'Churned' },
  ],
};

// Render two small color swatches inline so users see the resolved
// endpoint colors at a glance — that's the whole point of the new
// `sourceColor` / `targetColor` fields.
function swatchRowHtml(ctx: TooltipContext): string {
  if (ctx.kind !== 'edge') return '';
  const src = ctx.sourceColor ?? 'transparent';
  const tgt = ctx.targetColor ?? 'transparent';
  const swatch = (color: string): string =>
    `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;` +
    `background:${color};border:1px solid rgba(127,127,127,.4);` +
    `vertical-align:middle;margin-right:6px"></span>`;
  return (
    `<div style="font-weight:600;margin-bottom:4px">` +
    `tooltip.customHtml — ctx (kind: <code>${ctx.kind}</code>)` +
    `</div>` +
    `<div style="margin-bottom:6px">` +
    `${swatch(src)}<code>${ctx.source}</code>` +
    `<span style="margin:0 6px">→</span>` +
    `${swatch(tgt)}<code>${ctx.target}</code>` +
    `</div>`
  );
}

// Escape HTML so the JSON dump can't break out of the tooltip /
// inject markup (the marker field, for example, is itself raw
// HTML for the legend swatch).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Pretty-print the full TooltipContext payload in a fixed-width
// block so users can see exactly which fields are populated for
// each `ctx.kind` (axis / item / edge).
function formatCtx(ctx: TooltipContext): string {
  return escapeHtml(JSON.stringify(ctx, null, 2));
}

onMounted(() => {
  configure({ consistentColors: false });

  createChart(chartAxisEl.value!, 'line', lineData, {
    title: 'Hover: customHtml replaces the default tooltip body',
    tooltip: {
      placeholder: 'Loading detail…',
      // customHtml fully owns the body — the built-in axisValue +
      // series rows are NOT rendered. The dump below is the entire
      // tooltip content for axis-trigger charts (line / bar / area).
      customHtml: async (ctx) => {
        if (ctx.kind !== 'axis') return '';
        await new Promise<void>((r) => {
          window.setTimeout(r, 420);
        });
        return (
          `<div style="font-weight:600;margin-bottom:4px">` +
          `tooltip.customHtml — ctx (kind: <code>${ctx.kind}</code>)` +
          `</div>` +
          `<pre style="margin:0;padding:8px;` +
          `background:rgba(127,127,127,.12);border-radius:4px;` +
          `font-size:11px;line-height:1.45;max-width:340px;` +
          `white-space:pre-wrap;word-break:break-word">` +
          formatCtx(ctx) +
          `</pre>`
        );
      },
    },
  });

  createChart(chartSankeyEl.value!, 'sankey', sankeyData, {
    title: 'Hover any link: customHtml renders sourceColor + targetColor',
    tooltip: {
      placeholder: 'Loading detail…',
      // Renders two swatches above the JSON dump using the
      // sourceColor / targetColor fields the library now resolves
      // from the source/target node names. ECharts' own params.color
      // is the literal string "gradient" for sankey links, so this
      // is the only reliable way to surface link endpoint colors.
      customHtml: async (ctx) => {
        if (ctx.kind !== 'edge') return '';
        await new Promise<void>((r) => {
          window.setTimeout(r, 380);
        });
        return (
          swatchRowHtml(ctx) +
          `<pre style="margin:0;padding:8px;` +
          `background:rgba(127,127,127,.12);border-radius:4px;` +
          `font-size:11px;line-height:1.45;max-width:340px;` +
          `white-space:pre-wrap;word-break:break-word">` +
          formatCtx(ctx) +
          `</pre>`
        );
      },
    },
  });

  createChart(chartPieEl.value!, 'pie', pieData, {
    title: 'Hover slice: appendHtml keeps the default body',
    tooltip: {
      placeholder: 'Loading…',
      // appendHtml keeps the default name + value + percent row
      // (you'll see it above the dump) and adds the ctx inspector
      // below it, separated by a thin dashed rule emitted by the
      // library's own wrap layer.
      appendHtml: async (ctx) => {
        if (ctx.kind !== 'item') return '';
        await new Promise<void>((r) => {
          window.setTimeout(r, 350);
        });
        return (
          `<div style="font-weight:600;margin-bottom:4px">` +
          `tooltip.appendHtml — ctx (kind: <code>${ctx.kind}</code>)` +
          `</div>` +
          `<pre style="margin:0;padding:8px;` +
          `background:rgba(127,127,127,.12);border-radius:4px;` +
          `font-size:11px;line-height:1.45;max-width:340px;` +
          `white-space:pre-wrap;word-break:break-word">` +
          formatCtx(ctx) +
          `</pre>`
        );
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
