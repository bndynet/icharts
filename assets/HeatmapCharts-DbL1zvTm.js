import{d as v,o as d,a as p,c as x,b as a,w as l,e as m,f as n,F as h,r}from"./index-6TRyO1YK.js";import{c as i}from"./api-Dx-cKyEY.js";import{S as g,D as s,a as f}from"./DemoCard-BZhNigyj.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const T=v({__name:"HeatmapCharts",setup(b){const u=r(),c=r(),y=r(),o={xCategories:["Mon","Tue","Wed","Thu","Fri"],yCategories:["Morning","Afternoon","Evening"],data:[{x:0,y:0,value:12},{x:1,y:0,value:8},{x:2,y:0,value:25},{x:3,y:0,value:16},{x:4,y:0,value:10},{x:0,y:1,value:4},{x:1,y:1,value:30},{x:2,y:1,value:22},{x:3,y:1,value:13},{x:4,y:1,value:19},{x:0,y:2,value:2},{x:1,y:2,value:14},{x:2,y:2,value:28},{x:3,y:2,value:17},{x:4,y:2,value:21}]};return d(()=>{i(u.value.chartEl,"heatmap",o,{title:"Weekly Activity"}),i(c.value.chartEl,"heatmap",o,{title:"Activity (labelled)",showCellLabel:!0,visualMap:{orient:"horizontal"}}),i(y.value.chartEl,"heatmap",o,{title:"Weekly Activity",colors:["#0ea5e9"],tooltip:{formatValue:t=>`${t} events`,customHtml:async t=>t.kind!=="item"?"":`<div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${t.color??"#888"}"></span>
          <strong>${t.name}</strong> — ${t.value} events
        </div>`}})}),(t,e)=>(p(),x(h,null,[a(g,null,{default:l(()=>[...e[0]||(e[0]=[m("Heatmap",-1)])]),_:1}),a(f,null,{default:l(()=>[a(s,{ref_key:"defaultCard",ref:u,title:"Default — weekly activity",tag:'type="heatmap"',"card-style":"grid-column: 1 / -1;","box-style":"height: 440px;"},{code:l(()=>[...e[1]||(e[1]=[n("pre",{class:"code-block"},`// Grid of cells over two category axes. \`x\`/\`y\` are 0-based indices
// (or the category label itself); \`value\` drives the visualMap color.
createChart(el, 'heatmap', {
  xCategories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  yCategories: ['Morning', 'Afternoon', 'Evening'],
  data: [
    { x: 0, y: 0, value: 12 }, { x: 1, y: 0, value:  8 },
    { x: 2, y: 0, value: 25 }, { x: 3, y: 0, value: 16 },
    { x: 4, y: 0, value: 10 }, { x: 0, y: 1, value:  4 },
    { x: 1, y: 1, value: 30 }, { x: 2, y: 1, value: 22 },
    { x: 3, y: 1, value: 13 }, { x: 4, y: 1, value: 19 },
    { x: 0, y: 2, value:  2 }, { x: 1, y: 2, value: 14 },
    { x: 2, y: 2, value: 28 }, { x: 3, y: 2, value: 17 },
    { x: 4, y: 2, value: 21 },
  ],
}, {
  title: 'Weekly Activity',
});`,-1)])]),_:1},512),a(s,{ref_key:"labelsCard",ref:c,title:"Cell labels + horizontal scale",tag:"showCellLabel + visualMap.orient","card-style":"grid-column: 1 / -1;","box-style":"height: 440px;"},{code:l(()=>[...e[2]||(e[2]=[n("pre",{class:"code-block"},`// showCellLabel draws each value inside its cell. The color legend
// defaults to vertical on the right — switch it to a horizontal bar
// at the bottom with \`visualMap.orient: 'horizontal'\`.
createChart(el, 'heatmap', activityData, {
  title: 'Activity (labelled)',
  showCellLabel: true,
  visualMap: { orient: 'horizontal' },
});`,-1)])]),_:1},512),a(s,{ref_key:"customTooltipCard",ref:y,title:"Custom tooltip + colors",tag:"tooltip.customHtml + colors","card-style":"grid-column: 1 / -1;","box-style":"height: 440px;"},{code:l(()=>[...e[3]||(e[3]=[n("pre",{class:"code-block"},`// The base ramp color comes from the normal color pipeline
// (colors / colorMap / theme). \`customHtml\` receives an item ctx
// with \`name\` ("x × y"), \`value\`, and the painted \`color\`.
createChart(el, 'heatmap', activityData, {
  title: 'Weekly Activity',
  colors: ['#0ea5e9'],
  tooltip: {
    formatValue: (v) => \`\${v} events\`,
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      return \`<div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:\${ctx.color}"></span>
        <strong>\${ctx.name}</strong> — \${ctx.value} events
      </div>\`;
    },
  },
});`,-1)])]),_:1},512)]),_:1})],64))}});export{T as default};
