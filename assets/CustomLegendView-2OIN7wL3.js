import{d as p,o as u,l as g,a as f,c as h,b as r,w as i,e as n,f as a,m as C,F as x,r as y}from"./index-B6IDcwPx.js";import{c as v}from"./api-6F-8kEI9.js";import{S as b,D as w,a as N}from"./DemoCard-ClnI8xzw.js";import{p as s}from"./sharedData-B5v8ntqg.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const E=p({__name:"CustomLegendView",setup(_){const d=y();return u(()=>{const m=s.reduce((e,o)=>e+o.value,0),t=new Map(s.map(e=>[e.name,e.value])),l={Chrome:"🌐",Safari:"🧭",Edge:"🧩",Firefox:"🦊",Other:"📦"};v(d.value.chartEl,"pie",s,{legend:{show:!0,position:"right",formatLabel:e=>{const o=t.get(e)??0,c=(o/m*100).toFixed(0);return{segments:[{text:`${l[e]??"•"} ${e==="Chrome"?"Google Chrome":e}`,width:80,style:{fontWeight:800}},{text:`${o} (${c}%)`,width:60,align:"right",style:{color:"#9aa1ad"}}]}}},padding:20})}),(m,t)=>{const l=g("el-alert");return f(),h(x,null,[r(b,null,{default:i(()=>[...t[0]||(t[0]=[n("Custom Legend (formatLabel)",-1)])]),_:1}),r(l,{type:"info",closable:!1,"show-icon":"",style:{"margin-bottom":"16px"}},{default:i(()=>[...t[1]||(t[1]=[a("code",null,"legend.formatLabel: (name, index) => string | RichTextSpec",-1),n(" maps to ECharts' native ",-1),a("code",null,"legend.formatter",-1),n(". Use it to append values, units, status, or structured segments (auto-compiled to rich text) per entry. Side-edge legends (",-1),a("code",null,"position: 'left' / 'right'",-1),n(") automatically re-measure with the formatted text so long values don't bleed into the chart body. See ",-1),a("code",null,"LegendOptions",-1),n(" in the README for the full contract. ",-1)])]),_:1}),r(N,null,{default:i(()=>[C(" ─────────── Pie: combined cases (value + newline + emoji) ─────────── "),r(w,{ref_key:"pieValueCard",ref:d,title:"Pie",tag:"formatLabel","card-style":"grid-column: 1 / -1;"},{code:i(()=>[...t[2]||(t[2]=[a("pre",{class:"code-block"},`const total = pieData.reduce((s, d) => s + d.value, 0);
const byName = new Map(pieData.map((d) => [d.name, d.value]));
const iconByName: Record<string, string> = {
  Chrome: '🌐',
  Safari: '🧭',
  Edge: '🧩',
  Firefox: '🦊',
  Other: '📦',
};

createChart(el, 'pie', pieData, {
  legend: {
    show: true,
    position: 'right',
    formatLabel: (name) => {
      const v = byName.get(name) ?? 0;
      const pct = ((v / total) * 100).toFixed(1);
      return {
        segments: [
          {
            text: \`\${iconByName[name] ?? '•'} \${name === 'Chrome' ? 'Google Chrome' : name}\`,
            width: 60,
            style: { fontSize: 24, verticalAlign: 'middle', lineHeight: 46 },
          },
          {
            text: \`\${v}\\n(\${pct}%)\`,
            width: 60,
            align: 'right',
            style: { color: '#9aa1ad' },
          },
        ],
      };
    },
  },
  padding: 20,
});`,-1)])]),_:1},512)]),_:1})],64)}}});export{E as default};
