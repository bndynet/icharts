import{d as v,o as h,g as f,a as M,c as C,b as n,w as u,e as x,f as m,F as b,r as d}from"./index-B6IDcwPx.js";import{c as i}from"./api-6F-8kEI9.js";import{S as P,D as g,a as _}from"./DemoCard-ClnI8xzw.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const S=700,y=v({__name:"GaugeCharts",setup(U){const o=d(),c=d();let t=null,r=null,l=null;function s(a,e,p){return Math.min(e,Math.max(a,p))}return h(()=>{let a=72,e=85;t=i(o.value.chartEl,"gauge",{value:a,max:100,label:"Score"},{title:"Performance Score"}),r=i(c.value.chartEl,"gauge",{value:e,max:100,label:"CPU"},{title:"CPU Usage",variant:"percentage"}),l=setInterval(()=>{a=Math.round(s(0,100,a+(Math.random()-.5)*8)),e=Math.round(s(5,98,e+(Math.random()-.5)*6)),t==null||t.update({value:a}),r==null||r.update({value:e})},S)}),f(()=>{l!==null&&(clearInterval(l),l=null)}),(a,e)=>(M(),C(b,null,[n(P,null,{default:u(()=>[...e[0]||(e[0]=[x("Gauge Charts",-1)])]),_:1}),n(_,null,{default:u(()=>[n(g,{ref_key:"gaugeCard",ref:o,title:"Gauge (live)",tag:'type="gauge" · live'},{code:u(()=>[...e[1]||(e[1]=[m("pre",{class:"code-block"},`const chart = createChart(el, 'gauge', {
  value: 72, max: 100, label: 'Score',
}, { title: 'Performance Score' });

let value = 72;
setInterval(() => {
  value = Math.round(Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 8)));
  // Omitted max/label reuse the previous frame; pass '' to clear label.
  chart.update({ value });
}, 800);`,-1)])]),_:1},512),n(g,{ref_key:"gaugePctCard",ref:c,title:"Percentage Gauge (live)",tag:'variant="percentage" · live'},{code:u(()=>[...e[2]||(e[2]=[m("pre",{class:"code-block"},`const chart = createChart(el, 'gauge', {
  value: 85, max: 100, label: 'CPU',
}, { title: 'CPU Usage', variant: 'percentage' });

let cpu = 85;
setInterval(() => {
  cpu = Math.round(Math.max(5, Math.min(98, cpu + (Math.random() - 0.5) * 6)));
  chart.update({ value: cpu });
}, 600);`,-1)])]),_:1},512)]),_:1})],64))}});export{y as default};
