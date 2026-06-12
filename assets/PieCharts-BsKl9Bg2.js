import{d as g,o as m,a as h,c as f,b as a,w as t,e as C,f as n,F as v,r as o}from"./index-B6IDcwPx.js";import{c as i}from"./api-6F-8kEI9.js";import{S as k,D as l,a as D}from"./DemoCard-ClnI8xzw.js";import{p as r}from"./sharedData-B5v8ntqg.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const E=g({__name:"PieCharts",setup(_){const s=o(),u=o(),d=o();return m(()=>{const p=r.reduce((e,c)=>e+c.value,0);i(s.value.chartEl,"pie",r,{title:"Browser Market Share"}),i(u.value.chartEl,"pie",r,{title:"Browser Market Share",variant:"doughnut",legend:{show:!0,position:"right"},centerLabels:[`${p}`,"TOTAL"]}),i(d.value.chartEl,"pie",r,{title:"Nightingale Rose",variant:"nightingale"})}),(p,e)=>(h(),f(v,null,[a(k,null,{default:t(()=>[...e[0]||(e[0]=[C("Pie Charts",-1)])]),_:1}),a(D,null,{default:t(()=>[a(l,{ref_key:"pieCard",ref:s,title:"Pie Chart",tag:'type="pie"'},{code:t(()=>[...e[1]||(e[1]=[n("pre",{class:"code-block"},`createChart(el, 'pie', [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
], { title: 'Browser Market Share' });`,-1)])]),_:1},512),a(l,{ref_key:"doughnutCard",ref:u,title:"Doughnut",tag:'variant="doughnut"'},{code:t(()=>[...e[2]||(e[2]=[n("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  variant: 'doughnut',
  legend: { show: true, position: 'right' },
  centerLabels: [
    \`\${pieData.reduce((sum, item) => sum + item.value, 0)}\`,
    'Total',
  ],
});`,-1)])]),_:1},512),a(l,{ref_key:"roseCard",ref:d,title:"Nightingale Rose",tag:'variant="nightingale"'},{code:t(()=>[...e[3]||(e[3]=[n("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  variant: 'nightingale',
});`,-1)])]),_:1},512)]),_:1})],64))}});export{E as default};
