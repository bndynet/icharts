import{d as h,o as y,a as p,c as S,b as a,w as r,e as B,f as t,F as k,r as o}from"./index-6TRyO1YK.js";import{c as s}from"./api-Dx-cKyEY.js";import{S as v,D as l,a as x}from"./DemoCard-BZhNigyj.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const Q=h({__name:"BarCharts",setup(A){const n=o(),i=o(),d=o(),c=o(),u=o(),C=o(),b={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:[430,460,390,510]},{name:"Product B",data:[320,382,301,354]}]},f={categories:["Chrome","Firefox","Safari","Edge","Opera"],series:[{name:"Share %",data:[65,15,12,5,3]}]},m={categories:Array.from({length:24},(g,e)=>`${String(e).padStart(2,"0")}:00`),series:[{name:"Requests",data:[120,90,60,45,30,25,40,70,110,150,180,200,190,170,160,175,210,230,220,190,150,130,140,135]}]};return y(()=>{s(n.value.chartEl,"bar",b,{title:"Quarterly Sales"}),s(i.value.chartEl,"bar",b,{stacked:!0,title:"Stacked Revenue"}),s(d.value.chartEl,"bar",f,{variant:"horizontal",title:"Browser Share"}),s(c.value.chartEl,"bar",{categories:["Chrome","Firefox","Safari","Edge"],series:[{name:"Share",data:[65,15,12,8]}]},{title:"Browser Share",colorByCategory:!0,colorMap:{Chrome:"#4285F4",Firefox:"#FF7139",Safari:"#1B88CA",Edge:"#0078D7"}}),s(u.value.chartEl,"bar",{categories:["North America","South America","Europe","Africa","Asia","Oceania"],series:[{name:"Revenue",data:[920,410,720,230,840,160]}]},{title:"Revenue by Continent",xAxis:{rotate:45}}),s(C.value.chartEl,"bar",m,{title:"Hourly Requests",xAxis:{labelInterval:0,rotate:45}})}),(g,e)=>(p(),S(k,null,[a(v,null,{default:r(()=>[...e[0]||(e[0]=[B("Bar Charts",-1)])]),_:1}),a(x,null,{default:r(()=>[a(l,{ref_key:"barCard",ref:n,title:"Bar Chart",tag:'type="bar"'},{code:r(()=>[...e[1]||(e[1]=[t("pre",{class:"code-block"},`createChart(el, 'bar', {
  categories: ['Q1','Q2','Q3','Q4'],
  series: [
    { name: 'Product A', data: [430,460,390,510] },
    { name: 'Product B', data: [320,382,301,354] },
  ],
}, { title: 'Quarterly Sales' });`,-1)])]),_:1},512),a(l,{ref_key:"stackedBarCard",ref:i,title:"Stacked Bar",tag:"stacked: true"},{code:r(()=>[...e[2]||(e[2]=[t("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  stacked: true,
  title: 'Stacked Revenue',
});`,-1)])]),_:1},512),a(l,{ref_key:"hbarCard",ref:d,title:"Horizontal Bar",tag:'variant="horizontal"'},{code:r(()=>[...e[3]||(e[3]=[t("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  variant: 'horizontal',
  title: 'Browser Share',
});`,-1)])]),_:1},512),a(l,{ref_key:"colorByCategoryCard",ref:c,title:"Distinct Colors per Category",tag:"colorByCategory"},{code:r(()=>[...e[4]||(e[4]=[t("pre",{class:"code-block"},`createChart(el, 'bar', {
  categories: ['Chrome', 'Firefox', 'Safari', 'Edge'],
  series: [{ name: 'Share', data: [65, 15, 12, 8] }],
}, {
  title: 'Browser Share',
  colorByCategory: true,
  colorMap: {
    Chrome:  '#4285F4',
    Firefox: '#FF7139',
    Safari:  '#1B88CA',
    Edge:    '#0078D7',
  },
});`,-1)])]),_:1},512),a(l,{ref_key:"rotatedLabelCard",ref:u,title:"Rotated Axis Labels",tag:"xAxis.rotate"},{code:r(()=>[...e[5]||(e[5]=[t("pre",{class:"code-block"},`createChart(el, 'bar', {
  categories: ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania'],
  series: [{ name: 'Revenue', data: [920, 410, 720, 230, 840, 160] }],
}, { title: 'Revenue by Continent', xAxis: { rotate: 45 } });`,-1)])]),_:1},512),a(l,{ref_key:"labelIntervalCard",ref:C,title:"Show Every Label",tag:"xAxis.labelInterval"},{code:r(()=>[...e[6]||(e[6]=[t("pre",{class:"code-block"},`createChart(el, 'bar', {
  categories: ['00:00','01:00', ... '23:00'],
  series: [{ name: 'Requests', data: [120, 90, ...] }],
}, {
  title: 'Hourly Requests',
  xAxis: { labelInterval: 0, rotate: 45 },
});`,-1)])]),_:1},512)]),_:1})],64))}});export{Q as default};
