import{d as T,I as A,o as F,c as M,s as N,a as V,r as p,b as U,e as J,g as l,w as r,h as n,i as o,t as v,u as $,j as R}from"./index-gN_1lBJp.js";import{createChart as j}from"./index-_UTMGnlo.js";import{_ as G}from"./_plugin-vue_export-helper-DlAUqK2U.js";const L={style:{"max-width":"1280px",margin:"0 auto"}},q={class:"demo-grid"},H={class:"card-head"},K={class:"race-controls"},i=1960,w=2030,E=500,I=10,O=T({__name:"DynamicDataView",setup(Q){const{theme:P}=A(),h=R();let a=null,c=null;const m=R(!1),s=R(i),x=[{name:"China",start:660,rate:.025,plateauYear:1990,plateauRate:.002},{name:"Russia",start:120,rate:.008,plateauYear:1990,plateauRate:-.003},{name:"Japan",start:92,rate:.015,plateauYear:2e3,plateauRate:-.002},{name:"Germany",start:73,rate:.008,plateauYear:2e3,plateauRate:.001},{name:"India",start:449,rate:.03},{name:"USA",start:186,rate:.018},{name:"Indonesia",start:88,rate:.028},{name:"Brazil",start:73,rate:.03,plateauYear:2005,plateauRate:.008},{name:"Mexico",start:38,rate:.035,plateauYear:2010,plateauRate:.01},{name:"Vietnam",start:35,rate:.032,plateauYear:2010,plateauRate:.008},{name:"Egypt",start:27,rate:.035},{name:"Bangladesh",start:49,rate:.035,plateauYear:2005,plateauRate:.012},{name:"Pakistan",start:45,rate:.05},{name:"Nigeria",start:45,rate:.06},{name:"Ethiopia",start:22,rate:.065}],Y=x.map(t=>t.name);function k(t,e){let u=t.start;for(let d=i+1;d<=e;d++){const C=t.plateauYear!==void 0&&d>t.plateauYear?t.plateauRate??.005:t.rate;u*=1+C}return Math.round(u)}function _(t){return{categories:Y,series:[{name:"Population (M)",data:x.map(e=>k(e,t))}]}}function z(){if(s.value>=w){f();return}s.value+=1,a==null||a.update(_(s.value),{title:b(s.value)})}function g(){m.value||!a||s.value>=w||(m.value=!0,c=setInterval(z,E))}function f(){m.value=!1,c!==null&&(clearInterval(c),c=null)}function B(){f(),s.value=i,a==null||a.update(_(i),{title:b(i)}),g()}function b(t){return`Population by Country — ${t}`}return F(()=>{M({consistentColors:!1}),a=j(h.value,"bar",_(i),{variant:"race",race:{topN:I,frameDuration:E},colorByCategory:!0,title:b(i)}),N(P.value),g()}),V(()=>{f(),a==null||a.dispose(),a=null}),(t,e)=>{const u=p("el-tag"),d=p("el-alert"),y=p("el-button"),C=p("el-button-group"),D=p("el-text"),S=p("el-card");return U(),J("div",L,[l(d,{type:"info","show-icon":"",closable:!1,style:{"margin-bottom":"24px"}},{default:r(()=>[e[2]||(e[2]=n(" These demos drive the chart with ",-1)),l(u,{size:"small",type:"info",effect:"plain",style:{margin:"0 4px"}},{default:r(()=>[...e[0]||(e[0]=[n("setInterval",-1)])]),_:1}),e[3]||(e[3]=n(" → ",-1)),l(u,{size:"small",type:"info",effect:"plain",style:{margin:"0 4px"}},{default:r(()=>[...e[1]||(e[1]=[n("chart.update(nextFrame)",-1)])]),_:1}),e[4]||(e[4]=n(". The library renders one frame per call and ECharts animates the value/position transitions between frames. ",-1))]),_:1}),o("div",q,[l(S,{shadow:"hover",style:{"grid-column":"1 / -1"}},{header:r(()=>[o("div",H,[o("span",null,"Bar Race — Population by Country (synthetic, 1960 → "+v(s.value)+")",1),l(u,{type:"success",size:"small",effect:"plain"},{default:r(()=>[...e[5]||(e[5]=[n('variant="race"',-1)])]),_:1})])]),default:r(()=>[o("div",K,[l(C,null,{default:r(()=>[l(y,{disabled:m.value,size:"small",onClick:g},{default:r(()=>[...e[6]||(e[6]=[n("Play",-1)])]),_:1},8,["disabled"]),l(y,{disabled:!m.value,size:"small",onClick:f},{default:r(()=>[...e[7]||(e[7]=[n("Pause",-1)])]),_:1},8,["disabled"]),l(y,{size:"small",onClick:B},{default:r(()=>[...e[8]||(e[8]=[n("Restart",-1)])]),_:1})]),_:1}),l(D,{type:"info",size:"small",style:{"margin-left":"12px"}},{default:r(()=>[e[9]||(e[9]=n(" Year: ",-1)),o("strong",null,v(s.value),1),n(" · Top "+v(I)+" of "+v($(Y).length)+" countries ",1)]),_:1})]),o("div",{ref_key:"chartRaceEl",ref:h,class:"chart-box"},null,512),e[10]||(e[10]=o("details",null,[o("summary",null,"Show code"),o("pre",{class:"code-block"},`// Racers are registered once. Their order in \`categories\` is the bar identity
// that ECharts uses to match frames — never reorder, never add/remove mid-race.
const racers = ['USA', 'China', 'India', 'Brazil', 'Japan', /* ... */];

function frameFor(year: number) {
  return {
    categories: racers,
    series: [{
      name: 'Population (M)',
      data: racers.map(r => populationLookup[r][year]),   // raw values, unsorted
    }],
  };
}

const chart = createChart(el, 'bar', frameFor(1960), {
  variant: 'race',
  race: { topN: 10, frameDuration: 500 },
  colorByCategory: true,  // distinct color per racer (legend auto-hides)
  title: 'Population by Country — 1960',
});

let year = 1960;
const timer = setInterval(() => {
  year++;
  if (year > 2030) { clearInterval(timer); return; }
  chart.update(frameFor(year), { title: \`Population by Country — \${year}\` });
}, 500);`)],-1))]),_:1})])])}}}),ee=G(O,[["__scopeId","data-v-f67c2b7d"]]);export{ee as default};
