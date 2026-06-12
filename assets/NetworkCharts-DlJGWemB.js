import{d,o as y,a as h,c as p,b as a,w as r,e as f,f as o,F as k,r as c}from"./index-B6IDcwPx.js";import{c as n}from"./api-6F-8kEI9.js";import{S as C,D as l,a as b}from"./DemoCard-ClnI8xzw.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const F=d({__name:"NetworkCharts",setup(D){const u=c(),s=c(),g=c(),m={nodes:[{name:"Alice",category:"Frontend",value:12},{name:"Bob",category:"Frontend",value:8},{name:"Sam",category:"Frontend",value:6},{name:"Mia",category:"Frontend",value:5},{name:"Carol",category:"Backend",value:14},{name:"Dan",category:"Backend",value:9},{name:"Tom",category:"Backend",value:7},{name:"Ivy",category:"Backend",value:5},{name:"Eve",category:"Design",value:10},{name:"Leo",category:"Design",value:6},{name:"Zoe",category:"Design",value:4},{name:"Frank",category:"DevOps",value:11},{name:"Greg",category:"DevOps",value:7},{name:"Helen",category:"Product",value:13},{name:"Ian",category:"Product",value:8},{name:"Joe",category:"Product",value:5}],links:[{source:"Alice",target:"Bob",value:6},{source:"Alice",target:"Sam",value:4},{source:"Bob",target:"Mia",value:3},{source:"Carol",target:"Dan",value:7},{source:"Carol",target:"Tom",value:5},{source:"Dan",target:"Ivy",value:4},{source:"Alice",target:"Carol",value:8},{source:"Bob",target:"Dan",value:5},{source:"Sam",target:"Tom",value:4},{source:"Mia",target:"Ivy",value:3},{source:"Eve",target:"Alice",value:6},{source:"Eve",target:"Bob",value:4},{source:"Leo",target:"Sam",value:5},{source:"Zoe",target:"Mia",value:3},{source:"Eve",target:"Leo",value:4},{source:"Leo",target:"Zoe",value:3},{source:"Frank",target:"Carol",value:6},{source:"Frank",target:"Dan",value:4},{source:"Greg",target:"Tom",value:5},{source:"Frank",target:"Greg",value:5},{source:"Helen",target:"Alice",value:5},{source:"Helen",target:"Carol",value:6},{source:"Helen",target:"Eve",value:4},{source:"Ian",target:"Bob",value:3},{source:"Ian",target:"Frank",value:4},{source:"Joe",target:"Mia",value:3},{source:"Joe",target:"Leo",value:3},{source:"Helen",target:"Ian",value:5},{source:"Ian",target:"Joe",value:3}]},i={nodes:[{name:"auth-svc",category:"Auth",value:18},{name:"sso",category:"Auth",value:12},{name:"mfa",category:"Auth",value:8},{name:"oauth-bridge",category:"Auth",value:9},{name:"user-svc",category:"Identity",value:16},{name:"profile",category:"Identity",value:11},{name:"prefs",category:"Identity",value:7},{name:"catalog",category:"Commerce",value:15},{name:"cart",category:"Commerce",value:13},{name:"checkout",category:"Commerce",value:14},{name:"billing",category:"Commerce",value:10},{name:"pricing",category:"Commerce",value:8},{name:"inventory",category:"Commerce",value:9},{name:"search",category:"Content",value:12},{name:"recommend",category:"Content",value:9},{name:"blog",category:"Content",value:6},{name:"media",category:"Content",value:8},{name:"gateway",category:"Infra",value:22},{name:"queue",category:"Infra",value:12},{name:"cache",category:"Infra",value:14},{name:"scheduler",category:"Infra",value:7},{name:"secrets",category:"Infra",value:9},{name:"storage",category:"Infra",value:11},{name:"audit",category:"Infra",value:6},{name:"metrics",category:"Infra",value:10},{name:"tracing",category:"Infra",value:8},{name:"logs",category:"Infra",value:9},{name:"alerts",category:"Infra",value:5}],links:[{source:"gateway",target:"auth-svc"},{source:"gateway",target:"user-svc"},{source:"gateway",target:"catalog"},{source:"gateway",target:"search"},{source:"gateway",target:"cart"},{source:"gateway",target:"checkout"},{source:"gateway",target:"blog"},{source:"auth-svc",target:"sso"},{source:"auth-svc",target:"mfa"},{source:"auth-svc",target:"oauth-bridge"},{source:"auth-svc",target:"user-svc"},{source:"auth-svc",target:"cache"},{source:"auth-svc",target:"secrets"},{source:"user-svc",target:"profile"},{source:"user-svc",target:"prefs"},{source:"user-svc",target:"cache"},{source:"user-svc",target:"storage"},{source:"catalog",target:"inventory"},{source:"catalog",target:"pricing"},{source:"catalog",target:"cache"},{source:"catalog",target:"storage"},{source:"cart",target:"catalog"},{source:"cart",target:"pricing"},{source:"cart",target:"cache"},{source:"checkout",target:"cart"},{source:"checkout",target:"billing"},{source:"checkout",target:"inventory"},{source:"checkout",target:"queue"},{source:"billing",target:"queue"},{source:"billing",target:"audit"},{source:"search",target:"catalog"},{source:"search",target:"cache"},{source:"recommend",target:"user-svc"},{source:"recommend",target:"catalog"},{source:"blog",target:"media"},{source:"blog",target:"storage"},{source:"queue",target:"logs"},{source:"queue",target:"metrics"},{source:"metrics",target:"alerts"},{source:"tracing",target:"logs"},{source:"audit",target:"logs"},{source:"scheduler",target:"queue"},{source:"scheduler",target:"cache"}]},v={nodes:[{name:"Alpha"},{name:"Beta",color:"#ff5722"},{name:"Gamma"},{name:"Delta"},{name:"Epsilon"}],links:[{source:"Alpha",target:"Beta"},{source:"Alpha",target:"Gamma"},{source:"Beta",target:"Delta"},{source:"Gamma",target:"Delta"},{source:"Delta",target:"Epsilon"}]};return y(()=>{n(u.value.chartEl,"network",m,{title:"Team Collaboration",tooltip:{formatValue:t=>t+" interactions"}}),n(s.value.chartEl,"network",i,{title:"Microservice Dependencies",variant:"circular",tooltip:{formatValue:t=>t+" deps"}}),n(g.value.chartEl,"network",v,{colorMap:{Gamma:"#10b981"},colors:["#3b82f6","#a855f7","#10b981","#f59e0b","#0ea5e9"]})}),(t,e)=>(h(),p(k,null,[a(C,null,{default:r(()=>[...e[0]||(e[0]=[f("Network Charts",-1)])]),_:1}),a(b,null,{default:r(()=>[a(l,{ref_key:"forceCard",ref:u,title:"Team Collaboration",tag:'type="network"',"card-style":"grid-column: 1 / -1;","box-style":"height: 480px;"},{code:r(()=>[...e[1]||(e[1]=[o("pre",{class:"code-block"},`createChart(el, 'network', {
  nodes: [
    { name: 'Alice', category: 'Frontend', value: 12 },
    { name: 'Bob',   category: 'Frontend', value:  8 },
    { name: 'Carol', category: 'Backend',  value: 14 },
    { name: 'Dan',   category: 'Backend',  value:  9 },
    { name: 'Eve',   category: 'Design',   value: 10 },
    { name: 'Frank', category: 'DevOps',   value: 11 },
    { name: 'Helen', category: 'Product',  value: 13 },
    // ... 9 more across the 5 categories
  ],
  links: [
    { source: 'Alice', target: 'Carol', value: 8 },  // Frontend ↔ Backend
    { source: 'Eve',   target: 'Alice', value: 6 },  // Design  ↔ Frontend
    { source: 'Frank', target: 'Carol', value: 6 },  // DevOps  ↔ Backend
    { source: 'Helen', target: 'Carol', value: 6 },  // Product ↔ Backend
    // ... 26 more collaboration edges
  ],
}, {
  title: 'Team Collaboration',
  tooltip: { formatValue: (v) => v + ' interactions' },
});`,-1)])]),_:1},512),a(l,{ref_key:"circularCard",ref:s,title:"Microservice Dependencies",tag:'variant="circular"',"card-style":"grid-column: 1 / -1;","box-style":"height: 560px;"},{code:r(()=>[...e[2]||(e[2]=[o("pre",{class:"code-block"},`createChart(el, 'network', {
  nodes: [
    { name: 'gateway',  category: 'Infra',    value: 22 },
    { name: 'auth-svc', category: 'Auth',     value: 18 },
    { name: 'user-svc', category: 'Identity', value: 16 },
    { name: 'catalog',  category: 'Commerce', value: 15 },
    { name: 'cart',     category: 'Commerce', value: 13 },
    // ... 23 more services across 5 categories
  ],
  links: [
    { source: 'gateway',  target: 'auth-svc' },
    { source: 'auth-svc', target: 'user-svc' },
    { source: 'cart',     target: 'catalog' },
    { source: 'checkout', target: 'cart' },
    // ... 38 more service-to-service calls
  ],
}, {
  title: 'Microservice Dependencies',
  variant: 'circular',
  // edgeCurveness defaults to 0.3 for circular — matches ECharts'
  // built-in circular-layout example.
  tooltip: { formatValue: (v) => v + ' deps' },
});`,-1)])]),_:1},512),a(l,{ref_key:"paletteCard",ref:g,title:"Per-Node Coloring",tag:"data: no categories","card-style":"grid-column: 1 / -1;","box-style":"height: 460px;"},{code:r(()=>[...e[3]||(e[3]=[o("pre",{class:"code-block"},`// Color priority for nodes WITHOUT a \`category\`:
//   1. node.color                 — wins outright
//   2. options.colorMap[node.name] — per-name override
//   3. options.colors[i]           — palette by node index
//   4. theme palette[i]            — when colors is omitted
//
// The 5 nodes below cover all four rungs at once.
createChart(el, 'network', {
  nodes: [
    { name: 'Alpha' },                       // (3) colors[0]  → #3b82f6
    { name: 'Beta',  color: '#ff5722' },     // (1) node.color → #ff5722
    { name: 'Gamma' },                       // (2) colorMap   → #10b981
    { name: 'Delta' },                       // (3) colors[3]  → #f59e0b
    { name: 'Epsilon' },                     // (3) colors[4]  → #0ea5e9
  ],
  links: [
    { source: 'Alpha', target: 'Beta'    },
    { source: 'Alpha', target: 'Gamma'   },
    { source: 'Beta',  target: 'Delta'   },
    { source: 'Gamma', target: 'Delta'   },
    { source: 'Delta', target: 'Epsilon' },
  ],
}, {
  title: 'Per-Node Coloring',
  // colorMap['Gamma'] beats colors[2] (which is purple #a855f7),
  // proving (2) ranks higher than (3).
  colorMap: { Gamma: '#10b981' },
  // Replaces the theme palette; consumed by index for nodes that
  // don't trigger a higher-priority rule.
  colors: ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9'],
});`,-1)])]),_:1},512)]),_:1})],64))}});export{F as default};
