import{S as g,D as c,a as v}from"./DemoCard-ClnI8xzw.js";import{x as C,p as b}from"./sharedData-B5v8ntqg.js";import{d as w,o as E,l as u,a as _,c as k,b as a,w as t,e as p,f as r,F as x,r as d}from"./index-B6IDcwPx.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const L=w({__name:"WebComponentView",setup(D){const n=d(),i=d(),o=d(),l=d();function s(){return Array.from({length:4},()=>Math.round(Math.random()*500+100))}function m(){o.value&&(o.value.data={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:s()},{name:"Product B",data:s()}]})}return E(()=>{n.value&&(n.value.data=C,n.value.options={title:"Monthly Financials"}),i.value&&(i.value.data=b,i.value.options={title:"Browser Market Share",variant:"doughnut",legend:{show:!0,position:"right"}}),o.value&&(o.value.data={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:s()},{name:"Product B",data:s()}]},o.value.options={title:"Quarterly Sales"}),l.value&&(l.value.data={value:72,max:100,label:"Score"},l.value.options={title:"Performance Score",variant:"percentage"})}),(Q,e)=>{const h=u("el-tag"),f=u("el-alert"),y=u("el-button");return _(),k(x,null,[a(g,null,{extra:t(()=>[a(h,{size:"small",type:"info",style:{"margin-left":"8px"}},{default:t(()=>[...e[0]||(e[0]=[p("<i-chart>",-1)])]),_:1})]),default:t(()=>[e[1]||(e[1]=p(" Web Component ",-1))]),_:1}),a(f,{description:"Drop <i-chart> directly into HTML and bind .data / .options via JS property assignment.",type:"info","show-icon":"",closable:!1,style:{"margin-bottom":"16px"}}),a(v,null,{default:t(()=>[a(c,{title:"Line Chart",tag:'<i-chart type="line">'},{code:t(()=>[...e[2]||(e[2]=[r("pre",{class:"code-block"},`<i-chart id="myChart" type="line"></i-chart>

<script>
const chart = document.getElementById('myChart');
chart.data = {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
};
chart.options = { title: 'Monthly Financials' };
<\/script>`,-1)])]),default:t(()=>[r("i-chart",{ref_key:"wcLineEl",ref:n,type:"line"},null,512)]),_:1}),a(c,{title:"Doughnut Chart",tag:'<i-chart type="pie">'},{code:t(()=>[...e[3]||(e[3]=[r("pre",{class:"code-block"},`<i-chart id="myChart" type="pie"></i-chart>

<script>
const chart = document.getElementById('myChart');
chart.data = [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
];
chart.options = { variant: 'doughnut', legend: { show: true, position: 'right' } };
<\/script>`,-1)])]),default:t(()=>[r("i-chart",{ref_key:"wcPieEl",ref:i,type:"pie"},null,512)]),_:1}),a(c,{title:"Live Update"},{tag:t(()=>[a(y,{size:"small",type:"primary",onClick:m},{default:t(()=>[...e[4]||(e[4]=[p("Refresh Data",-1)])]),_:1})]),code:t(()=>[...e[5]||(e[5]=[r("pre",{class:"code-block"},`<i-chart id="myChart" type="bar"></i-chart>
<button onclick="refreshChart()">Refresh Data</button>

<script>
const chart = document.getElementById('myChart');
function refreshChart() {
  chart.data = {
    categories: ['Q1','Q2','Q3','Q4'],
    series: [
      { name: 'Product A', data: randomData() },
      { name: 'Product B', data: randomData() },
    ],
  };
}
refreshChart();
<\/script>`,-1)])]),default:t(()=>[r("i-chart",{ref_key:"wcLiveEl",ref:o,type:"bar"},null,512)]),_:1}),a(c,{title:"Gauge",tag:'<i-chart type="gauge">'},{code:t(()=>[...e[6]||(e[6]=[r("pre",{class:"code-block"},`<i-chart id="myChart" type="gauge"></i-chart>

<script>
const chart = document.getElementById('myChart');
chart.data = { value: 72, max: 100, label: 'Score' };
chart.options = { title: 'Performance Score', variant: 'percentage' };
<\/script>`,-1)])]),default:t(()=>[r("i-chart",{ref_key:"wcGaugeEl",ref:l,type:"gauge"},null,512)]),_:1})]),_:1})],64)}}});export{L as default};
