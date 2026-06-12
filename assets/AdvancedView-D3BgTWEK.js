import{d as f,o as x,a as b,c as C,b as a,w as t,e as y,f as n,F as D,r as o}from"./index-B6IDcwPx.js";import{c as s}from"./api-6F-8kEI9.js";import{S as k,D as i,a as F}from"./DemoCard-ClnI8xzw.js";import{p as M}from"./sharedData-B5v8ntqg.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const S="data:image/svg+xml,%3csvg%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%20xmlns='http://www.w3.org/2000/svg'%20role='img'%20aria-label='Up%20arrow'%3e%3cpath%20d='M8%202l5%206H9v6H7V8H3l5-6z'%20fill='%2316a34a'/%3e%3c/svg%3e",T="data:image/svg+xml,%3csvg%20width='16'%20height='16'%20viewBox='0%200%2016%2016'%20xmlns='http://www.w3.org/2000/svg'%20role='img'%20aria-label='Down%20arrow'%3e%3cpath%20d='M8%2014l-5-6h4V2h2v6h4l-5%206z'%20fill='%23dc2626'/%3e%3c/svg%3e",E=f({__name:"AdvancedView",setup(U){const l=o(),d=o(),g=o(),v={categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[820,932,901,934,1290,1330]},{name:"Trend",data:[720,832,851,884,1100,1230]}]},c={categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visits",data:[210,240,280,260,320,360,390]},{name:"Orders",data:[80,95,120,110,150,170,160]}]};return x(()=>{s(l.value.chartEl,"line",v,{title:"Revenue vs Trend",series:{Revenue:{type:"bar"},Trend:{smooth:!0,lineStyle:"dashed"}}}),s(d.value.chartEl,"pie",M,{colorMap:{Chrome:"#4285F4",Firefox:"#FF7139",Safari:"#000000",Edge:"#0078D4"}}),s(g.value.chartEl,"line",c,{title:"Legend Trend Arrow via backgroundImage",legend:{formatLabel:(m,e)=>{var w;const p=((w=c.series[e])==null?void 0:w.data)??[],r=p.at(-1)??0,h=p.at(-2)??r,u=r>=h?S:T;return{segments:[{text:m,style:{padding:[0,8,0,0]}},{text:String(r),style:{align:"right",width:40,padding:[0,4,0,0]}},{text:" ",style:{width:14,height:14,backgroundImage:u,verticalAlign:"middle"}}]}}}})}),(m,e)=>(b(),C(D,null,[a(k,null,{default:t(()=>[...e[0]||(e[0]=[y("Advanced",-1)])]),_:1}),a(F,null,{default:t(()=>[a(i,{ref_key:"mixedCard",ref:l,title:"Mixed Line + Bar",tag:"series type override"},{code:t(()=>[...e[1]||(e[1]=[n("pre",{class:"code-block"},`createChart(el, 'line', data, {
  title: 'Revenue vs Trend',
  series: {
    'Revenue': { type: 'bar' },
    'Trend':   { smooth: true, lineStyle: 'dashed' },
  },
});`,-1)])]),_:1},512),a(i,{ref_key:"colorsCard",ref:d,title:"Custom Colors",tag:"colorMap"},{code:t(()=>[...e[2]||(e[2]=[n("pre",{class:"code-block"},`createChart(el, 'pie', pieData, {
  colorMap: {
    'Chrome':  '#4285F4',
    'Firefox': '#FF7139',
    'Safari':  '#000000',
    'Edge':    '#0078D4',
  },
});`,-1)])]),_:1},512),a(i,{ref_key:"bgLegendCard",ref:g,title:"Rich Text Background Image",tag:"legend.formatLabel + backgroundImage"},{code:t(()=>[...e[3]||(e[3]=[n("pre",{class:"code-block"},`import arrowUpUrl from '../assets/arrow-up.svg';
import arrowDownUrl from '../assets/arrow-down.svg';

createChart(el, 'line', data, {
  legend: {
    formatLabel: (name, index) => {
      const points = data.series[index].data;
      const last = points.at(-1) ?? 0;
      const prev = points.at(-2) ?? last;
      const arrow = last >= prev ? arrowUpUrl : arrowDownUrl;
      return {
        segments: [
          { text: name, style: { padding: [0, 8, 0, 0] } },
          { text: String(last), style: { align: 'right', width: 40, padding: [0, 4, 0, 0] } },
          { text: ' ', style: { width: 14, height: 14, backgroundImage: arrow, verticalAlign: 'middle' } },
        ],
      };
    },
  },
});`,-1)])]),_:1},512)]),_:1})],64))}});export{E as default};
