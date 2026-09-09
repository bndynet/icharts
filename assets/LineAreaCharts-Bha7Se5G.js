import{d as V,o as E,a as L,c as _,b as a,w as t,e as W,f as s,F as N,r as n}from"./index-8PdsKFQS.js";import{c as i}from"./api-fWJtY2PV.js";import{S as w,D as o,a as P}from"./DemoCard-B7rvElr9.js";import{x as y}from"./sharedData-B5v8ntqg.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const R=357e3,Z=1e-9,J=V({__name:"LineAreaCharts",setup($){const m=n(),c=n(),u=n(),p=n(),f=n(),k=n(),x=n(),M=n(),D=n(),v={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visits",data:[820,932,901,934,1290,1330,1520]}]},Y={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Direct",data:[320,302,301,334,390,330,320]},{name:"Search",data:[120,132,101,134,90,230,210]},{name:"Referral",data:[220,182,191,234,290,330,310]}]},C={categories:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],series:[{name:"Trend",data:[5,8,3,12,6,9,15,7,11,4,8,13,6,10,14,3,9,7,12,8]}]},b={categories:["2024-01-01","2024-02-01","2024-03-01","2024-04-01","2024-05-01","2024-06-01"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Expenses",data:[620,732,701,734,1090,1130]}]},h=Date.UTC(2024,0,1),A={categories:Array.from({length:7},(r,e)=>h+e*864e5),series:[{name:"Visits",data:[120,145,98,167,203,180,221]}]};function g(r){const e=r*1e6;return Math.abs(e)>=1?`${e.toFixed(2)} µs`:`${(r*1e9).toFixed(2)} ns`}function F(){const r=Array.from({length:R},(l,d)=>d*Z),e=r.map(l=>{const d=.45*Math.sin(2*Math.PI*18e3*l),S=.015*Math.sin(2*Math.PI*42e4*l),T=l>=22e-5?.35:0;return 3+d+S+T});return{categories:r,series:[{name:"Vout",data:e}]}}return E(()=>{const r=F();i(c.value.chartEl,"line",r,{title:"Vout — 357,000 lossless samples",legend:{show:!1},xAxis:{type:"value",includeZero:!1,formatLabel:e=>g(Number(e))},yAxis:{includeZero:!1,formatLabel:e=>`${Number(e).toFixed(2)} V`},series:{"*":{lineWidth:1.2}},dataZoom:!0,toolbox:{feature:{dataZoom:{yAxisIndex:0,title:{zoom:"区域缩放",back:"退出缩放"}},restore:{title:"还原"}}},tooltip:{customHtml:async e=>{var d;if(e.kind!=="axis")return"";const l=(d=e.series[0])==null?void 0:d.rawValue;return Array.isArray(l)?`<b>t = ${g(Number(l[0]))}</b><br/>Vout = ${Number(l[1]).toFixed(6)} V`:`${e.axisValueLabel}`}}}),i(m.value.chartEl,"line",y,{title:"Monthly Financials"}),i(u.value.chartEl,"area",v,{title:"Weekly Visits"}),i(p.value.chartEl,"area",Y,{stacked:!0,title:"Traffic Sources"}),i(f.value.chartEl,"line",y,{title:"With Mark Lines",series:{"*":{markLines:["average"],markPoints:["max","min"]}}}),i(k.value.chartEl,"line",C,{variant:"spark"}),i(x.value.chartEl,"area",C,{variant:"spark",series:{"*":{smooth:.6}}}),i(M.value.chartEl,"line",b,{title:"Monthly Revenue (Date Strings)",xAxis:{dateFormat:"MM/DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}}),i(D.value.chartEl,"area",A,{title:"Daily Visits (Timestamps)",xAxis:{dateFormat:"MM-DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}})}),(r,e)=>(L(),_(N,null,[a(w,null,{default:t(()=>[...e[0]||(e[0]=[W("Line & Area Charts",-1)])]),_:1}),a(P,null,{default:t(()=>[a(o,{ref_key:"waveformCard",ref:c,title:"Numeric Waveform — 357k Samples",tag:"value axis + auto performance + X/Y zoom","card-style":{gridColumn:"1 / -1"},"box-style":{height:"420px"}},{code:t(()=>[...e[1]||(e[1]=[s("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: timeArray,             // numeric seconds: x coordinates
  series: [{ name: 'Vout', data: values }],
}, {
  xAxis: {
    type: 'value',
    includeZero: false,
    formatLabel: (v) => \`\${Number(v) * 1e6} µs\`,
  },
  series: { '*': {
    lineWidth: 1.2,
  }},
  dataZoom: true,
  toolbox: { feature: {
    dataZoom: {
      yAxisIndex: 0,
      title: { zoom: '区域缩放', back: '退出缩放' },
    },
    restore: { title: '还原' },
  }},
});`,-1)])]),_:1},512),a(o,{ref_key:"lineCard",ref:m,title:"Line Chart",tag:'type="line"'},{code:t(()=>[...e[2]||(e[2]=[s("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
}, { title: 'Monthly Financials' });`,-1)])]),_:1},512),a(o,{ref_key:"areaCard",ref:u,title:"Area Chart",tag:'type="area"'},{code:t(()=>[...e[3]||(e[3]=[s("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  series: [{ name: 'Visits', data: [820,932,901,934,1290,1330,1520] }],
}, { title: 'Weekly Visits' });`,-1)])]),_:1},512),a(o,{ref_key:"stackedAreaCard",ref:p,title:"Stacked Area",tag:"stacked: true"},{code:t(()=>[...e[4]||(e[4]=[s("pre",{class:"code-block"},`createChart(el, 'area', data, {
  stacked: true,
  title: 'Traffic Sources',
});`,-1)])]),_:1},512),a(o,{ref_key:"markCard",ref:f,title:"Line with Mark Lines",tag:"markLines / markPoints"},{code:t(()=>[...e[5]||(e[5]=[s("pre",{class:"code-block"},`createChart(el, 'line', data, {
  series: {
    '*': {
      markLines: ['average'],
      markPoints: ['max', 'min'],
    },
  },
});`,-1)])]),_:1},512),a(o,{ref_key:"sparkCard",ref:k,title:"Spark Line",tag:'variant="spark"',"box-style":"height: 80px;"},{code:t(()=>[...e[6]||(e[6]=[s("pre",{class:"code-block"},"createChart(el, 'line', data, { variant: 'spark' });",-1)])]),_:1},512),a(o,{ref_key:"sparkAreaCard",ref:x,title:"Spark Area",tag:'type="area" variant="spark"',"box-style":"height: 80px;"},{code:t(()=>[...e[7]||(e[7]=[s("pre",{class:"code-block"},"createChart(el, 'area', data, { variant: 'spark', series: { '*': { smooth: 0.6 } } });",-1)])]),_:1},512),a(o,{ref_key:"timeStrCard",ref:M,title:"Time Axis — Date Strings",tag:"categories: ['2024-01-01', ...]"},{code:t(()=>[...e[8]||(e[8]=[s("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['2024-01-01','2024-02-01','2024-03-01',...],
  series: [{ name: 'Revenue', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`,-1)])]),_:1},512),a(o,{ref_key:"timeTsCard",ref:D,title:"Time Axis — Unix Timestamps",tag:"categories: [1704067200000, ...]"},{code:t(()=>[...e[9]||(e[9]=[s("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: [/* 13-digit ms timestamps */],
  series: [{ name: 'Visits', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`,-1)])]),_:1},512)]),_:1})],64))}});export{J as default};
