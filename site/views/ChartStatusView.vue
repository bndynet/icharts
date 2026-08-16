<template>
  <div class="status-page">
    <SectionDivider>
      Chart Status
      <template #extra>
        <el-tag size="small" type="info" style="margin-left: 8px">loading · empty · error</el-tag>
      </template>
    </SectionDivider>

    <el-alert type="info" show-icon :closable="false" style="margin-bottom: 16px">
      <template #default>
        Keep the last chart frame visible while refreshing, show a clear empty state for
        filter results, or present a retry action after a request fails. Both
        <code>createChart()</code> and <code>&lt;i-chart&gt;</code> support custom HTML
        with images, icons, and buttons.
      </template>
    </el-alert>

    <DemoGrid>
      <DemoCard title="Default status UI" tag="built-in overlay">
        <div class="status-demo">
          <div class="status-controls">
            <el-button-group>
              <el-button size="small" @click="setDefaultStatus('loading')">Loading</el-button>
              <el-button size="small" @click="setDefaultStatus('empty')">Empty</el-button>
              <el-button size="small" type="danger" @click="setDefaultStatus('error')">Error</el-button>
              <el-button size="small" type="success" @click="setDefaultStatus('ready')">Ready</el-button>
            </el-button-group>
          </div>
          <div ref="defaultChartEl" class="status-chart"></div>
        </div>
        <template #code>
          <pre v-pre class="code-block">const chart = createChart(el, 'line', data, {
  title: 'Weekly report',
  // No statusRenderer: icharts shows its built-in overlay and spinner.
});

chart.setStatus({ type: 'loading', message: 'Refreshing report…' });
// On success: chart.update(nextData); chart.setStatus({ type: 'ready' });
// No rows: chart.setStatus({ type: 'empty', message: 'No matching results' });
// Failure: chart.setStatus({ type: 'error', message: 'Could not load report' });</pre>
        </template>
      </DemoCard>

      <DemoCard title="Custom DOM renderer" tag="createChart · statusRenderer">
        <div class="status-demo">
          <div class="status-controls">
            <el-button-group>
              <el-button size="small" @click="setImperativeStatus('loading')">Loading</el-button>
              <el-button size="small" @click="setImperativeStatus('empty')">Empty</el-button>
              <el-button size="small" type="danger" @click="setImperativeStatus('error')">Error</el-button>
              <el-button size="small" type="success" @click="setImperativeStatus('ready')">Ready</el-button>
            </el-button-group>
          </div>
          <div ref="imperativeChartEl" class="status-chart"></div>
        </div>
        <template #code>
          <pre v-pre class="code-block">const chart = createChart(el, 'line', data, {
  statusRenderer: (status, layer) =&gt; {
    const panel = document.createElement('section');
    panel.className = 'report-state';

    const image = document.createElement('img');
    image.src = status.type === 'error'
      ? '/assets/report-error.svg'
      : '/assets/no-results.svg';
    image.alt = '';

    const message = document.createElement('p');
    message.textContent = status.message ?? 'Report unavailable';
    panel.append(image, message);

    if (status.type === 'error') {
      const retry = document.createElement('button');
      retry.textContent = 'Try again';
      retry.onclick = reloadReport;
      panel.append(retry);
    }

    layer.append(panel);
    return () =&gt; panel.remove();
  },
});

chart.setStatus({ type: 'loading', message: 'Refreshing report…' });
// On success: chart.update(nextData); chart.setStatus({ type: 'ready' });
// No rows: chart.setStatus({ type: 'empty', message: 'No matching results' });
// Failure: chart.setStatus({ type: 'error', message: 'Could not load report' });</pre>
        </template>
      </DemoCard>

      <DemoCard title="Named HTML slots" tag="&lt;i-chart&gt; · loading / empty / error">
        <div class="status-demo">
          <div class="status-controls">
            <el-button-group>
              <el-button size="small" @click="setWebComponentStatus('loading')">Loading</el-button>
              <el-button size="small" @click="setWebComponentStatus('empty')">Empty</el-button>
              <el-button size="small" type="danger" @click="setWebComponentStatus('error')">Error</el-button>
              <el-button size="small" type="success" @click="setWebComponentStatus('ready')">Ready</el-button>
            </el-button-group>
          </div>
          <i-chart ref="webComponentEl" type="line" class="status-chart status-web-component">
            <section slot="loading" class="slot-state">
              <span class="slot-spinner" aria-hidden="true"></span>
              <strong>Syncing your report</strong>
              <span>New data will appear in a moment.</span>
            </section>
            <section slot="empty" class="slot-state">
              <span class="slot-icon slot-icon-empty" aria-hidden="true">⌕</span>
              <strong>No matching results</strong>
              <span>Try changing the date range or filters.</span>
            </section>
            <section slot="error" class="slot-state">
              <img class="slot-image" :src="errorIllustration" alt="" />
              <strong>We couldn't load this report</strong>
              <span>Check your connection, then try again.</span>
              <el-button size="small" type="primary" @click="setWebComponentStatus('loading')">Try again</el-button>
            </section>
          </i-chart>
        </div>
        <template #code>
          <pre v-pre class="code-block">&lt;i-chart id="report" type="line"&gt;
  &lt;section slot="loading" class="report-state"&gt;
    &lt;img src="/assets/spinner.svg" alt="" /&gt;
    &lt;strong&gt;Syncing your report&lt;/strong&gt;
  &lt;/section&gt;
  &lt;section slot="empty" class="report-state"&gt;
    &lt;img src="/assets/no-results.svg" alt="" /&gt;
    &lt;strong&gt;No matching results&lt;/strong&gt;
  &lt;/section&gt;
  &lt;section slot="error" class="report-state"&gt;
    &lt;img src="/assets/report-error.svg" alt="" /&gt;
    &lt;strong&gt;Report unavailable&lt;/strong&gt;
    &lt;button onclick="reloadReport()"&gt;Try again&lt;/button&gt;
  &lt;/section&gt;
&lt;/i-chart&gt;

&lt;script&gt;
const chart = document.querySelector('#report');
chart.data = data;
chart.status = { type: 'loading', message: 'Refreshing…' };
// Set { type: 'ready' } after success, or 'empty' / 'error' as needed.
&lt;/script&gt;</pre>
        </template>
      </DemoCard>
    </DemoGrid>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createChart } from '@bndynet/icharts';
import SectionDivider from '../components/SectionDivider.vue';
import DemoGrid from '../components/DemoGrid.vue';
import DemoCard from '../components/DemoCard.vue';

type DemoStatus = 'loading' | 'empty' | 'error' | 'ready';

const imperativeChartEl = ref<HTMLElement>();
const defaultChartEl = ref<HTMLElement>();
const webComponentEl = ref<HTMLElement & { data?: unknown; options?: unknown; status?: unknown }>();
const defaultChart = ref<ReturnType<typeof createChart>>();
const imperativeChart = ref<ReturnType<typeof createChart>>();
const errorIllustration = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72"><rect x="8" y="8" width="80" height="56" rx="12" fill="#fff1f0"/><path d="M48 22 67 55H29L48 22Z" fill="#f56c6c"/><path d="M48 33v10m0 5v1" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>`)}`;

const data = {
  categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Visitors', data: [320, 410, 370, 520, 460, 610, 570] },
    { name: 'Signups', data: [90, 120, 105, 160, 145, 190, 175] },
  ],
};

let retryTimer: ReturnType<typeof setTimeout> | undefined;
let startupTimer: ReturnType<typeof setTimeout> | undefined;
let defaultHasData = false;
let imperativeHasData = false;
let webComponentHasData = false;

function clearRetryTimer() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = undefined;
}

function setImperativeStatus(status: DemoStatus) {
  clearRetryTimer();
  const chart = imperativeChart.value;
  if (!chart) return;
  if (status === 'ready' && !imperativeHasData) {
    chart.update(data);
    imperativeHasData = true;
  }
  chart.setStatus(status === 'ready' ? { type: 'ready' } : {
    type: status,
    message: status === 'loading'
      ? 'Refreshing the report…'
      : status === 'empty'
        ? 'No visitors match these filters.'
        : 'The report service is temporarily unavailable.',
  });
}

function setDefaultStatus(status: DemoStatus) {
  clearRetryTimer();
  const chart = defaultChart.value;
  if (!chart) return;
  if (status === 'ready' && !defaultHasData) {
    chart.update(data);
    defaultHasData = true;
  }
  chart.setStatus(status === 'ready' ? { type: 'ready' } : {
    type: status,
    message: status === 'loading'
      ? 'Refreshing the report…'
      : status === 'empty'
        ? 'No visitors match these filters.'
        : 'The report service is temporarily unavailable.',
  });
}

function setWebComponentStatus(status: DemoStatus) {
  clearRetryTimer();
  if (webComponentEl.value) {
    if (status === 'ready' && !webComponentHasData) {
      webComponentEl.value.data = data;
      webComponentEl.value.options = { title: 'Weekly report' };
      webComponentHasData = true;
    }
    webComponentEl.value.status = status === 'ready' ? { type: 'ready' } : {
      type: status,
      message: status === 'loading'
        ? 'Refreshing the report…'
        : status === 'empty'
          ? 'No visitors match these filters.'
          : 'The report service is temporarily unavailable.',
    };
  }
  if (status === 'loading') {
    retryTimer = setTimeout(() => {
      if (webComponentEl.value) webComponentEl.value.status = { type: 'ready' };
      retryTimer = undefined;
    }, 1800);
  }
}

onMounted(() => {
  if (defaultChartEl.value) {
    defaultChart.value = createChart(defaultChartEl.value, 'line', {
      categories: [],
      series: [],
    }, {
      title: 'Weekly report',
      status: { type: 'loading', message: 'Connecting to the report service…' },
    });
  }
  if (imperativeChartEl.value) {
    imperativeChart.value = createChart(imperativeChartEl.value, 'line', {
      categories: [],
      series: [],
    }, {
      title: 'Weekly report',
      status: { type: 'loading', message: 'Connecting to the report service…' },
      statusRenderer: (status, layer) => {
        const panel = document.createElement('section');
        panel.className = `chart-status-custom chart-status-custom-${status.type}`;

        const icon = document.createElement('img');
        icon.alt = '';
        icon.src = status.type === 'error'
          ? errorIllustration
          : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 72"><rect x="8" y="8" width="80" height="56" rx="12" fill="#eef5ff"/><circle cx="43" cy="34" r="13" fill="none" stroke="#409eff" stroke-width="5"/><path d="m53 44 12 12" stroke="#409eff" stroke-width="5" stroke-linecap="round"/></svg>`)}`;

        const title = document.createElement('strong');
        title.textContent = status.type === 'loading'
          ? 'Updating the report'
          : status.type === 'empty'
            ? 'Nothing to display yet'
            : 'Report temporarily unavailable';

        const message = document.createElement('span');
        message.textContent = status.message ?? '';
        panel.append(icon, title, message);

        if (status.type === 'loading') {
          const spinner = document.createElement('span');
          spinner.className = 'chart-status-demo-spinner';
          spinner.setAttribute('aria-hidden', 'true');
          panel.prepend(spinner);
        }
        if (status.type === 'error') {
          const retry = document.createElement('button');
          retry.className = 'chart-status-demo-retry';
          retry.textContent = 'Retry request';
          retry.onclick = () => {
            setImperativeStatus('loading');
            retryTimer = setTimeout(() => setImperativeStatus('ready'), 1800);
          };
          panel.append(retry);
        }

        layer.append(panel);
        return () => panel.remove();
      },
    });
  }
  if (webComponentEl.value) {
    webComponentEl.value.status = {
      type: 'loading',
      message: 'Connecting to the report service…',
    };
  }
  startupTimer = setTimeout(() => {
    if (defaultChart.value) {
      defaultChart.value.update(data);
      defaultChart.value.setStatus({ type: 'ready' });
      defaultHasData = true;
    }
    if (imperativeChart.value) {
      imperativeChart.value.update(data);
      imperativeChart.value.setStatus({ type: 'ready' });
      imperativeHasData = true;
    }
    if (webComponentEl.value) {
      webComponentEl.value.data = data;
      webComponentEl.value.options = { title: 'Weekly report' };
      webComponentEl.value.status = { type: 'ready' };
      webComponentHasData = true;
    }
    startupTimer = undefined;
  }, 10_000);
});

onUnmounted(() => {
  clearRetryTimer();
  if (startupTimer) clearTimeout(startupTimer);
});
</script>

<style>
.status-page { max-width: 1280px; margin: 0 auto; }
.status-demo { display: flex; flex-direction: column; height: 100%; gap: 10px; }
.status-controls { flex: 0 0 auto; }
.status-chart { width: 100%; height: 250px; }
.status-web-component { --ichart-status-background: color-mix(in srgb, var(--el-bg-color) 90%, transparent); }
.chart-status-custom { display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 280px; padding: 16px 20px; border: 1px solid var(--el-border-color-lighter); border-radius: 14px; background: var(--el-bg-color); box-shadow: var(--el-box-shadow-light); color: var(--el-text-color-primary); }
.chart-status-custom img { width: 68px; height: 52px; object-fit: contain; }
.chart-status-custom strong { font-size: 15px; }
.chart-status-custom span:not(.chart-status-demo-spinner) { color: var(--el-text-color-secondary); font-size: 13px; }
.chart-status-demo-spinner, .slot-spinner { width: 22px; height: 22px; border: 2px solid var(--el-color-primary); border-right-color: transparent; border-radius: 50%; animation: chart-status-spin .8s linear infinite; }
.chart-status-demo-retry { margin-top: 2px; padding: 7px 12px; border: 0; border-radius: 6px; background: var(--el-color-primary); color: white; cursor: pointer; }
.slot-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--el-text-color-primary); }
.slot-state > span:last-child { color: var(--el-text-color-secondary); font-size: 13px; }
.slot-icon { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 16px; font-size: 38px; line-height: 1; }
.slot-icon-empty { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
.slot-image { width: 76px; height: 58px; object-fit: contain; }
@keyframes chart-status-spin { to { transform: rotate(360deg); } }
</style>
