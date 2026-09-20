import{d as _,o as P,a as N,c as I,b as n,w as s,e as $,f as i,F as Z,r as o}from"./index-Cp-DeVXv.js";import{c as l}from"./api-DOskXYEJ.js";import{S as R,D as d,a as B}from"./DemoCard-uvMn-FKU.js";import{x as A}from"./sharedData-B5v8ntqg.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const O=357e3,z=1e-9,q=_({__name:"LineAreaCharts",setup(U){const p=o(),k=o(),M=o(),b=o(),x=o(),h=o(),v=o(),y=o(),g=o(),D=o(),Y={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visits",data:[820,932,901,934,1290,1330,1520]}]},F={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Direct",data:[320,302,301,334,390,330,320]},{name:"Search",data:[120,132,101,134,90,230,210]},{name:"Referral",data:[220,182,191,234,290,330,310]}]},C={categories:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],series:[{name:"Trend",data:[5,8,3,12,6,9,15,7,11,4,8,13,6,10,14,3,9,7,12,8]}]},T={categories:["2024-01-01","2024-02-01","2024-03-01","2024-04-01","2024-05-01","2024-06-01"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Expenses",data:[620,732,701,734,1090,1130]}]},S=Date.UTC(2024,0,1),w={categories:Array.from({length:7},(r,e)=>S+e*864e5),series:[{name:"Visits",data:[120,145,98,167,203,180,221]}]};function V(r){const e=r*1e6;return Math.abs(e)>=1?`${e.toFixed(2)} µs`:`${(r*1e9).toFixed(2)} ns`}function E(){const r=Array.from({length:O},(t,m)=>m*z),e=r.map(t=>{const m=.45*Math.sin(2*Math.PI*18e3*t),c=.015*Math.sin(2*Math.PI*42e4*t),f=t>=22e-5?.35:0;return 3+m+c+f}),a=r.map(t=>3.3+.02*Math.sin(2*Math.PI*12e3*t)),u=r.map(t=>2.5+.025*Math.sin(2*Math.PI*24e3*t));return{categories:r,series:[{name:"Vin",data:a},{name:"Vout",data:e},{name:"Vref",data:u}]}}function L(){const e=Array.from({length:2400},(t,m)=>m*1e-7),a=e.map(t=>3+.28*Math.sin(2*Math.PI*1400*t)+.04*Math.sin(2*Math.PI*8200*t)),u=e.map(t=>2.72+.12*Math.sin(2*Math.PI*900*t+.8));return{categories:e,series:[{name:"Vout",data:a},{name:"Vref",data:u}]}}return P(()=>{const r=E();l(k.value.chartEl,"line",r,{title:"Voltage Waveforms — 357,000 lossless samples",legend:{show:!0,position:"bottom"},xAxis:{type:"value",includeZero:!1,formatLabel:a=>V(Number(a))},yAxis:{includeZero:!1,formatLabel:a=>`${Number(a).toFixed(2)} V`},series:{"*":{lineWidth:1.2}},dataZoom:!0,toolbox:{feature:{dataZoom:{yAxisIndex:0,title:{zoom:"区域缩放",back:"退出缩放"}},restore:{title:"还原"}}},tooltip:{customHtml:async a=>{var m;if(a.kind!=="axis")return"";const u=(m=a.series.find(c=>Array.isArray(c.rawValue)))==null?void 0:m.rawValue;if(!Array.isArray(u))return`${a.axisValueLabel}`;const t=a.series.map(c=>{const f=c.rawValue,W=Array.isArray(f)?f[1]:c.value;return`${c.name} = ${Number(W).toFixed(6)} V`});return`<b>t = ${V(Number(u[0]))}</b><br/>`+t.join("<br/>")}}});const e=L();l(M.value.chartEl,"line",e,{title:"Vout and Vref — Filled Difference",legend:{show:!0,position:"bottom"},xAxis:{type:"value",includeZero:!1,formatLabel:a=>`${(Number(a)*1e6).toFixed(1)} µs`},yAxis:{includeZero:!1,formatLabel:a=>`${Number(a).toFixed(2)} V`},series:{"*":{lineWidth:0}},bands:[{between:["Vout","Vref"],opacity:1}]}),l(p.value.chartEl,"line",A,{title:"Monthly Financials"}),l(b.value.chartEl,"area",Y,{title:"Weekly Visits"}),l(x.value.chartEl,"area",F,{stacked:!0,title:"Traffic Sources"}),l(h.value.chartEl,"line",A,{title:"With Mark Lines",series:{"*":{markLines:["average"],markPoints:["max","min"]}}}),l(v.value.chartEl,"line",C,{variant:"spark"}),l(y.value.chartEl,"area",C,{variant:"spark",series:{"*":{smooth:.6}}}),l(g.value.chartEl,"line",T,{title:"Monthly Revenue (Date Strings)",xAxis:{dateFormat:"MM/DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}}),l(D.value.chartEl,"area",w,{title:"Daily Visits (Timestamps)",xAxis:{dateFormat:"MM-DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}})}),(r,e)=>(N(),I(Z,null,[n(R,null,{default:s(()=>[...e[0]||(e[0]=[$("Line & Area Charts",-1)])]),_:1}),n(B,null,{default:s(()=>[n(d,{ref_key:"waveformCard",ref:k,title:"Numeric Waveform — 357k Samples / 3 Channels",tag:"3 lines + legend + X/Y zoom","card-style":{gridColumn:"1 / -1"},"box-style":{height:"420px"}},{code:s(()=>[...e[1]||(e[1]=[i("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: timeArray,             // numeric seconds: x coordinates
  series: [
    { name: 'Vin', data: vinValues },
    { name: 'Vout', data: voutValues },
    { name: 'Vref', data: vrefValues },
  ],
}, {
  legend: { show: true, position: 'bottom' },
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
});`,-1)])]),_:1},512),n(d,{ref_key:"bandCard",ref:M,title:"Band Fill — Between Two Curves",tag:"bands: Vout ↔ Vref","card-style":{gridColumn:"1 / -1"},"box-style":{height:"300px"}},{code:s(()=>[...e[2]||(e[2]=[i("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: timeArray,
  series: [
    { name: 'Vout', data: voutValues },
    { name: 'Vref', data: vrefValues },
  ],
}, {
  xAxis: { type: 'value' },
  series: { '*': { lineWidth: 0 } },
  bands: [{
    between: ['Vout', 'Vref'],
    opacity: 1,
  }],
});`,-1)])]),_:1},512),n(d,{ref_key:"lineCard",ref:p,title:"Line Chart",tag:'type="line"'},{code:s(()=>[...e[3]||(e[3]=[i("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
}, { title: 'Monthly Financials' });`,-1)])]),_:1},512),n(d,{ref_key:"areaCard",ref:b,title:"Area Chart",tag:'type="area"'},{code:s(()=>[...e[4]||(e[4]=[i("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  series: [{ name: 'Visits', data: [820,932,901,934,1290,1330,1520] }],
}, { title: 'Weekly Visits' });`,-1)])]),_:1},512),n(d,{ref_key:"stackedAreaCard",ref:x,title:"Stacked Area",tag:"stacked: true"},{code:s(()=>[...e[5]||(e[5]=[i("pre",{class:"code-block"},`createChart(el, 'area', data, {
  stacked: true,
  title: 'Traffic Sources',
});`,-1)])]),_:1},512),n(d,{ref_key:"markCard",ref:h,title:"Line with Mark Lines",tag:"markLines / markPoints"},{code:s(()=>[...e[6]||(e[6]=[i("pre",{class:"code-block"},`createChart(el, 'line', data, {
  series: {
    '*': {
      markLines: ['average'],
      markPoints: ['max', 'min'],
    },
  },
});`,-1)])]),_:1},512),n(d,{ref_key:"sparkCard",ref:v,title:"Spark Line",tag:'variant="spark"',"box-style":"height: 80px;"},{code:s(()=>[...e[7]||(e[7]=[i("pre",{class:"code-block"},"createChart(el, 'line', data, { variant: 'spark' });",-1)])]),_:1},512),n(d,{ref_key:"sparkAreaCard",ref:y,title:"Spark Area",tag:'type="area" variant="spark"',"box-style":"height: 80px;"},{code:s(()=>[...e[8]||(e[8]=[i("pre",{class:"code-block"},"createChart(el, 'area', data, { variant: 'spark', series: { '*': { smooth: 0.6 } } });",-1)])]),_:1},512),n(d,{ref_key:"timeStrCard",ref:g,title:"Time Axis — Date Strings",tag:"categories: ['2024-01-01', ...]"},{code:s(()=>[...e[9]||(e[9]=[i("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['2024-01-01','2024-02-01','2024-03-01',...],
  series: [{ name: 'Revenue', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`,-1)])]),_:1},512),n(d,{ref_key:"timeTsCard",ref:D,title:"Time Axis — Unix Timestamps",tag:"categories: [1704067200000, ...]"},{code:s(()=>[...e[10]||(e[10]=[i("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: [/* 13-digit ms timestamps */],
  series: [{ name: 'Visits', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`,-1)])]),_:1},512)]),_:1})],64))}});export{q as default};
