import{d as w,o as k,a as A,c as C,b as s,w as l,e as M,f as d,F as G,r as f}from"./index-B6IDcwPx.js";import{c as h}from"./api-6F-8kEI9.js";import{r as J}from"./map-registry-7-_p9BYM.js";import{S as L,D as y,a as N}from"./DemoCard-ClnI8xzw.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const B=w({__name:"MapCharts",setup(_){const m=f(),c=f(),g=[{name:"北京市",value:92},{name:"上海市",value:88},{name:"广东省",value:97},{name:"浙江省",value:85},{name:"四川省",value:79},{name:"湖北省",value:76}],v=new URL("/icharts/assets/china.geo-CxOP5e91.json",import.meta.url).href;function u(a){if(!Array.isArray(a)||a.length<3)return 0;let e=0;for(let n=0;n<a.length;n+=1){const o=a[n],t=a[(n+1)%a.length];!Array.isArray(o)||!Array.isArray(t)||(e+=o[0]*t[1]-t[0]*o[1])}return Math.abs(e/2)}function b(a){var t;const e=a.find(r=>{var i,p;return((p=(i=r.properties)==null?void 0:i.name)==null?void 0:p.trim())==="海南省"});if(!e||((t=e.geometry)==null?void 0:t.type)!=="MultiPolygon")return;const n=e.geometry.coordinates;if(!Array.isArray(n)||n.length<=1)return;const o=[...n].sort((r,i)=>u(i[0]??[])-u(r[0]??[]));e.geometry.coordinates=[o[0]]}async function x(){const a=await fetch(v);if(!a.ok)throw new Error(`Failed to load china.geo.json: ${a.status} ${a.statusText}`);const e=await a.json();return e.features=(e.features??[]).filter(n=>{var t,r;const o=(r=(t=n.properties)==null?void 0:t.name)==null?void 0:r.trim();return!!o&&o!=="南海诸岛"}),b(e.features),e}return k(async()=>{const a=await x();J("china",a),h(m.value.chartEl,"map",g,{mapName:"china"}),h(c.value.chartEl,"map",[{name:"北京市",value:92},{name:"上海市",value:88},{name:"广东省",value:97},{name:"浙江省",value:85}],{title:"中国地图（自定义 Tooltip）",mapName:"china",roam:"scale",showLabel:!0,autoHideOverflowLabel:!0,labelFontSize:13,visualMap:{min:60,max:100},tooltip:{customHtml:async e=>e.kind!=="item"?"":`<div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${e.color??"#888"}"></span>
          <strong>${e.name}</strong> — ${e.value}
        </div>`}})}),(a,e)=>(A(),C(G,null,[s(L,null,{default:l(()=>[...e[0]||(e[0]=[M("Map",-1)])]),_:1}),s(N,null,{default:l(()=>[s(y,{ref_key:"basicCard",ref:m,title:"Basic — required options only",tag:'type="map"',"card-style":"grid-column: 1 / -1;","box-style":"height: 460px;"},{code:l(()=>[...e[1]||(e[1]=[d("pre",{class:"code-block"},`// Lazy-load the heavy GeoJSON at runtime instead of bundling it
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
});`,-1)])]),_:1},512),s(y,{ref_key:"advancedCard",ref:c,title:"Advanced — visualMap + roam + custom tooltip",tag:"visualMap + roam + customHtml + item.color","card-style":"grid-column: 1 / -1;","box-style":"height: 460px;"},{code:l(()=>[...e[2]||(e[2]=[d("pre",{class:"code-block"},`// Advanced usage: interaction, labels, value range, custom tooltip,
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
      return \`<div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:\${ctx.color}"></span>
        <strong>\${ctx.name}</strong> — \${ctx.value}
      </div>\`;
    },
  },
});`,-1)])]),_:1},512)]),_:1})],64))}});export{B as default};
