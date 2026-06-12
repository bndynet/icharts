import{d as c,o as u,a as p,c as x,b as e,w as r,e as f,f as l,F as v,r as m}from"./index-B6IDcwPx.js";import{c as i}from"./api-6F-8kEI9.js";import{S as C,D as s,a as S}from"./DemoCard-ClnI8xzw.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const _=c({__name:"RadarCharts",setup(g){const t=m(),n=m(),d={indicators:[{name:"Sales",max:6500},{name:"Administration",max:16e3},{name:"IT",max:3e4},{name:"Support",max:38e3},{name:"Development",max:52e3},{name:"Marketing",max:25e3}],series:[{name:"Allocated Budget",values:[4200,3e3,2e4,35e3,5e4,18e3]},{name:"Actual Spending",values:[5e3,14e3,28e3,26e3,42e3,21e3]}]},o={indicators:[{name:"Speed",max:100},{name:"Strength",max:100},{name:"Agility",max:100},{name:"Stamina",max:100},{name:"Accuracy",max:100},{name:"Strategy",max:100}],series:[{name:"Player A",values:[90,70,85,80,75,65]},{name:"Player B",values:[70,90,65,75,80,85]},{name:"Player C",values:[80,75,90,70,85,78]}]};return u(()=>{i(t.value.chartEl,"radar",d,{title:"Budget vs Spending"}),i(n.value.chartEl,"radar",o,{title:"Player Skill Profile",variant:"circle",filled:!1})}),(k,a)=>(p(),x(v,null,[e(C,null,{default:r(()=>[...a[0]||(a[0]=[f("Radar Charts",-1)])]),_:1}),e(S,null,{default:r(()=>[e(s,{ref_key:"radarCard",ref:t,title:"Radar Chart",tag:'type="radar"'},{code:r(()=>[...a[1]||(a[1]=[l("pre",{class:"code-block"},`createChart(el, 'radar', {
  indicators: [
    { name: 'Sales',          max: 6500 },
    { name: 'Administration', max: 16000 },
    { name: 'IT',             max: 30000 },
    { name: 'Support',        max: 38000 },
    { name: 'Development',    max: 52000 },
    { name: 'Marketing',      max: 25000 },
  ],
  series: [
    { name: 'Allocated Budget', values: [4200, 3000, 20000, 35000, 50000, 18000] },
    { name: 'Actual Spending',  values: [5000, 14000, 28000, 26000, 42000, 21000] },
  ],
}, { title: 'Budget vs Spending' });`,-1)])]),_:1},512),e(s,{ref_key:"radarCircleCard",ref:n,title:"Circular Radar",tag:'variant="circle"'},{code:r(()=>[...a[2]||(a[2]=[l("pre",{class:"code-block"},`createChart(el, 'radar', radarData, {
  title: 'Player Skill Profile',
  variant: 'circle',
  filled: false,
});`,-1)])]),_:1},512)]),_:1})],64))}});export{_ as default};
