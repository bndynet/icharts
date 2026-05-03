<template>
  <div style="max-width: 1280px; margin: 0 auto;">
    <el-alert
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 24px;"
    >
      <template #default>
        These demos drive the chart with
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">setInterval</el-tag>
        →
        <el-tag size="small" type="info" effect="plain" style="margin: 0 4px;">chart.update(nextFrame)</el-tag>.
        The library renders one frame per call and ECharts animates the value/position transitions between frames.
      </template>
    </el-alert>

    <div class="demo-grid">
      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Bar Race — Population by Country (synthetic, 1960 → {{ currentYear }})</span>
            <el-tag type="success" size="small" effect="plain">variant="race"</el-tag>
          </div>
        </template>

        <div class="race-controls">
          <el-button-group>
            <el-button :disabled="playing" size="small" @click="play">Play</el-button>
            <el-button :disabled="!playing" size="small" @click="pause">Pause</el-button>
            <el-button size="small" @click="restart">Restart</el-button>
          </el-button-group>
          <el-text type="info" size="small" style="margin-left: 12px;">
            Year: <strong>{{ currentYear }}</strong>
            · Top {{ topN }} of {{ racers.length }} countries
          </el-text>
        </div>

        <div ref="chartRaceEl" class="chart-box"></div>

        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">// Racers are registered once. Their order in `categories` is the bar identity
// that ECharts uses to match frames — never reorder, never add/remove mid-race.
const racers = ['USA', 'China', 'India', 'Brazil', 'Japan', /* ... */];

function frameFor(year: number) {
  return {
    categories: racers,
    series: [{
      name: 'Population (M)',
      data: racers.map(r =&gt; populationLookup[r][year]),   // raw values, unsorted
    }],
  };
}

const chart = createChart(el, 'bar', frameFor(1960), {
  variant: 'race',
  race: { topN: 10, frameDuration: 500 },
  colorByCategory: true,  // distinct color per racer (legend auto-hides)
  title: 'Population by Country — 1960',
});

let year = 1960;
const timer = setInterval(() =&gt; {
  year++;
  if (year &gt; 2030) { clearInterval(timer); return; }
  chart.update(frameFor(year), { title: `Population by Country — ${year}` });
}, 500);</pre>
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
  type IChartInstance,
  type XYData,
} from '@bndynet/icharts';
import { useTheme } from '@bndynet/vue-site';

const { theme } = useTheme();

const chartRaceEl = ref<HTMLElement>();
let chart: IChartInstance | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

// ── Configuration ────────────────────────────────────────────────────────────
const START_YEAR = 1960;
const END_YEAR = 2030;
const FRAME_MS = 500;
const topN = 10;

const playing = ref(false);
const currentYear = ref(START_YEAR);

// ── Synthetic dataset ────────────────────────────────────────────────────────
// Racers stay constant across all frames. Growth rates are deliberately
// exaggerated (well beyond real-world demographics) to produce frequent,
// visible overtakes — the point of the demo is the race effect, not realism.
interface RacerSpec {
  name: string;
  start: number;        // population at START_YEAR (millions)
  rate: number;         // base annual growth rate (e.g. 0.05 = 5% — exaggerated)
  plateauYear?: number; // after this year, rate falls to `plateauRate`
  plateauRate?: number; // post-plateau growth rate (default: 0.005)
}

const racerSpecs: RacerSpec[] = [
  // Heavyweights that slow down or decline — set up to be overtaken
  { name: 'China',       start: 660,  rate: 0.025, plateauYear: 1990, plateauRate: 0.002 },
  { name: 'Russia',      start: 120,  rate: 0.008, plateauYear: 1990, plateauRate: -0.003 },
  { name: 'Japan',       start: 92,   rate: 0.015, plateauYear: 2000, plateauRate: -0.002 },
  { name: 'Germany',     start: 73,   rate: 0.008, plateauYear: 2000, plateauRate: 0.001 },

  // Mid-pack with moderate growth
  { name: 'India',       start: 449,  rate: 0.030 },
  { name: 'USA',         start: 186,  rate: 0.018 },
  { name: 'Indonesia',   start: 88,   rate: 0.028 },
  { name: 'Brazil',      start: 73,   rate: 0.030, plateauYear: 2005, plateauRate: 0.008 },
  { name: 'Mexico',      start: 38,   rate: 0.035, plateauYear: 2010, plateauRate: 0.010 },
  { name: 'Vietnam',     start: 35,   rate: 0.032, plateauYear: 2010, plateauRate: 0.008 },
  { name: 'Egypt',       start: 27,   rate: 0.035 },
  { name: 'Bangladesh',  start: 49,   rate: 0.035, plateauYear: 2005, plateauRate: 0.012 },

  // Rocket risers — climb through the top 10 over the decades
  { name: 'Pakistan',    start: 45,   rate: 0.050 },
  { name: 'Nigeria',     start: 45,   rate: 0.060 },
  { name: 'Ethiopia',    start: 22,   rate: 0.065 },
];

const racers = racerSpecs.map((r) => r.name);

function populationAt(spec: RacerSpec, year: number): number {
  let value = spec.start;
  for (let y = START_YEAR + 1; y <= year; y++) {
    const inPlateau = spec.plateauYear !== undefined && y > spec.plateauYear;
    const rate = inPlateau ? (spec.plateauRate ?? 0.005) : spec.rate;
    value *= 1 + rate;
  }
  return Math.round(value);
}

function frameFor(year: number): XYData {
  return {
    categories: racers,
    series: [
      {
        name: 'Population (M)',
        data: racerSpecs.map((s) => populationAt(s, year)),
      },
    ],
  };
}

// ── Playback ─────────────────────────────────────────────────────────────────
function tick(): void {
  if (currentYear.value >= END_YEAR) {
    pause();
    return;
  }
  currentYear.value += 1;
  chart?.update(frameFor(currentYear.value), {
    title: titleFor(currentYear.value),
  });
}

function play(): void {
  if (playing.value || !chart) return;
  if (currentYear.value >= END_YEAR) return;
  playing.value = true;
  timer = setInterval(tick, FRAME_MS);
}

function pause(): void {
  playing.value = false;
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function restart(): void {
  pause();
  currentYear.value = START_YEAR;
  chart?.update(frameFor(START_YEAR), { title: titleFor(START_YEAR) });
  play();
}

function titleFor(year: number): string {
  return `Population by Country — ${year}`;
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  configure({ consistentColors: false });

  chart = createChart(chartRaceEl.value!, 'bar', frameFor(START_YEAR), {
    variant: 'race',
    race: { topN, frameDuration: FRAME_MS },
    colorByCategory: true,
    title: titleFor(START_YEAR),
  });

  switchTheme(theme.value);
  play();
});

onUnmounted(() => {
  pause();
  chart?.dispose();
  chart = null;
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

.race-controls {
  display: flex;
  align-items: center;
  padding-bottom: 12px;
}

.chart-box {
  height: 460px;
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
