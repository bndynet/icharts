<template>
  <el-card shadow="hover" :style="cardStyle">
    <template #header>
      <div class="card-head">
        <span>{{ title }}</span>
        <slot name="tag">
          <el-tag v-if="tag" type="info" size="small" effect="plain">{{ tag }}</el-tag>
        </slot>
      </div>
    </template>

    <div class="chart-box" :style="boxStyle">
      <slot>
        <div ref="chartEl" class="chart-default"></div>
      </slot>
    </div>

    <details v-if="$slots.code">
      <summary>Show code</summary>
      <slot name="code" />
    </details>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { StyleValue } from 'vue';

interface Props {
  /** Card header title. */
  title: string;
  /** Right-aligned info tag in the header (shorthand for the `tag` slot). */
  tag?: string;
  /** Inline override for the outer `el-card` (e.g. `grid-column: 1/-1`). */
  cardStyle?: StyleValue;
  /** Inline override for the chart container (e.g. custom height). */
  boxStyle?: StyleValue;
}

defineProps<Props>();

/**
 * Chart container element. Parent components retrieve it via `cardRef.value.chartEl`
 * and hand it to `createChart()`. When the default slot is used (e.g. for an
 * `<i-chart>` web component), this ref is undefined and not needed.
 */
const chartEl = ref<HTMLElement>();
defineExpose({ chartEl });
</script>

<style scoped>
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-box {
  height: 320px;
}

.chart-default {
  width: 100%;
  height: 100%;
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

:slotted(pre.code-block) {
  padding: 12px;
  margin: 0;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-small);
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  color: var(--el-text-color-secondary);
}
</style>
