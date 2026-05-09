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
  race: { topN: 10 },              // frameDuration auto-measured from setInterval
  colorByCategory: true,           // distinct color per racer (legend auto-hides)
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

      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Live Streaming — Sensor Telemetry ({{ streamingRunning ? 'live' : 'paused' }})</span>
            <el-tag type="success" size="small" effect="plain">variant="race" · sliding window</el-tag>
          </div>
        </template>

        <div class="race-controls">
          <el-button-group>
            <el-button :disabled="streamingRunning" size="small" @click="startStreaming">Start</el-button>
            <el-button :disabled="!streamingRunning" size="small" @click="stopStreaming">Stop</el-button>
            <el-button size="small" @click="resetStreaming">Reset</el-button>
          </el-button-group>
          <el-text type="info" size="small" style="margin-left: 12px;">
            {{ STREAM_TICK_MS }}ms tick · {{ STREAM_WINDOW_S }}s sliding window
          </el-text>
        </div>

        <div ref="chartStreamingEl" class="chart-box"></div>

        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">// Sliding-window streaming. Both xAxis edges slide each tick — left =
// now - windowMs, right = now. Existing points keep their absolute
// timestamp, so they slide leftward smoothly as the window moves.
//
// IMPORTANT — pruning strategy: ECharts diffs line series by array INDEX.
// Calling `arr.shift()` every tick shifts every remaining index, which
// morphs each point to its right neighbor's old position and fights the
// axis-slide animation (visible as "shudder" at the left edge once the
// line has filled the window). Instead, keep a large buffer (e.g. 5× the
// visible window) and prune in rare batches — every dropped point is far
// off-screen by then, so the visible portion stays index-stable.
const WINDOW_MS = 60_000;
const TICK_MS   = 200;
const HIGH_MS   = WINDOW_MS * 5;  // start pruning when buffer exceeds this
const LOW_MS    = WINDOW_MS * 3;  // ...drop down to this on prune
const series = { cpu: [] as [number, number][], mem: [] as [number, number][] };

function pushAndMaybePrune() {
  const now = Date.now();
  series.cpu.push([now, randomCpu()]);
  series.mem.push([now, randomMem()]);
  const oldest = series.cpu[0]?.[0];
  if (oldest !== undefined && now - oldest &gt; HIGH_MS) {
    const cutoff = now - LOW_MS;
    while (series.cpu.length &amp;&amp; series.cpu[0][0] &lt; cutoff) series.cpu.shift();
    while (series.mem.length &amp;&amp; series.mem[0][0] &lt; cutoff) series.mem.shift();
  }
}

function frameNow() {
  return {
    categories: series.cpu.map(([t]) =&gt; t),
    series: [
      { name: 'CPU %',    data: series.cpu.map(([, v]) =&gt; v) },
      { name: 'Memory %', data: series.mem.map(([, v]) =&gt; v) },
    ],
  };
}

const chart = createChart(el, 'line', frameNow(), {
  variant: 'race',                                  // frameDuration auto-measured
  xAxis: { dateFormat: 'mm:ss', max: Date.now() },  // max slides each frame
  yAxis: { min: 0, max: 100 },                      // pinned domain — no jiggle
});

setInterval(() =&gt; {
  pushAndMaybePrune();
  const now = Date.now();
  chart.update(frameNow(), {
    xAxis: { dateFormat: 'mm:ss', min: now - WINDOW_MS, max: now },
  });
}, TICK_MS);</pre>
        </details>
      </el-card>

      <el-card shadow="hover" style="grid-column: 1 / -1;">
        <template #header>
          <div class="card-head">
            <span>Line Race — Population Trajectories (synthetic, 1960 → {{ currentYear }})</span>
            <el-tag type="success" size="small" effect="plain">variant="race"</el-tag>
          </div>
        </template>

        <el-text type="info" size="small" style="display: block; padding-bottom: 8px;">
          Same dataset, different shape: each frame extends the trail by one year. The end-of-line
          label tracks each racer's latest value via <code>endLabel.valueAnimation</code>.
        </el-text>

        <div ref="chartLineRaceEl" class="chart-box"></div>

        <details>
          <summary>Show code</summary>
          <pre v-pre class="code-block">// Series names define racer identity (stable across frames). Categories are
// ms timestamps — the adapter picks `type: 'time'` automatically and pins
// `xAxis.min` to the first one. We pin `xAxis.max` ourselves so existing
// points never move pixel-wise; the trail only grows rightward.
const racers = ['China', 'India', 'USA', 'Nigeria', 'Pakistan'];
const START_TS = Date.UTC(1960, 0, 1);
const END_TS   = Date.UTC(2031, 0, 1);

function frameFor(year: number) {
  const stamps = range(1960, year).map(y =&gt; Date.UTC(y, 0, 1));
  return {
    categories: stamps,
    series: racers.map(name =&gt; ({
      name,
      data: stamps.map((_, i) =&gt; historyLookup[name][1960 + i]),
    })),
  };
}

const chart = createChart(el, 'line', frameFor(1960), {
  variant: 'race',                                          // frameDuration auto-measured
  xAxis: { min: START_TS, max: END_TS, dateFormat: 'YYYY' },
  title: 'Population — 1960',
});

let year = 1960;
const timer = setInterval(() =&gt; {
  year++;
  if (year &gt; 2030) { clearInterval(timer); return; }
  chart.update(frameFor(year), { title: `Population — ${year}` });
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
const chartLineRaceEl = ref<HTMLElement>();
const chartStreamingEl = ref<HTMLElement>();
let chart: IChartInstance | null = null;
let lineChart: IChartInstance | null = null;
let streamChart: IChartInstance | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let streamTimer: ReturnType<typeof setInterval> | null = null;

// ── Configuration ────────────────────────────────────────────────────────────
const START_YEAR = 1960;
const END_YEAR = 2030;
const FRAME_MS = 500;
const topN = 10;

// Line race only renders a 5-racer subset — more lines and end-labels collide.
const LINE_RACERS = ['China', 'India', 'USA', 'Nigeria', 'Pakistan'];

// Streaming smoothness: emit categories as ms timestamps so the adapter picks
// `type: 'time'`. The adapter auto-pins `xAxis.min`; we additionally pin
// `xAxis.max` to the END_YEAR so the right edge doesn't drift either.
// Result: existing points stay at their absolute pixels — the new tail slides
// in smoothly rather than the whole line being recompressed each frame.
//
// IMPORTANT: these MUST appear after START_YEAR / END_YEAR are declared —
// `const` TDZ would otherwise leave both timestamps as NaN, collapsing the
// time axis to a single point and stacking all lines vertically.
const LINE_START_TS = Date.UTC(START_YEAR, 0, 1);
const LINE_END_TS = Date.UTC(END_YEAR + 1, 0, 1);
const yearToTs = (year: number): number => Date.UTC(year, 0, 1);

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

// Line race frame: categories grow each frame; every series carries its
// full trail up to `year`. Series identity is the racer name. Categories
// are ms timestamps (13 digits) — `isTimeCategories` picks them up and the
// adapter renders a time axis with the leading edge pinned.
function lineFrameFor(year: number): XYData {
  const timestamps: number[] = [];
  for (let y = START_YEAR; y <= year; y++) timestamps.push(yearToTs(y));
  const lineSpecs = racerSpecs.filter((s) => LINE_RACERS.includes(s.name));
  return {
    categories: timestamps,
    series: lineSpecs.map((spec) => ({
      name: spec.name,
      data: timestamps.map((_ts, i) => populationAt(spec, START_YEAR + i)),
    })),
  };
}

// ── Playback ─────────────────────────────────────────────────────────────────
function tick(): void {
  if (currentYear.value >= END_YEAR) {
    pause();
    return;
  }
  currentYear.value += 1;
  const newTitle = titleFor(currentYear.value);
  chart?.update(frameFor(currentYear.value), { title: newTitle });
  lineChart?.update(lineFrameFor(currentYear.value), { title: newTitle });
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
  const t = titleFor(START_YEAR);
  chart?.update(frameFor(START_YEAR), { title: t });
  lineChart?.update(lineFrameFor(START_YEAR), { title: t });
  play();
}

function titleFor(year: number): string {
  return `Population by Country — ${year}`;
}

// ── Live Streaming ───────────────────────────────────────────────────────────
// Sliding-window streaming sample. Random walk on CPU% and Memory% with a
// fixed 60-second window. Both x-axis edges slide every tick, so existing
// points keep their absolute timestamp positions and slide leftward
// uniformly — no jiggle. This is the canonical "live ticker" look.

const STREAM_WINDOW_MS = 60_000;
const STREAM_TICK_MS = 200;
const STREAM_WINDOW_S = STREAM_WINDOW_MS / 1000;

interface StreamPoint {
  t: number;
  v: number;
}

const streamingRunning = ref(false);
const streamSeries: Record<'cpu' | 'mem', StreamPoint[]> = { cpu: [], mem: [] };
let cpuLevel = 40;
let memLevel = 55;

function nextStreamValue(prev: number, drift: number): number {
  // Bounded random walk; clamp 0..100 with a soft pull toward the middle so
  // the walk doesn't get stuck against the edges.
  const pull = (50 - prev) * 0.02;
  const next = prev + pull + (Math.random() - 0.5) * drift;
  return Math.max(0, Math.min(100, next));
}

// Pruning budget: hold ~5× the visible window in memory, drop down to ~3×
// when the high-water mark is hit. Pruning ONE point per tick is what causes
// the "left-edge shudder": ECharts diffs line series by array INDEX, so a
// single shift() at the head morphs every remaining point to its right
// neighbor's old position. That morph fights the axis-slide animation and
// the left-edge clip interpolation, producing visible jitter at the moment
// the leftmost on-screen point would otherwise be sliding cleanly out of
// view. Pruning in rare, large chunks limits the morph events to once every
// ~7 minutes — and since every dropped point is already far off-screen, the
// remaining visible points morph by an amount the user can't see.
const STREAM_PRUNE_HIGH_MS = STREAM_WINDOW_MS * 5; // ~5 min total buffer
const STREAM_PRUNE_LOW_MS = STREAM_WINDOW_MS * 3;  // shrink back to ~3 min

function pushStreamPoint(): void {
  const now = Date.now();
  cpuLevel = nextStreamValue(cpuLevel, 12);
  memLevel = nextStreamValue(memLevel, 4);
  streamSeries.cpu.push({ t: now, v: Number(cpuLevel.toFixed(1)) });
  streamSeries.mem.push({ t: now, v: Number(memLevel.toFixed(1)) });

  const oldest = streamSeries.cpu[0];
  if (oldest && now - oldest.t > STREAM_PRUNE_HIGH_MS) {
    const cutoff = now - STREAM_PRUNE_LOW_MS;
    while (streamSeries.cpu.length && streamSeries.cpu[0].t < cutoff) streamSeries.cpu.shift();
    while (streamSeries.mem.length && streamSeries.mem[0].t < cutoff) streamSeries.mem.shift();
  }
}

function streamFrame(): XYData {
  return {
    categories: streamSeries.cpu.map((p) => p.t),
    series: [
      { name: 'CPU %', data: streamSeries.cpu.map((p) => p.v) },
      { name: 'Memory %', data: streamSeries.mem.map((p) => p.v) },
    ],
  };
}

function streamTick(): void {
  pushStreamPoint();
  const now = Date.now();
  streamChart?.update(streamFrame(), {
    xAxis: { min: now - STREAM_WINDOW_MS, max: now, dateFormat: 'mm:ss' },
  });
}

function startStreaming(): void {
  if (streamingRunning.value || !streamChart) return;
  streamingRunning.value = true;
  streamTimer = setInterval(streamTick, STREAM_TICK_MS);
}

function stopStreaming(): void {
  streamingRunning.value = false;
  if (streamTimer !== null) {
    clearInterval(streamTimer);
    streamTimer = null;
  }
}

function resetStreaming(): void {
  stopStreaming();
  streamSeries.cpu = [];
  streamSeries.mem = [];
  cpuLevel = 40;
  memLevel = 55;
  // Seed with one point so the chart has something to render.
  pushStreamPoint();
  const now = Date.now();
  streamChart?.update(streamFrame(), {
    xAxis: { min: now - STREAM_WINDOW_MS, max: now, dateFormat: 'mm:ss' },
  });
  startStreaming();
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  configure({ consistentColors: false });

  // `race.frameDuration` is omitted on all three race charts below — the
  // library auto-measures the interval between `chart.update()` calls and
  // uses it as the animation duration. Set it explicitly only when you
  // want to override the natural cadence.
  chart = createChart(chartRaceEl.value!, 'bar', frameFor(START_YEAR), {
    variant: 'race',
    race: { topN },
    colorByCategory: true,
    title: titleFor(START_YEAR),
  });

  lineChart = createChart(chartLineRaceEl.value!, 'line', lineFrameFor(START_YEAR), {
    variant: 'race',
    title: titleFor(START_YEAR),
    // Pin the upper bound too (adapter already auto-pins the lower bound
    // for time-axis race). Both edges fixed = existing data points never
    // move, the trail just grows rightward — true streaming feel.
    xAxis: { min: LINE_START_TS, max: LINE_END_TS, dateFormat: 'YYYY' },
  });

  // Live streaming demo: seed with one point and a sliding-window axis.
  pushStreamPoint();
  const streamNow = Date.now();
  streamChart = createChart(chartStreamingEl.value!, 'line', streamFrame(), {
    variant: 'race',
    // Pin the y-axis (0..100 percent gauge) — without this, ECharts would
    // re-fit it every tick and the lines would bob vertically.
    yAxis: { min: 0, max: 100 },
    xAxis: { min: streamNow - STREAM_WINDOW_MS, max: streamNow, dateFormat: 'mm:ss' },
  });

  switchTheme(theme.value);
  play();
  startStreaming();
});

onUnmounted(() => {
  pause();
  stopStreaming();
  chart?.dispose();
  chart = null;
  lineChart?.dispose();
  lineChart = null;
  streamChart?.dispose();
  streamChart = null;
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
