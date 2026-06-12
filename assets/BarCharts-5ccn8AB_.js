import{d as u,o as m,a as B,c as h,b as a,w as r,e as g,f as t,F as b,r as o}from"./index-B6IDcwPx.js";import{c as n}from"./api-6F-8kEI9.js";import{S as p,D as s,a as S}from"./DemoCard-ClnI8xzw.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const x=u({__name:"BarCharts",setup(k){const l=o(),d=o(),i=o(),c=o(),C={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:[430,460,390,510]},{name:"Product B",data:[320,382,301,354]}]},f={categories:["Chrome","Firefox","Safari","Edge","Opera"],series:[{name:"Share %",data:[65,15,12,5,3]}]};return m(()=>{n(l.value.chartEl,"bar",C,{title:"Quarterly Sales"}),n(d.value.chartEl,"bar",C,{stacked:!0,title:"Stacked Revenue"}),n(i.value.chartEl,"bar",f,{variant:"horizontal",title:"Browser Share"}),n(c.value.chartEl,"bar",{categories:["Chrome","Firefox","Safari","Edge"],series:[{name:"Share",data:[65,15,12,8]}]},{title:"Browser Share",colorByCategory:!0,colorMap:{Chrome:"#4285F4",Firefox:"#FF7139",Safari:"#1B88CA",Edge:"#0078D7"}})}),(y,e)=>(B(),h(b,null,[a(p,null,{default:r(()=>[...e[0]||(e[0]=[g("Bar Charts",-1)])]),_:1}),a(S,null,{default:r(()=>[a(s,{ref_key:"barCard",ref:l,title:"Bar Chart",tag:'type="bar"'},{code:r(()=>[...e[1]||(e[1]=[t("pre",{class:"code-block"},`createChart(el, 'bar', {
  categories: ['Q1','Q2','Q3','Q4'],
  series: [
    { name: 'Product A', data: [430,460,390,510] },
    { name: 'Product B', data: [320,382,301,354] },
  ],
}, { title: 'Quarterly Sales' });`,-1)])]),_:1},512),a(s,{ref_key:"stackedBarCard",ref:d,title:"Stacked Bar",tag:"stacked: true"},{code:r(()=>[...e[2]||(e[2]=[t("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  stacked: true,
  title: 'Stacked Revenue',
});`,-1)])]),_:1},512),a(s,{ref_key:"hbarCard",ref:i,title:"Horizontal Bar",tag:'variant="horizontal"'},{code:r(()=>[...e[3]||(e[3]=[t("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  variant: 'horizontal',
  title: 'Browser Share',
});`,-1)])]),_:1},512),a(s,{ref_key:"colorByCategoryCard",ref:c,title:"Distinct Colors per Category",tag:"colorByCategory"},{code:r(()=>[...e[4]||(e[4]=[t("pre",{class:"code-block"},`createChart(el, 'bar', {
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
});`,-1)])]),_:1},512)]),_:1})],64))}});export{x as default};
