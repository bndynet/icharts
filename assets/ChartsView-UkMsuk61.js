import{d as ne,I as oe,o as ie,c as H,s as de,a as ue,r as f,b as ce,e as me,f as c,g as r,w as t,h as l,i as a,j as o}from"./index-gN_1lBJp.js";import{createChart as i}from"./index-_UTMGnlo.js";import{_ as fe}from"./_plugin-vue_export-helper-DlAUqK2U.js";const pe={style:{"max-width":"1280px",margin:"0 auto"}},he={class:"demo-grid"},ve={class:"card-head"},ye={class:"card-head"},ge={class:"card-head"},ke={class:"card-head"},Ce={class:"card-head"},Se={class:"card-head"},we={class:"card-head"},Ee={class:"card-head"},be={class:"demo-grid"},xe={class:"card-head"},De={class:"card-head"},Me={class:"card-head"},Fe={class:"card-head"},Be={class:"demo-grid"},Pe={class:"card-head"},Ae={class:"card-head"},ze={class:"card-head"},Te={class:"demo-grid"},Ye={class:"card-head"},_e={class:"card-head"},Qe={class:"demo-grid"},Re={class:"card-head"},Le={class:"chart-box"},Ue={class:"card-head"},Ve={class:"chart-box"},Ge={class:"card-head"},Ne={class:"chart-box"},Je={class:"card-head"},Ie={class:"chart-box"},He={class:"demo-grid"},We={class:"card-head"},Oe={class:"demo-grid"},je={class:"card-head"},Ke={class:"card-head"},qe={class:"demo-grid"},Xe={class:"card-head"},Ze={class:"card-head"},$e=ne({__name:"ChartsView",setup(ea){const{theme:W}=oe(),S=o(),w=o(),E=o(),b=o(),x=o(),D=o(),M=o(),F=o(),B=o(),P=o(),A=o(),z=o(),T=o(),Y=o(),_=o(),Q=o(),R=o(),L=o(),U=o(),V=o(),G=o(),N=o(),h=o(),v=o(),m=o(),y=o(),k={categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Expenses",data:[620,732,701,734,1090,1130]}]},O={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visits",data:[820,932,901,934,1290,1330,1520]}]},j={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Direct",data:[320,302,301,334,390,330,320]},{name:"Search",data:[120,132,101,134,90,230,210]},{name:"Referral",data:[220,182,191,234,290,330,310]}]},J={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:[430,460,390,510]},{name:"Product B",data:[320,382,301,354]}]},K={categories:["Chrome","Firefox","Safari","Edge","Opera"],series:[{name:"Share %",data:[65,15,12,5,3]}]},p=[{name:"Chrome",value:65},{name:"Firefox",value:15},{name:"Safari",value:12},{name:"Edge",value:8}],I={categories:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],series:[{name:"Trend",data:[5,8,3,12,6,9,15,7,11,4,8,13,6,10,14,3,9,7,12,8]}]},q={categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Trend",data:[720,832,851,884,1100,1230]}]},X={categories:["2024-01-01","2024-02-01","2024-03-01","2024-04-01","2024-05-01","2024-06-01"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Expenses",data:[620,732,701,734,1090,1130]}]},Z=Date.UTC(2024,0,1),$={categories:Array.from({length:7},(C,e)=>Z+e*864e5),series:[{name:"Visits",data:[120,145,98,167,203,180,221]}]},ee={nodes:[{name:"Frontend"},{name:"Backend"},{name:"Design"},{name:"QA"},{name:"DevOps"},{name:"Product"}],links:[{source:"Frontend",target:"Backend",value:42},{source:"Frontend",target:"Design",value:35},{source:"Frontend",target:"QA",value:28},{source:"Backend",target:"DevOps",value:30},{source:"Backend",target:"QA",value:25},{source:"Design",target:"Product",value:40},{source:"QA",target:"DevOps",value:18},{source:"Product",target:"Frontend",value:22},{source:"Product",target:"Backend",value:20}]},ae={nodes:[{name:"Coal"},{name:"Natural Gas"},{name:"Solar"},{name:"Electricity"},{name:"Heat"},{name:"Industry"},{name:"Residential"},{name:"Transport"}],links:[{source:"Coal",target:"Electricity",value:120},{source:"Coal",target:"Heat",value:60},{source:"Natural Gas",target:"Electricity",value:80},{source:"Natural Gas",target:"Heat",value:90},{source:"Solar",target:"Electricity",value:50},{source:"Electricity",target:"Industry",value:130},{source:"Electricity",target:"Residential",value:80},{source:"Electricity",target:"Transport",value:40},{source:"Heat",target:"Industry",value:70},{source:"Heat",target:"Residential",value:80}]},te={nodes:[{name:"Landing Page"},{name:"Pricing"},{name:"Blog"},{name:"Sign Up"},{name:"Trial"},{name:"Converted"},{name:"Churned"}],links:[{source:"Landing Page",target:"Pricing",value:800},{source:"Landing Page",target:"Blog",value:400},{source:"Pricing",target:"Sign Up",value:500},{source:"Blog",target:"Sign Up",value:200},{source:"Sign Up",target:"Trial",value:600},{source:"Trial",target:"Converted",value:380},{source:"Trial",target:"Churned",value:220}]};function g(){return Array.from({length:4},()=>Math.round(Math.random()*500+100))}function re(){m.value&&(m.value.data={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:g()},{name:"Product B",data:g()}]})}return ie(()=>{H({consistentColors:!1}),i(S.value,"line",k,{title:"Monthly Financials"}),i(w.value,"area",O,{title:"Weekly Visits"}),i(E.value,"area",j,{stacked:!0,title:"Traffic Sources"}),i(b.value,"line",k,{title:"With Mark Lines",series:{"*":{markLines:["average"],markPoints:["max","min"]}}}),i(x.value,"line",I,{variant:"spark"}),i(D.value,"area",I,{variant:"spark",series:{"*":{smooth:.6}}}),i(M.value,"line",X,{title:"Monthly Revenue (Date Strings)",xAxis:{dateFormat:"MM/DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}}),i(F.value,"area",$,{title:"Daily Visits (Timestamps)",xAxis:{dateFormat:"MM-DD",cursorFormat:"YYYY-MM-DD"},tooltip:{dateFormat:"YYYY-MM-DD"}}),i(B.value,"bar",J,{title:"Quarterly Sales"}),i(P.value,"bar",J,{stacked:!0,title:"Stacked Revenue"}),i(A.value,"bar",K,{variant:"horizontal",title:"Browser Share"}),i(z.value,"bar",{categories:["Chrome","Firefox","Safari","Edge"],series:[{name:"Share",data:[65,15,12,8]}]},{title:"Browser Share",colorByCategory:!0,colorMap:{Chrome:"#4285F4",Firefox:"#FF7139",Safari:"#1B88CA",Edge:"#0078D7"}}),i(T.value,"pie",p,{title:"Browser Market Share"}),i(Y.value,"pie",p,{title:"Browser Market Share",variant:"doughnut",legend:{show:!0,position:"right"}}),i(_.value,"pie",p,{title:"Nightingale Rose",variant:"nightingale"}),i(Q.value,"gauge",{value:72,max:100,label:"Score"},{title:"Performance Score"}),i(R.value,"gauge",{value:85,max:100,label:"CPU"},{title:"CPU Usage",variant:"percentage"}),i(L.value,"chord",ee,{title:"Team Collaboration",tooltip:{formatValue:C=>C+" interactions"}}),i(U.value,"sankey",ae,{title:"Energy Flow"}),i(V.value,"sankey",te,{title:"User Journey",variant:"vertical"}),i(G.value,"line",q,{title:"Revenue vs Trend",series:{Revenue:{type:"bar"},Trend:{smooth:!0,lineStyle:"dashed"}}}),i(N.value,"pie",p,{colorMap:{Chrome:"#4285F4",Firefox:"#FF7139",Safari:"#000000",Edge:"#0078D4"}}),h.value&&(h.value.data=k,h.value.options={title:"Monthly Financials"}),v.value&&(v.value.data=p,v.value.options={title:"Browser Market Share",variant:"doughnut",legend:{show:!0,position:"right"}}),m.value&&(m.value.data={categories:["Q1","Q2","Q3","Q4"],series:[{name:"Product A",data:g()},{name:"Product B",data:g()}]},m.value.options={title:"Quarterly Sales"}),y.value&&(y.value.data={value:72,max:100,label:"Score"},y.value.options={title:"Performance Score",variant:"percentage"}),de(W.value)}),ue(()=>{H({consistentColors:!1})}),(C,e)=>{const d=f("el-text"),u=f("el-divider"),s=f("el-tag"),n=f("el-card"),le=f("el-alert"),se=f("el-button");return ce(),me("div",pe,[c(" ── LINE & AREA ──────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[0]||(e[0]=[l(" Line & Area Charts ",-1)])]),_:1})]),_:1}),a("div",he,[r(n,{shadow:"hover"},{header:t(()=>[a("div",ve,[e[2]||(e[2]=a("span",null,"Line Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[1]||(e[1]=[l('type="line"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartLineEl",ref:S,class:"chart-box"},null,512),e[3]||(e[3]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['Jan','Feb','Mar','Apr','May','Jun'],
  series: [
    { name: 'Revenue', data: [820,932,901,934,1290,1330] },
    { name: 'Expenses', data: [620,732,701,734,1090,1130] },
  ],
}, { title: 'Monthly Financials' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ye,[e[5]||(e[5]=a("span",null,"Area Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[4]||(e[4]=[l('type="area"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartAreaEl",ref:w,class:"chart-box"},null,512),e[6]||(e[6]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  series: [{ name: 'Visits', data: [820,932,901,934,1290,1330,1520] }],
}, { title: 'Weekly Visits' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ge,[e[8]||(e[8]=a("span",null,"Stacked Area",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[7]||(e[7]=[l("stacked: true",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartStackedAreaEl",ref:E,class:"chart-box"},null,512),e[9]||(e[9]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'area', data, {
  stacked: true,
  title: 'Traffic Sources',
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ke,[e[11]||(e[11]=a("span",null,"Line with Mark Lines",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[10]||(e[10]=[l("markLines / markPoints",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartMarkEl",ref:b,class:"chart-box"},null,512),e[12]||(e[12]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', data, {
  series: {
    '*': {
      markLines: ['average'],
      markPoints: ['max', 'min'],
    },
  },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ce,[e[14]||(e[14]=a("span",null,"Spark Line",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[13]||(e[13]=[l('variant="spark"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSparkEl",ref:x,style:{height:"80px"}},null,512),e[15]||(e[15]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},"createChart(el, 'line', data, { variant: 'spark' });")],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Se,[e[17]||(e[17]=a("span",null,"Spark Area",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[16]||(e[16]=[l('type="area" variant="spark"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSparkAreaEl",ref:D,style:{height:"80px"}},null,512),e[18]||(e[18]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},"createChart(el, 'area', data, { variant: 'spark', series: { '*': { smooth: 0.6 } } });")],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",we,[e[20]||(e[20]=a("span",null,"Time Axis — Date Strings",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[19]||(e[19]=[l("categories: ['2024-01-01', ...]",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartTimeStrEl",ref:M,class:"chart-box"},null,512),e[21]||(e[21]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', {
  categories: ['2024-01-01','2024-02-01','2024-03-01',...],
  series: [{ name: 'Revenue', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM/DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ee,[e[23]||(e[23]=a("span",null,"Time Axis — Unix Timestamps",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[22]||(e[22]=[l("categories: [1704067200000, ...]",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartTimeTsEl",ref:F,class:"chart-box"},null,512),e[24]||(e[24]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'area', {
  categories: [/* 13-digit ms timestamps */],
  series: [{ name: 'Visits', data: [...] }],
}, {
  xAxis: { dateFormat: 'MM-DD', cursorFormat: 'YYYY-MM-DD' },
  tooltip: { dateFormat: 'YYYY-MM-DD' },
});`)],-1))]),_:1})]),c(" ── BAR ─────────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[25]||(e[25]=[l("Bar Charts",-1)])]),_:1})]),_:1}),a("div",be,[r(n,{shadow:"hover"},{header:t(()=>[a("div",xe,[e[27]||(e[27]=a("span",null,"Bar Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[26]||(e[26]=[l('type="bar"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartBarEl",ref:B,class:"chart-box"},null,512),e[28]||(e[28]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'bar', {
  categories: ['Q1','Q2','Q3','Q4'],
  series: [
    { name: 'Product A', data: [430,460,390,510] },
    { name: 'Product B', data: [320,382,301,354] },
  ],
}, { title: 'Quarterly Sales' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",De,[e[30]||(e[30]=a("span",null,"Stacked Bar",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[29]||(e[29]=[l("stacked: true",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartStackedBarEl",ref:P,class:"chart-box"},null,512),e[31]||(e[31]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  stacked: true,
  title: 'Stacked Revenue',
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Me,[e[33]||(e[33]=a("span",null,"Horizontal Bar",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[32]||(e[32]=[l('variant="horizontal"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartHbarEl",ref:A,class:"chart-box"},null,512),e[34]||(e[34]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'bar', data, {
  variant: 'horizontal',
  title: 'Browser Share',
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Fe,[e[36]||(e[36]=a("span",null,"Distinct Colors per Category",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[35]||(e[35]=[l("colorByCategory",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartColorByCategoryEl",ref:z,class:"chart-box"},null,512),e[37]||(e[37]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'bar', {
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
});`)],-1))]),_:1})]),c(" ── PIE ─────────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[38]||(e[38]=[l("Pie Charts",-1)])]),_:1})]),_:1}),a("div",Be,[r(n,{shadow:"hover"},{header:t(()=>[a("div",Pe,[e[40]||(e[40]=a("span",null,"Pie Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[39]||(e[39]=[l('type="pie"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartPieEl",ref:T,class:"chart-box"},null,512),e[41]||(e[41]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
], { title: 'Browser Market Share' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ae,[e[43]||(e[43]=a("span",null,"Doughnut",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[42]||(e[42]=[l('variant="doughnut"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartDoughnutEl",ref:Y,class:"chart-box"},null,512),e[44]||(e[44]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  variant: 'doughnut',
  legend: { show: true, position: 'right' },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",ze,[e[46]||(e[46]=a("span",null,"Nightingale Rose",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[45]||(e[45]=[l('variant="nightingale"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartRoseEl",ref:_,class:"chart-box"},null,512),e[47]||(e[47]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  variant: 'nightingale',
});`)],-1))]),_:1})]),c(" ── GAUGE ───────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[48]||(e[48]=[l("Gauge Charts",-1)])]),_:1})]),_:1}),a("div",Te,[r(n,{shadow:"hover"},{header:t(()=>[a("div",Ye,[e[50]||(e[50]=a("span",null,"Gauge",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[49]||(e[49]=[l('type="gauge"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartGaugeEl",ref:Q,class:"chart-box"},null,512),e[51]||(e[51]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'gauge', {
  value: 72, max: 100, label: 'Score',
}, { title: 'Performance Score' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",_e,[e[53]||(e[53]=a("span",null,"Percentage Gauge",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[52]||(e[52]=[l('variant="percentage"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartGaugePctEl",ref:R,class:"chart-box"},null,512),e[54]||(e[54]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'gauge', {
  value: 85, max: 100, label: 'CPU',
}, { title: 'CPU Usage', variant: 'percentage' });`)],-1))]),_:1})]),c(" ── WEB COMPONENT ───────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[55]||(e[55]=[l(" Web Component ",-1)])]),_:1}),r(s,{size:"small",type:"info",style:{"margin-left":"8px"}},{default:t(()=>[...e[56]||(e[56]=[l("<i-chart>",-1)])]),_:1})]),_:1}),r(le,{description:"Drop <i-chart> directly into HTML and bind .data / .options via JS property assignment.",type:"info","show-icon":"",closable:!1,style:{"margin-bottom":"16px"}}),a("div",Qe,[r(n,{shadow:"hover"},{header:t(()=>[a("div",Re,[e[58]||(e[58]=a("span",null,"Line Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[57]||(e[57]=[l('<i-chart type="line">',-1)])]),_:1})])]),default:t(()=>[a("div",Le,[a("i-chart",{ref_key:"wcLineEl",ref:h,type:"line"},null,512)]),e[59]||(e[59]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="line"></i-chart>

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
<\/script>`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ue,[e[61]||(e[61]=a("span",null,"Doughnut Chart",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[60]||(e[60]=[l('<i-chart type="pie">',-1)])]),_:1})])]),default:t(()=>[a("div",Ve,[a("i-chart",{ref_key:"wcPieEl",ref:v,type:"pie"},null,512)]),e[62]||(e[62]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="pie"></i-chart>

<script>
const chart = document.getElementById('myChart');
chart.data = [
  { name: 'Chrome', value: 65 },
  { name: 'Firefox', value: 15 },
  { name: 'Safari', value: 12 },
  { name: 'Edge', value: 8 },
];
chart.options = { variant: 'doughnut', legend: { show: true, position: 'right' } };
<\/script>`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ge,[e[64]||(e[64]=a("span",null,"Live Update",-1)),r(se,{size:"small",type:"primary",onClick:re},{default:t(()=>[...e[63]||(e[63]=[l("Refresh Data",-1)])]),_:1})])]),default:t(()=>[a("div",Ne,[a("i-chart",{ref_key:"wcLiveEl",ref:m,type:"bar"},null,512)]),e[65]||(e[65]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="bar"></i-chart>
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
<\/script>`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Je,[e[67]||(e[67]=a("span",null,"Gauge",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[66]||(e[66]=[l('<i-chart type="gauge">',-1)])]),_:1})])]),default:t(()=>[a("div",Ie,[a("i-chart",{ref_key:"wcGaugeEl",ref:y,type:"gauge"},null,512)]),e[68]||(e[68]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`<i-chart id="myChart" type="gauge"></i-chart>

<script>
const chart = document.getElementById('myChart');
chart.data = { value: 72, max: 100, label: 'Score' };
chart.options = { title: 'Performance Score', variant: 'percentage' };
<\/script>`)],-1))]),_:1})]),c(" ── CHORD ───────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[69]||(e[69]=[l("Chord Charts",-1)])]),_:1})]),_:1}),a("div",He,[r(n,{shadow:"hover",style:{"grid-column":"1/-1"}},{header:t(()=>[a("div",We,[e[71]||(e[71]=a("span",null,"Team Collaboration",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[70]||(e[70]=[l('type="chord"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartChordEl",ref:L,style:{height:"480px"}},null,512),e[72]||(e[72]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'chord', chordData, {
  title: 'Team Collaboration',
  tooltip: { formatValue: (v) => v + ' interactions' },
});`)],-1))]),_:1})]),c(" ── SANKEY ──────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[73]||(e[73]=[l("Sankey Charts",-1)])]),_:1})]),_:1}),a("div",Oe,[r(n,{shadow:"hover"},{header:t(()=>[a("div",je,[e[75]||(e[75]=a("span",null,"Energy Flow",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[74]||(e[74]=[l('type="sankey"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSankeyEl",ref:U,class:"chart-box"},null,512),e[76]||(e[76]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'sankey', {
  nodes: [{ name: 'Coal' }, { name: 'Solar' }, ...],
  links: [{ source: 'Coal', target: 'Electricity', value: 120 }, ...],
}, { title: 'Energy Flow' });`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ke,[e[78]||(e[78]=a("span",null,"User Journey",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[77]||(e[77]=[l('variant="vertical"',-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartSankeyVerticalEl",ref:V,class:"chart-box"},null,512),e[79]||(e[79]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'sankey', data, {
  title: 'User Journey',
  variant: 'vertical',
});`)],-1))]),_:1})]),c(" ── ADVANCED ────────────────────────────────────────────── "),r(u,{"content-position":"left"},{default:t(()=>[r(d,{type:"info",size:"small",style:{"font-weight":"600","letter-spacing":".06em","text-transform":"uppercase"}},{default:t(()=>[...e[80]||(e[80]=[l("Advanced",-1)])]),_:1})]),_:1}),a("div",qe,[r(n,{shadow:"hover"},{header:t(()=>[a("div",Xe,[e[82]||(e[82]=a("span",null,"Mixed Line + Bar",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[81]||(e[81]=[l("series type override",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartMixedEl",ref:G,class:"chart-box"},null,512),e[83]||(e[83]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'line', data, {
  title: 'Revenue vs Trend',
  series: {
    'Revenue': { type: 'bar' },
    'Trend':   { smooth: true, lineStyle: 'dashed' },
  },
});`)],-1))]),_:1}),r(n,{shadow:"hover"},{header:t(()=>[a("div",Ze,[e[85]||(e[85]=a("span",null,"Custom Colors",-1)),r(s,{type:"info",size:"small",effect:"plain"},{default:t(()=>[...e[84]||(e[84]=[l("colorMap",-1)])]),_:1})])]),default:t(()=>[a("div",{ref_key:"chartColorsEl",ref:N,class:"chart-box"},null,512),e[86]||(e[86]=a("details",null,[a("summary",null,"Show code"),a("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  colorMap: {
    'Chrome':  '#4285F4',
    'Firefox': '#FF7139',
    'Safari':  '#000000',
    'Edge':    '#0078D4',
  },
});`)],-1))]),_:1})])])}}}),la=fe($e,[["__scopeId","data-v-1428dfeb"]]);export{la as default};
