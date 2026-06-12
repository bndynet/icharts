import{d as D,o as T,a as x,c as w,b as t,w as r,e as I,f as n,F as N,r as i}from"./index-B6IDcwPx.js";import{c as o}from"./api-6F-8kEI9.js";import{S as R,D as l,a as L}from"./DemoCard-ClnI8xzw.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const y="/icharts/assets/avatar-C6V3lSJj.png",O=D({__name:"TreeCharts",setup(S){const c=[{shape:"circle"},{shape:"circle",borderWidth:2},{shape:"circle",borderWidth:4,borderColor:"#f43f5e"},{shape:"square",borderWidth:2},{shape:"square",borderWidth:3,borderColor:"#10b981"}];function v(a){let e=5381;for(let s=0;s<a.length;s++)e=(e<<5)+e+a.charCodeAt(s)|0;return c[Math.abs(e)%c.length]}const d=i(),m=i(),h=i(),p=i(),g=i(),u=i(),b={name:"flare",children:[{name:"analytics",children:[{name:"cluster",children:[{name:"AgglomerativeCluster"},{name:"CommunityStructure"},{name:"HierarchicalCluster"}]},{name:"graph",children:[{name:"BetweennessCentrality"},{name:"LinkDistance"},{name:"ShortestPaths"}]}]},{name:"data",children:[{name:"DataField"},{name:"DataSet"},{name:"DataTable"}]},{name:"display",children:[{name:"DirtySprite"},{name:"LineSprite"},{name:"TextSprite"}]}]},f={name:"CEO",children:[{name:"CTO",children:[{name:"Frontend"},{name:"Backend"},{name:"DevOps"}]},{name:"CPO",children:[{name:"PM"},{name:"Design"}]},{name:"CFO",children:[{name:"Finance"},{name:"Legal"}]}]},C={name:"Company",color:"#0ea5e9",children:[{name:"Engineering",children:[{name:"Frontend",children:[{name:"Web"},{name:"Mobile"},{name:"Design Sys"}]},{name:"Backend",children:[{name:"API"},{name:"Data"},{name:"Infra",color:"#ef4444"}]}]},{name:"Product",children:[{name:"PMs"},{name:"UX Research"}]},{name:"Operations",children:[{name:"Finance"},{name:"HR"},{name:"Legal"}]}]},k={name:"Ava Chen",children:[{name:"Leo Wang",children:[{name:"Iris Xu"},{name:"Ethan Zhou"},{name:"Noah Lin"}]},{name:"Mia Liu",children:[{name:"Olivia Gao"},{name:"Lucas Song"}]},{name:"Ryan Hu",children:[{name:"Sophie Qin"},{name:"David Fan"}]}]};return T(()=>{o(d.value.chartEl,"tree",b,{title:"Project Hierarchy"}),o(m.value.chartEl,"tree",f,{title:"Reverse Tree",direction:"RL"}),o(h.value.chartEl,"tree",b,{title:"Project Hierarchy",direction:"TB"}),o(p.value.chartEl,"tree",f,{title:"Roots Up",direction:"BT"}),o(g.value.chartEl,"tree",C,{title:"Initially Collapsed Tree",initialTreeDepth:2}),o(u.value.chartEl,"tree",k,{direction:"TB",disableLabelRotate:!0,formatNodeIcon:({name:a})=>({image:y,width:36,...v(a)}),formatNodeLabel:({name:a})=>({segments:[{text:a,style:"name"}],styles:{name:{width:120,align:"center",fontWeight:600}}}),tooltip:{customHtml:async a=>a.kind!=="item"?"":`<div style="text-align:center"><img src="${y}" alt="" width="48" height="48" style="display:block;margin:0 auto;border-radius:50%;object-fit:cover" /><div style="margin-top:6px;font-weight:600">${a.name}</div></div>`}})}),(a,e)=>(x(),w(N,null,[t(R,null,{default:r(()=>[...e[0]||(e[0]=[I("Tree Charts",-1)])]),_:1}),t(L,null,{default:r(()=>[t(l,{ref_key:"lrCard",ref:d,title:"Left → Right (default)",tag:'type="tree"',"card-style":"grid-column: 1 / -1;","box-style":"height: 520px;"},{code:r(()=>[...e[1]||(e[1]=[n("pre",{class:"code-block"},`createChart(el, 'tree', {
  name: 'flare',
  children: [
    { name: 'analytics', children: [
      { name: 'cluster', children: [
        { name: 'AgglomerativeCluster' },
        { name: 'CommunityStructure' },
      ]},
      { name: 'graph', children: [
        { name: 'BetweennessCentrality' },
        { name: 'LinkDistance' },
      ]},
    ]},
    { name: 'data', children: [
      { name: 'DataField' },
      { name: 'DataTable' },
    ]},
    { name: 'display', children: [
      { name: 'DirtySprite' },
      { name: 'TextSprite' },
    ]},
  ],
}, {
  title: 'Project Hierarchy',
  // direction defaults to 'LR'
});`,-1)])]),_:1},512),t(l,{ref_key:"tbCard",ref:h,title:"Top → Bottom (labels rotate -90°)",tag:"direction='TB'","card-style":"grid-column: 1 / -1;","box-style":"height: 600px;"},{code:r(()=>[...e[2]||(e[2]=[n("pre",{class:"code-block"},`// Vertical layouts auto-rotate labels -90° so text reads top-to-bottom
// alongside the downward-growing tree. Long node names like
// 'AgglomerativeCluster' stack vertically instead of competing for
// horizontal space with siblings.
createChart(el, 'tree', projectData, {
  title: 'Project Hierarchy',
  direction: 'TB',
});`,-1)])]),_:1},512),t(l,{ref_key:"rlCard",ref:m,title:"Right → Left",tag:"direction='RL'","box-style":"height: 460px;"},{code:r(()=>[...e[3]||(e[3]=[n("pre",{class:"code-block"},`createChart(el, 'tree', orgData, {
  title: 'Reverse Tree',
  direction: 'RL',
});`,-1)])]),_:1},512),t(l,{ref_key:"btCard",ref:p,title:"Bottom → Top (mirror of TB)",tag:"direction='BT'","box-style":"height: 460px;"},{code:r(()=>[...e[4]||(e[4]=[n("pre",{class:"code-block"},`createChart(el, 'tree', orgData, {
  title: 'Roots Up',
  direction: 'BT',
});`,-1)])]),_:1},512),t(l,{ref_key:"collapsedCard",ref:g,title:"Initial collapse + per-node color",tag:"initialTreeDepth=2","card-style":"grid-column: 1 / -1;","box-style":"height: 520px;"},{code:r(()=>[...e[5]||(e[5]=[n("pre",{class:"code-block"},`// initialTreeDepth: 2 → only the first two levels render expanded;
// deeper levels start collapsed and reveal on click.
//
// Per-node \`color\` pins specific branches (root + critical leaf).
createChart(el, 'tree', {
  name: 'Company',
  color: '#0ea5e9',
  children: [
    { name: 'Engineering', children: [
      { name: 'Frontend', children: [
        { name: 'Web' }, { name: 'Mobile' }, { name: 'Design Sys' },
      ]},
      { name: 'Backend', children: [
        { name: 'API' }, { name: 'Data' }, { name: 'Infra', color: '#ef4444' },
      ]},
    ]},
    { name: 'Product', children: [
      { name: 'PMs' }, { name: 'UX Research' },
    ]},
    { name: 'Operations', children: [
      { name: 'Finance' }, { name: 'HR' }, { name: 'Legal' },
    ]},
  ],
}, {
  title: 'Initially Collapsed Tree',
  initialTreeDepth: 2,
});`,-1)])]),_:1},512),t(l,{ref_key:"avatarCard",ref:u,title:"Org chart — formatNodeIcon variants showcase",tag:"shape + borderWidth + borderColor + tooltip.customHtml","card-style":"grid-column: 1 / -1;","box-style":"height: 560px;"},{code:r(()=>[...e[6]||(e[6]=[n("pre",{class:"code-block"},`// Mixed-variant showcase — every person gets a deterministically-
// hashed variant pulled from a 5-entry table so the chart visually
// covers the full \`formatNodeIcon\` surface area in one screenshot:
//
//   • circle, no border                  — clean ringless avatar
//   • circle + borderWidth: 2            — palette-color ring (classic)
//   • circle + borderWidth + borderColor — branded thick ring
//   • square + borderWidth: 2            — palette-color rect frame
//   • square + borderWidth + borderColor — branded thick rect frame
//
// (Real apps usually pin ONE variant for every node; the mix here is
// a teaching device — see the "ship-it" snippet at the bottom for a
// uniform configuration.)
//
// Both shapes go through the canvas-baking pipeline whenever the user
// asks for a border — the lib bakes the frame INTO the PNG and swaps
// it in. \`shape: 'square'\` without a border keeps the faster
// native-image path for back-compat.
import avatarUrl from '../../assets/avatar.png';

const ICON_VARIANTS = [
  { shape: 'circle' },
  { shape: 'circle', borderWidth: 2 },
  { shape: 'circle', borderWidth: 4, borderColor: '#f43f5e' }, // rose-500
  { shape: 'square', borderWidth: 2 },
  { shape: 'square', borderWidth: 3, borderColor: '#10b981' }, // emerald-500
];

// djb2 hash → variant index. Deterministic per name so the same
// person always gets the same variant across renders.
function pickIconVariant(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  return ICON_VARIANTS[Math.abs(h) % ICON_VARIANTS.length];
}

createChart(el, 'tree', orgPeopleData, {
  direction: 'TB',
  disableLabelRotate: true,
  formatNodeIcon: ({ name }) => ({
    image: avatarUrl,
    width: 36,
    ...pickIconVariant(name),
  }),
  formatNodeLabel: ({ name }) => ({
    segments: [{ text: name, style: 'name' }],
    styles: { name: { width: 120, align: 'center', fontWeight: 600 } },
  }),
  tooltip: {
    // Tree skips the built-in sync row when \`customHtml\` is set — render
    // the full body here (name + avatar).
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      return \`<div style="text-align:center"><img src="\${avatarUrl}" alt="" width="48" height="48" style="display:block;margin:0 auto;border-radius:50%;object-fit:cover" /><div style="margin-top:6px;font-weight:600">\${ctx.name}</div></div>\`;
    },
  },
});

// Ship-it: pick the look you want and apply uniformly.
//   formatNodeIcon: () => ({ image: avatarUrl, width: 36, shape: 'circle', borderWidth: 2 })`,-1)])]),_:1},512)]),_:1})],64))}});export{O as default};
