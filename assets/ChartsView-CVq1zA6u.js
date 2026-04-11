import{d as se,x as ne,o as oe,c as H,s as ie,a as de,r as f,b as ue,e as ce,f as c,g as r,w as t,h as l,i as a,j as o}from"./index-DUSvW4OZ.js";import{createChart as i}from"./index-B9aXu5gb.js";import{_ as me}from"./_plugin-vue_export-helper-DlAUqK2U.js";const fe={style:{"max-width":"1280px",margin:"0 auto"}},pe={class:"demo-grid"},he={class:"card-head"},ve={class:"card-head"},ye={class:"card-head"},ge={class:"card-head"},ke={class:"card-head"},Se={class:"card-head"},we={class:"card-head"},Ce={class:"card-head"},be={class:"demo-grid"},Ee={class:"card-head"},xe={class:"card-head"},De={class:"card-head"},Me={class:"demo-grid"},Fe={class:"card-head"},Pe={class:"card-head"},Ae={class:"card-head"},Te={class:"demo-grid"},ze={class:"card-head"},Be={class:"card-head"},Ye={class:"demo-grid"},_e={class:"card-head"},Qe={class:"chart-box"},Re={class:"card-head"},Le={class:"chart-box"},Ue={class:"card-head"},Ve={class:"chart-box"},Ge={class:"card-head"},Ne={class:"chart-box"},Je={class:"demo-grid"},He={class:"card-head"},Ie={class:"demo-grid"},We={class:"card-head"},Oe={class:"card-head"},je={class:"demo-grid"},Ke={class:"card-head"},qe={class:"card-head"},Xe=se({__name:"ChartsView",setup(Ze){const{theme:I}=ne(),w=o(),C=o(),b=o(),E=o(),x=o(),D=o(),M=o(),F=o(),P=o(),A=o(),T=o(),z=o(),B=o(),Y=o(),_=o(),Q=o(),R=o(),L=o(),U=o(),V=o(),G=o(),h=o(),v=o(),m=o(),y=o(),k={categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Expenses",data:[620,732,701,734,1090,1130]}]},W={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visits",data:[820,932,901,934,1290,1330,1520]}]},O={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Direct",data:[320,302,301,334,390,330,320]},{name:"Search",data:[120,132,101,134,90,230,210]},{name:"Referral",data:[220,182,191,234,290,330,310]}]},N={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:[430,460,390,510]},{name:"Product B",data:[320,382,301,354]}]},j={categories:["Chrome","Firefox","Safari","Edge","Opera"],series:[{name:"Share %",data:[65,15,12,5,3]}]},p=[{name:"Chrome",value:65},{name:"Firefox",value:15},{name:"Safari",value:12},{name:"Edge",value:8}],J={categories:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],series:[{name:"Trend",data:[5,8,3,12,6,9,15,7,11,4,8,13,6,10,14,3,9,7,12,8]}]},K={categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Trend",data:[720,832,851,884,1100,1230]}]},q={categories:["2024-01-01","2024-02-01","2024-03-01","2024-04-01","2024-05-01","2024-06-01"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Expenses",data:[620,732,701,734,1090,1130]}]},X=Date.UTC(2024,0,1),Z={categories:Array.from({length:7},(S,e)=>X+e*864e5),series:[{name:"Visits",data:[120,145,98,167,203,180,221]}]},$={nodes:[{name:"Frontend"},{name:"Backend"},{name:"Design"},{name:"QA"},{name:"DevOps"},{name:"Product"}],links:[{source:"Frontend",target:"Backend",value:42},{source:"Frontend",target:"Design",value:35},{source:"Frontend",target:"QA",value:28},{source:"Backend",target:"DevOps",value:30},{source:"Backend",target:"QA",value:25},{source:"Design",target:"Product",value:40},{source:"QA",target:"DevOps",value:18},{source:"Product",target:"Frontend",value:22},{source:"Product",target:"Backend",value:20}]},ee={nodes:[{name:"Coal"},{name:"Natural Gas"},{name:"Solar"},{name:"Electricity"},{name:"Heat"},{name:"Industry"},{name:"Residential"},{name:"Transport"}],links:[{source:"Coal",target:"Electricity",value:120},{source:"Coal",target:"Heat",value:60},{source:"Natural Gas",target:"Electricity",value:80},{source:"Natural Gas",target:"Heat",value:90},{source:"Solar",target:"Electricity",value:50},{source:"Electricity",target:"Industry",value:130},{source:"Electricity",target:"Residential",value:80},{source:"Electricity",target:"Transport",value:40},{source:"Heat",target:"Industry",value:70},{source:"Heat",target:"Residential",value:80}]},ae={nodes:[{name:"Landing Page"},{name:"Pricing"},{name:"Blog"},{name:"Sign Up"},{name:"Trial"},{name:"Converted"},{name:"Churned"}],links:[{source:"Landing Page",target:"Pricing",value:800},{source:"Landing Page",target:"Blog",value:400},{source:"Pricing",target:"Sign Up",value:500},{source:"Blog",target:"Sign Up",value:200},{source:"Sign Up",target:"Trial",value:600},{source:"Trial",target:"Converted",value:380},{source:"Trial",target:"Churned",value:220}]};function g(){return Array.from({length:4},()=>Math.round(Math.random()*500+100))}function te(){m.value&&(m.value.data={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:g()},{name:"Product B",data:g()}]})}return oe(()=>{H({consistentColors:!1}),i(w.value,"line",k,{title:"Monthly Financials"}),i(C.value,"area",W,{title:"Weekly Visits"}),i(b.value,"area",O,{stacked:!0,title:"Traffic Sources"}),i(E.value,"line",k,{title:"With Mark Lines",series:{"*":{markLines:["average"],markPoints:["max","min"]}}}),i(x.value,"line",J,{variant:"spark"}),i(D.value,"area",J,{variant:"spark",series:{"*":{smooth:.6}}}),i(M.value,"line",q,{title:"Monthly Revenue (Date Strings)",xAxis:{dateFormat:"MM/DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}}),i(F.value,"area",Z,{title:"Daily Visits (Timestamps)",xAxis:{dateFormat:"MM-DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}}),i(P.value,"bar",N,{title:"Quarterly Sales"}),i(A.value,"bar",N,{stacked:!0,title:"Stacked Revenue"}),i(T.value,"bar",j,{variant:"horizontal",title:"Browser Share"}),i(z.value,"pie",p,{title:"Browser Market Share"}),i(B.value,"pie",p,{title:"Browser Market Share",variant:"doughnut",legend:{show:!0,position:"right"}}),i(Y.value,"pie",p,{title:"Nightingale Rose",variant:"nightingale"}),i(_.value,"gauge",{value:72,max:100,label:"Score"},{title:"Performance Score"}),i(Q.value,"gauge",{value:85,max:100,label:"CPU"},{title:"CPU Usage",variant:"percentage"}),i(R.value,"chord",$,{title:"Team Collaboration",tooltip:{formatValue:S=>S+" interactions"}}),i(L.value,"sankey",ee,{title:"Energy Flow"}),i(U.value,"sankey",ae,{title:"User Journey",variant:"vertical"}),i(V.value,"line",K,{title:"Revenue vs Trend",series:{Revenue:{type:"bar"},Trend:{smooth:!0,lineStyle:"dashed"}}}),i(G.value,"pie",p,{colorMap:{Chrome:"#4285F4",Firefox:"#FF7139",Safari:"#000000",Edge:"#0078D4"}}),h.value&&(h.value.data=k,h.value.options={title:"Monthly Financials"}),v.value&&(v.value.data=p,v.value.options={title:"Browser Market Share",variant:"doughnut",legend:{show:!0,position:"right"}}),m.value&&(m.value.data={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:g()},{name:"Product B",data:g()}]},m.value.options={title:"Quarterly Sales"}),y.value&&(y.value.data={value:72,max:100,label:"Score"},y.value.options={title:"Performance Score",variant:"percentage"}),ie(I.value)}),de(()=>{H({consistentColors:!1})}),(S,e)=>{const d=f("el-text"),u=f("el-divider"),s=f("el-tag"),n=f("el-card"),re=f("el-alert"),le=f("el-button");return ue(),ce("div",fe,[c(" ── LINE & AREA ──────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[0]||(e[0]=[l(" Line & Area Charts ",-1)])]),_:1})]),_:1}),a("div",pe,[r(n,{shadow:"hover"},{header:t(()=>[a("div",he,[e[2]||(e[2]=a("span",null,"Line Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[1]||(e[1]=[l('type="line"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartLineEl",ref:w,class:"chart-box"},null,512),e[3]||(e[3]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
}, { title: 'Monthly Financials' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ve,[e[5]||(e[5]=a("span",null,"Area Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[4]||(e[4]=[l('type="area"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartAreaEl",ref:C,class:"chart-box"},null,512),e[6]||(e[6]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  series: [{ name: 'Visits', data: [820,932,901,934,1290,1330,1520] }],
}, { title: 'Weekly Visits' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ye,[e[8]||(e[8]=a("span",null,"Stacked Area",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[7]||(e[7]=[l("stacked: true",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartStackedAreaEl",ref:b,class:"chart-box"},null,512),e[9]||(e[9]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'area', data, {
  stacked: true,
  title: 'Traffic Sources',
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ge,[e[11]||(e[11]=a("span",null,"Line with Mark Lines",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[10]||(e[10]=[l("markLines / markPoints",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartMarkEl",ref:E,class:"chart-box"},null,512),e[12]||(e[12]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', data, {
  series: {
    '*': {
      markLines: ['average'],
      markPoints: ['max', 'min'],
    },
  },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ke,[e[14]||(e[14]=a("span",null,"Spark Line",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[13]||(e[13]=[l('variant="spark"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSparkEl",ref:x,style:{height:"80px"}},null,512),e[15]||(e[15]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},"createChart(el, 'line', data, { variant: 'spark' });")],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Se,[e[17]||(e[17]=a("span",null,"Spark Area",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[16]||(e[16]=[l('type="area" variant="spark"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSparkAreaEl",ref:D,style:{height:"80px"}},null,512),e[18]||(e[18]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},"createChart(el, 'area', data, { variant: 'spark', series: { '*': { smooth: 0.6 } } });")],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",we,[e[20]||(e[20]=a("span",null,"Time Axis — Date Strings",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[19]||(e[19]=[l("categories: ['2024-01-01', ...]",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartTimeStrEl",ref:M,class:"chart-box"},null,512),e[21]||(e[21]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['2024-01-01','2024-02-01','2024-03-01',...],
  series: [{ name: 'Revenue', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ce,[e[23]||(e[23]=a("span",null,"Time Axis — Unix Timestamps",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[22]||(e[22]=[l("categories: [1704067200000, ...]",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartTimeTsEl",ref:F,class:"chart-box"},null,512),e[24]||(e[24]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: [/* 13-digit ms timestamps */],
  series: [{ name: 'Visits', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`)],-1))]),_:1})]),c(" ── BAR ─────────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[25]||(e[25]=[l("Bar Charts",-1)])]),_:1})]),_:1}),a("div",be,[r(n,{shadow:"hover"},{header:t(()=>[a("div",Ee,[e[27]||(e[27]=a("span",null,"Bar Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[26]||(e[26]=[l('type="bar"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartBarEl",ref:P,class:"chart-box"},null,512),e[28]||(e[28]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'bar', {
  categories: ['Q1','Q2','Q3','Q4'],
  series: [
    { name: 'Product A', data: [430,460,390,510] },
    { name: 'Product B', data: [320,382,301,354] },
  ],
}, { title: 'Quarterly Sales' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",xe,[e[30]||(e[30]=a("span",null,"Stacked Bar",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[29]||(e[29]=[l("stacked: true",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartStackedBarEl",ref:A,class:"chart-box"},null,512),e[31]||(e[31]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  stacked: true,
  title: 'Stacked Revenue',
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",De,[e[33]||(e[33]=a("span",null,"Horizontal Bar",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[32]||(e[32]=[l('variant="horizontal"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartHbarEl",ref:T,class:"chart-box"},null,512),e[34]||(e[34]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  variant: 'horizontal',
  title: 'Browser Share',
});`)],-1))]),_:1})]),c(" ── PIE ─────────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[35]||(e[35]=[l("Pie Charts",-1)])]),_:1})]),_:1}),a("div",Me,[r(n,{shadow:"hover"},{header:t(()=>[a("div",Fe,[e[37]||(e[37]=a("span",null,"Pie Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[36]||(e[36]=[l('type="pie"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartPieEl",ref:z,class:"chart-box"},null,512),e[38]||(e[38]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
], { title: 'Browser Market Share' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Pe,[e[40]||(e[40]=a("span",null,"Doughnut",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[39]||(e[39]=[l('variant="doughnut"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartDoughnutEl",ref:B,class:"chart-box"},null,512),e[41]||(e[41]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  variant: 'doughnut',
  legend: { show: true, position: 'right' },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ae,[e[43]||(e[43]=a("span",null,"Nightingale Rose",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[42]||(e[42]=[l('variant="nightingale"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartRoseEl",ref:Y,class:"chart-box"},null,512),e[44]||(e[44]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  variant: 'nightingale',
});`)],-1))]),_:1})]),c(" ── GAUGE ───────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[45]||(e[45]=[l("Gauge Charts",-1)])]),_:1})]),_:1}),a("div",Te,[r(n,{shadow:"hover"},{header:t(()=>[a("div",ze,[e[47]||(e[47]=a("span",null,"Gauge",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[46]||(e[46]=[l('type="gauge"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartGaugeEl",ref:_,class:"chart-box"},null,512),e[48]||(e[48]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'gauge', {
  value: 72, max: 100, label: 'Score',
}, { title: 'Performance Score' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Be,[e[50]||(e[50]=a("span",null,"Percentage Gauge",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[49]||(e[49]=[l('variant="percentage"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartGaugePctEl",ref:Q,class:"chart-box"},null,512),e[51]||(e[51]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'gauge', {
  value: 85, max: 100, label: 'CPU',
}, { title: 'CPU Usage', variant: 'percentage' });`)],-1))]),_:1})]),c(" ── WEB COMPONENT ───────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[52]||(e[52]=[l(" Web Component ",-1)])]),_:1}),r(s,{size:"small",type:"info",style:{"margin-left":"8px"}},{default:t(()=>[...e[53]||(e[53]=[l("<i-chart>",-1)])]),_:1})]),_:1}),r(re,{description:"Drop <i-chart> directly into HTML and bind .data / .options via JS property assignment.",type:"info","show-icon":"",closable:!1,style:{"margin-bottom":"16px"}}),a("div",Ye,[r(n,{shadow:"hover"},{header:t(()=>[a("div",_e,[e[55]||(e[55]=a("span",null,"Line Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[54]||(e[54]=[l('<i-chart type="line">',-1)])]),_:1})])]),default:t(()=>[a("div",Qe,[a("i-chart",{ref_key:"wcLineEl",ref:h,type:"line"},null,512)]),e[56]||(e[56]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="line"></i-chart>

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
<\/script>`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Re,[e[58]||(e[58]=a("span",null,"Doughnut Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[57]||(e[57]=[l('<i-chart type="pie">',-1)])]),_:1})])]),default:t(()=>[a("div",Le,[a("i-chart",{ref_key:"wcPieEl",ref:v,type:"pie"},null,512)]),e[59]||(e[59]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="pie"></i-chart>

<script>
const chart = document.getElementById('myChart');
chart.data = [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
];
chart.options = { variant: 'doughnut', legend: { show: true, position: 'right' } };
<\/script>`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ue,[e[61]||(e[61]=a("span",null,"Live Update",-1)),r(le,{size:"small",type:"primary",onClick:te},{default:t(()=>[...e[60]||(e[60]=[l("Refresh Data",-1)])]),_:1})])]),default:t(()=>[a("div",Ve,[a("i-chart",{ref_key:"wcLiveEl",ref:m,type:"bar"},null,512)]),e[62]||(e[62]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="bar"></i-chart>
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
<\/script>`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ge,[e[64]||(e[64]=a("span",null,"Gauge",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[63]||(e[63]=[l('<i-chart type="gauge">',-1)])]),_:1})])]),default:t(()=>[a("div",Ne,[a("i-chart",{ref_key:"wcGaugeEl",ref:y,type:"gauge"},null,512)]),e[65]||(e[65]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="gauge"></i-chart>

<script>
const chart = document.getElementById('myChart');
chart.data = { value: 72, max: 100, label: 'Score' };
chart.options = { title: 'Performance Score', variant: 'percentage' };
<\/script>`)],-1))]),_:1})]),c(" ── CHORD ───────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[66]||(e[66]=[l("Chord Charts",-1)])]),_:1})]),_:1}),a("div",Je,[r(n,{shadow:"hover",style:{"grid-column":"1/-1"}},{header:t(()=>[a("div",He,[e[68]||(e[68]=a("span",null,"Team Collaboration",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[67]||(e[67]=[l('type="chord"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartChordEl",ref:R,style:{height:"480px"}},null,512),e[69]||(e[69]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'chord', chordData, {
  title: 'Team Collaboration',
  tooltip: { formatValue: (v) => v + ' interactions' },
});`)],-1))]),_:1})]),c(" ── SANKEY ──────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[70]||(e[70]=[l("Sankey Charts",-1)])]),_:1})]),_:1}),a("div",Ie,[r(n,{shadow:"hover"},{header:t(()=>[a("div",We,[e[72]||(e[72]=a("span",null,"Energy Flow",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[71]||(e[71]=[l('type="sankey"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSankeyEl",ref:L,class:"chart-box"},null,512),e[73]||(e[73]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'sankey', {
  nodes: [{ name: 'Coal' }, { name: 'Solar' }, ...],
  links: [{ source: 'Coal', target: 'Electricity', value: 120 }, ...],
}, { title: 'Energy Flow' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Oe,[e[75]||(e[75]=a("span",null,"User Journey",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[74]||(e[74]=[l('variant="vertical"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSankeyVerticalEl",ref:U,class:"chart-box"},null,512),e[76]||(e[76]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'sankey', data, {
  title: 'User Journey',
  variant: 'vertical',
});`)],-1))]),_:1})]),c(" ── ADVANCED ────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[77]||(e[77]=[l("Advanced",-1)])]),_:1})]),_:1}),a("div",je,[r(n,{shadow:"hover"},{header:t(()=>[a("div",Ke,[e[79]||(e[79]=a("span",null,"Mixed Line + Bar",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[78]||(e[78]=[l("series type override",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartMixedEl",ref:V,class:"chart-box"},null,512),e[80]||(e[80]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', data, {
  title: 'Revenue vs Trend',
  series: {
    'Revenue': { type: 'bar' },
    'Trend':   { smooth: true, lineStyle: 'dashed' },
  },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",qe,[e[82]||(e[82]=a("span",null,"Custom Colors",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[81]||(e[81]=[l("colorMap",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartColorsEl",ref:G,class:"chart-box"},null,512),e[83]||(e[83]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  colorMap: {
    'Chrome':  '#4285F4',
    'Firefox': '#FF7139',
    'Safari':  '#000000',
    'Edge':    '#0078D4',
  },
});`)],-1))]),_:1})])])}}}),ta=me(Xe,[["__scopeId","data-v-fe2f4f4c"]]);export{ta as default};
