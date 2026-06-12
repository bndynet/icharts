import{d as h,o as v,a as F,c as S,b as a,w as t,e as T,f as r,F as A,r as s}from"./index-B6IDcwPx.js";import{c as i}from"./api-6F-8kEI9.js";import{S as b,D as n,a as E}from"./DemoCard-ClnI8xzw.js";import{x as f}from"./sharedData-B5v8ntqg.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const B=h({__name:"LineAreaCharts",setup(L){const o=s(),l=s(),d=s(),m=s(),c=s(),k=s(),p=s(),u=s(),M={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visits",data:[820,932,901,934,1290,1330,1520]}]},C={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Direct",data:[320,302,301,334,390,330,320]},{name:"Search",data:[120,132,101,134,90,230,210]},{name:"Referral",data:[220,182,191,234,290,330,310]}]},D={categories:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],series:[{name:"Trend",data:[5,8,3,12,6,9,15,7,11,4,8,13,6,10,14,3,9,7,12,8]}]},Y={categories:["2024-01-01","2024-02-01","2024-03-01","2024-04-01","2024-05-01","2024-06-01"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Expenses",data:[620,732,701,734,1090,1130]}]},g=Date.UTC(2024,0,1),x={categories:Array.from({length:7},(y,e)=>g+e*864e5),series:[{name:"Visits",data:[120,145,98,167,203,180,221]}]};return v(()=>{i(o.value.chartEl,"line",f,{title:"Monthly Financials"}),i(l.value.chartEl,"area",M,{title:"Weekly Visits"}),i(d.value.chartEl,"area",C,{stacked:!0,title:"Traffic Sources"}),i(m.value.chartEl,"line",f,{title:"With Mark Lines",series:{"*":{markLines:["average"],markPoints:["max","min"]}}}),i(c.value.chartEl,"line",D,{variant:"spark"}),i(k.value.chartEl,"area",D,{variant:"spark",series:{"*":{smooth:.6}}}),i(p.value.chartEl,"line",Y,{title:"Monthly Revenue (Date Strings)",xAxis:{dateFormat:"MM/DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}}),i(u.value.chartEl,"area",x,{title:"Daily Visits (Timestamps)",xAxis:{dateFormat:"MM-DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}})}),(y,e)=>(F(),S(A,null,[a(b,null,{default:t(()=>[...e[0]||(e[0]=[T("Line & Area Charts",-1)])]),_:1}),a(E,null,{default:t(()=>[a(n,{ref_key:"lineCard",ref:o,title:"Line Chart",tag:'type="line"'},{code:t(()=>[...e[1]||(e[1]=[r("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
}, { title: 'Monthly Financials' });`,-1)])]),_:1},512),a(n,{ref_key:"areaCard",ref:l,title:"Area Chart",tag:'type="area"'},{code:t(()=>[...e[2]||(e[2]=[r("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  series: [{ name: 'Visits', data: [820,932,901,934,1290,1330,1520] }],
}, { title: 'Weekly Visits' });`,-1)])]),_:1},512),a(n,{ref_key:"stackedAreaCard",ref:d,title:"Stacked Area",tag:"stacked: true"},{code:t(()=>[...e[3]||(e[3]=[r("pre",{class:"code-block"},`createChart(el, 'area', data, {
  stacked: true,
  title: 'Traffic Sources',
});`,-1)])]),_:1},512),a(n,{ref_key:"markCard",ref:m,title:"Line with Mark Lines",tag:"markLines / markPoints"},{code:t(()=>[...e[4]||(e[4]=[r("pre",{class:"code-block"},`createChart(el, 'line', data, {
  series: {
    '*': {
      markLines: ['average'],
      markPoints: ['max', 'min'],
    },
  },
});`,-1)])]),_:1},512),a(n,{ref_key:"sparkCard",ref:c,title:"Spark Line",tag:'variant="spark"',"box-style":"height: 80px;"},{code:t(()=>[...e[5]||(e[5]=[r("pre",{class:"code-block"},"createChart(el, 'line', data, { variant: 'spark' });",-1)])]),_:1},512),a(n,{ref_key:"sparkAreaCard",ref:k,title:"Spark Area",tag:'type="area" variant="spark"',"box-style":"height: 80px;"},{code:t(()=>[...e[6]||(e[6]=[r("pre",{class:"code-block"},"createChart(el, 'area', data, { variant: 'spark', series: { '*': { smooth: 0.6 } } });",-1)])]),_:1},512),a(n,{ref_key:"timeStrCard",ref:p,title:"Time Axis — Date Strings",tag:"categories: ['2024-01-01', ...]"},{code:t(()=>[...e[7]||(e[7]=[r("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['2024-01-01','2024-02-01','2024-03-01',...],
  series: [{ name: 'Revenue', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`,-1)])]),_:1},512),a(n,{ref_key:"timeTsCard",ref:u,title:"Time Axis — Unix Timestamps",tag:"categories: [1704067200000, ...]"},{code:t(()=>[...e[8]||(e[8]=[r("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: [/* 13-digit ms timestamps */],
  series: [{ name: 'Visits', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`,-1)])]),_:1},512)]),_:1})],64))}});export{B as default};
