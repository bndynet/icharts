<template>
  <SectionDivider>Map</SectionDivider>
  <DemoGrid>
    <DemoCard
      ref="basicCard"
      title="Basic — required options only"
      tag='type="map"'
      card-style="grid-column: 1 / -1;"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Lazy-load the heavy GeoJSON at runtime instead of bundling it
// into the initial JS chunk.
const chinaGeoJson = await fetch(
  new URL('../../assets/china.geo.json', import.meta.url).href,
).then((r) => r.json());
// Optional: drop tiny inset islands to maximize mainland viewport usage.
chinaGeoJson.features = chinaGeoJson.features.filter(
  (f) => f.properties?.name && f.properties.name !== '南海诸岛',
);
// Optional: keep only the largest polygon for Hainan to drop tiny offshore islets.
const hainan = chinaGeoJson.features.find((f) => f.properties?.name === '海南省');
if (hainan?.geometry?.type === 'MultiPolygon') {
  hainan.geometry.coordinates = [hainan.geometry.coordinates
    .slice()
    .sort((a, b) => polygonArea(b[0]) - polygonArea(a[0]))[0]];
}
registerMap('china', chinaGeoJson);

createChart(el, 'map', [
  { name: '北京市', value: 92 },
  { name: '上海市', value: 88 },
  { name: '广东省', value: 97 },
  { name: '浙江省', value: 85 },
], {
  // only required option:
  mapName: 'china',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="advancedCard"
      title="Advanced — visualMap + roam + custom tooltip"
      tag="visualMap + roam + customHtml + item.color"
      card-style="grid-column: 1 / -1;"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Advanced usage: interaction, labels, value range, custom tooltip,
// and overflow label hiding.
createChart(el, 'map', [
  { name: '北京市', value: 92 },
  { name: '上海市', value: 88 },
  { name: '广东省', value: 97 },
  { name: '浙江省', value: 85 },
], {
  title: '中国地图（自定义 Tooltip）',
  mapName: 'china',
  roam: 'scale',
  showLabel: true,
  autoHideOverflowLabel: true,
  labelFontSize: 13,
  visualMap: { min: 60, max: 100 },
  tooltip: {
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      return `&lt;div style="display:flex;align-items:center;gap:8px"&gt;
        &lt;span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ctx.color}"&gt;&lt;/span&gt;
        &lt;strong&gt;${ctx.name}&lt;/strong&gt; — ${ctx.value}
      &lt;/div&gt;`;
    },
  },
});</pre>
      </template>
    </DemoCard>
  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  createChart,
  registerMap,
  type MapData,
} from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

type CardRef = InstanceType<typeof DemoCard>;

const basicCard = ref<CardRef>();
const advancedCard = ref<CardRef>();

const mapData: MapData = [
  { name: '北京市', value: 92 },
  { name: '上海市', value: 88 },
  { name: '广东省', value: 97 },
  { name: '浙江省', value: 85 },
  { name: '四川省', value: 79 },
  { name: '湖北省', value: 76 },
];

const chinaGeoJsonUrl = new URL('../../assets/china.geo.json', import.meta.url).href;

type Ring = number[][];
type Polygon = Ring[];
type MultiPolygon = Polygon[];
type GeoFeature = {
  properties?: { name?: string };
  geometry?: {
    type?: 'Polygon' | 'MultiPolygon' | string;
    coordinates?: unknown;
  };
};
type ChinaGeoJson = {
  type: string;
  features?: GeoFeature[];
  [key: string]: unknown;
};

function polygonArea(ring: Ring): number {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!Array.isArray(a) || !Array.isArray(b)) continue;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum / 2);
}

function keepLargestHainanPolygon(features: GeoFeature[]): void {
  const hainan = features.find((f) => f.properties?.name?.trim() === '海南省');
  if (!hainan || hainan.geometry?.type !== 'MultiPolygon') return;
  const coords = hainan.geometry.coordinates as MultiPolygon | undefined;
  if (!Array.isArray(coords) || coords.length <= 1) return;
  const sorted = [...coords].sort((a, b) => polygonArea(b[0] ?? []) - polygonArea(a[0] ?? []));
  hainan.geometry.coordinates = [sorted[0]];
}

async function loadChinaGeoJson(): Promise<Record<string, unknown>> {
  const res = await fetch(chinaGeoJsonUrl);
  if (!res.ok) {
    throw new Error(`Failed to load china.geo.json: ${res.status} ${res.statusText}`);
  }
  const raw = (await res.json()) as ChinaGeoJson;
  // Remove unnamed / South China Sea inset islands so the mainland map
  // occupies more space in compact demo cards.
  raw.features = (raw.features ?? []).filter((f) => {
    const name = f.properties?.name?.trim();
    return Boolean(name) && name !== '南海诸岛';
  });
  // In this dataset, many tiny offshore polygons are embedded inside
  // the "海南省" MultiPolygon feature. Keep only the largest polygon so
  // the mainland viewport isn't compressed by those tiny islands.
  keepLargestHainanPolygon(raw.features);
  return raw as Record<string, unknown>;
}

onMounted(async () => {
  const chinaGeoJson = await loadChinaGeoJson();
  registerMap('china', chinaGeoJson);

  createChart(basicCard.value!.chartEl!, 'map', mapData, {
    mapName: 'china',
  });

  createChart(advancedCard.value!.chartEl!, 'map', [
    { name: '北京市', value: 92 },
    { name: '上海市', value: 88 },
    { name: '广东省', value: 97 },
    { name: '浙江省', value: 85 },
  ], {
    title: '中国地图（自定义 Tooltip）',
    mapName: 'china',
    roam: 'scale',
    showLabel: true,
    autoHideOverflowLabel: true,
    labelFontSize: 13,
    visualMap: { min: 60, max: 100 },
    tooltip: {
      customHtml: async (ctx) => {
        if (ctx.kind !== 'item') return '';
        return `<div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ctx.color ?? '#888'}"></span>
          <strong>${ctx.name}</strong> — ${ctx.value}
        </div>`;
      },
    },
  });
});
</script>
