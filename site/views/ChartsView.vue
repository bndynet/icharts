<template>
  <div class="charts-page">
    <LineAreaCharts />
    <BarCharts />
    <PieCharts />
    <RadarCharts />
    <GaugeCharts />
    <WebComponentCharts />
    <ChordCharts />
    <SankeyCharts />
    <AdvancedCharts />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { configure, switchTheme } from '@bndynet/icharts';
import { useTheme } from '@bndynet/vue-site';

import LineAreaCharts from './charts/LineAreaCharts.vue';
import BarCharts from './charts/BarCharts.vue';
import PieCharts from './charts/PieCharts.vue';
import RadarCharts from './charts/RadarCharts.vue';
import GaugeCharts from './charts/GaugeCharts.vue';
import ChordCharts from './charts/ChordCharts.vue';
import SankeyCharts from './charts/SankeyCharts.vue';
import WebComponentCharts from './charts/WebComponentCharts.vue';
import AdvancedCharts from './charts/AdvancedCharts.vue';

const { theme } = useTheme();

// Child components create their charts in their own onMounted hooks, which Vue
// runs before this parent hook. By the time we get here every chart is alive,
// so a single switchTheme() applies the active theme uniformly.
onMounted(() => {
  configure({ consistentColors: false });
  switchTheme(theme.value);
});

onUnmounted(() => {
  configure({ consistentColors: false });
});
</script>

<style scoped>
.charts-page {
  max-width: 1280px;
  margin: 0 auto;
}
</style>
