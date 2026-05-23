<template>
  <SectionDivider>Tree Charts</SectionDivider>
  <DemoGrid>

    <DemoCard
      ref="lrCard"
      title="Left → Right (default)"
      tag='type="tree"'
      card-style="grid-column: 1 / -1;"
      box-style="height: 520px;"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'tree', {
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
  // direction defaults to 'left-to-right'
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="tbCard"
      title="Top → Bottom (labels rotate -90°)"
      tag="direction='top-to-bottom'"
      card-style="grid-column: 1 / -1;"
      box-style="height: 600px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Vertical layouts auto-rotate labels -90° (read top-to-bottom),
// matching ECharts' own `tree-vertical` reference example.
// Long node names like 'AgglomerativeCluster' stack vertically
// instead of competing for horizontal space with siblings.
createChart(el, 'tree', projectData, {
  title: 'Project Hierarchy',
  direction: 'top-to-bottom',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="rlCard"
      title="Right → Left"
      tag="direction='right-to-left'"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'tree', orgData, {
  title: 'Reverse Tree',
  direction: 'right-to-left',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="btCard"
      title="Bottom → Top (mirror of top-to-bottom)"
      tag="direction='bottom-to-top'"
      box-style="height: 460px;"
    >
      <template #code>
        <pre v-pre class="code-block">createChart(el, 'tree', orgData, {
  title: 'Roots Up',
  direction: 'bottom-to-top',
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="collapsedCard"
      title="Initial collapse + per-node color"
      tag="initialTreeDepth=2"
      card-style="grid-column: 1 / -1;"
      box-style="height: 520px;"
    >
      <template #code>
        <pre v-pre class="code-block">// initialTreeDepth: 2 → only the first two levels render expanded;
// deeper levels start collapsed and reveal on click.
//
// Per-node `color` pins specific branches (root + critical leaf).
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
});</pre>
      </template>
    </DemoCard>

    <DemoCard
      ref="avatarCard"
      title="Org chart — formatNodeIcon variants showcase"
      tag="shape + borderWidth + borderColor + tooltip.customHtml"
      card-style="grid-column: 1 / -1;"
      box-style="height: 560px;"
    >
      <template #code>
        <pre v-pre class="code-block">// Mixed-variant showcase — every person gets a deterministically-
// hashed variant pulled from a 5-entry table so the chart visually
// covers the full `formatNodeIcon` surface area in one screenshot:
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
// asks for a border: ECharts' `image://` symbol can't paint
// `itemStyle.border*` natively, so the lib bakes the frame INTO the
// PNG and swaps it in. `shape: 'square'` without a border keeps the
// faster native-image path for back-compat.
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
  for (let i = 0; i &lt; name.length; i++) h = ((h &lt;&lt; 5) + h + name.charCodeAt(i)) | 0;
  return ICON_VARIANTS[Math.abs(h) % ICON_VARIANTS.length];
}

createChart(el, 'tree', orgPeopleData, {
  direction: 'top-to-bottom',
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
    // Tree skips the built-in sync row when `customHtml` is set — render
    // the full body here (name + avatar).
    customHtml: async (ctx) => {
      if (ctx.kind !== 'item') return '';
      return `&lt;div style="text-align:center"&gt;&lt;img src="${avatarUrl}" alt="" width="48" height="48" style="display:block;margin:0 auto;border-radius:50%;object-fit:cover" /&gt;&lt;div style="margin-top:6px;font-weight:600"&gt;${ctx.name}&lt;/div&gt;&lt;/div&gt;`;
    },
  },
});

// Ship-it: pick the look you want and apply uniformly.
//   formatNodeIcon: () => ({ image: avatarUrl, width: 36, shape: 'circle', borderWidth: 2 })</pre>
      </template>
    </DemoCard>

  </DemoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createChart, type TreeData } from '@bndynet/icharts';
import SectionDivider from '../../components/SectionDivider.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import DemoCard from '../../components/DemoCard.vue';

/**
 * Bundled placeholder avatar — a colorful Memoji-style portrait
 * (256x256 PNG, ~6.5 KB) rasterized from the SVG below via
 * `rsvg-convert -w 256`:
 *
 *   <svg viewBox="0 0 80 80" width="80" height="80">
 *     <defs>
 *       <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
 *         <stop offset="0%"   stop-color="#60a5fa"/>   blue-400
 *         <stop offset="100%" stop-color="#a78bfa"/>   violet-400
 *       </linearGradient>
 *     </defs>
 *     <rect width="80" height="80" fill="url(#bg)"/>
 *     <ellipse cx="40" cy="80" rx="24" ry="22" fill="#fbbf24"/>  amber shirt
 *     <circle  cx="40" cy="32" r="14" fill="#fde68a"/>            warm skin
 *     <path d="M 26 32 A 14 14 0 0 0 54 32 Z" fill="#78350f"/>    brown hair dome
 *   </svg>
 *
 * Why PNG (not SVG)? PNG is a single, self-contained raster: no
 * gradient/font/script edge cases across browsers, no XML-parsing
 * gotchas (an earlier SVG version got mangled by an editor that
 * truncated multi-byte chars in comments and refused to render).
 * Rasterized at 256x256 — ~7x the demo's 36 px display size — so the
 * lib's canvas pipeline scales DOWN (which never blurs) and stays
 * crisp on retina/4K displays.
 *
 * Vite resolves this import to a same-origin URL at build time, so
 * the tree adapter's canvas pipeline (`crossOrigin = 'anonymous'` +
 * `canvas.toDataURL`) runs without CORS friction and every node
 * renders with the full circular treatment (clip + contain-fit +
 * palette-color border ring). One image is reused for every node;
 * the per-node palette-color ring drawn by the lib provides the
 * visual differentiation between nodes.
 *
 * Swap `avatarUrl` for any real photo URL when you have one. As long
 * as the host ships `Access-Control-Allow-Origin` headers, the same
 * full circular treatment applies; non-CORS hosts gracefully degrade
 * to a square framed avatar.
 */
import avatarUrl from '../../assets/avatar.png';

/**
 * Five `formatNodeIcon` variants showcased side-by-side in the org-
 * chart demo to communicate the full feature surface in one chart:
 *
 *   #0 — `shape: 'circle'`                                         clean ringless circle
 *   #1 — `shape: 'circle' + borderWidth: 2`                        palette-color ring
 *   #2 — `shape: 'circle' + borderWidth: 4 + borderColor: rose`    branded thick ring
 *   #3 — `shape: 'square' + borderWidth: 2`                        palette-color rect frame
 *   #4 — `shape: 'square' + borderWidth: 3 + borderColor: emerald` branded thick frame
 *
 * Variant #3 / #4 (square + border) exercise the canvas-baking path
 * that's specific to bordered rect avatars — ECharts' `image://`
 * symbol can't paint `itemStyle.border*`, so the lib swaps in a `rect`
 * shape symbol for the placeholder and bakes the frame into a PNG
 * for the final render. Variant #0 with `shape: 'square'` (not
 * shown — would be the 6th variant) keeps the simpler `image://`
 * native path; we omit it to keep the variant count to a memorable 5.
 *
 * Real apps almost always pick ONE variant and apply it uniformly to
 * every node — the mix is a teaching device for this demo card only.
 */
const ICON_VARIANTS = [
  { shape: 'circle' as const },
  { shape: 'circle' as const, borderWidth: 2 },
  { shape: 'circle' as const, borderWidth: 4, borderColor: '#f43f5e' },
  { shape: 'square' as const, borderWidth: 2 },
  { shape: 'square' as const, borderWidth: 3, borderColor: '#10b981' },
];

/**
 * djb2 hash → variant index. Deterministic per name so the same
 * person always gets the same variant across renders / theme
 * switches; uniform-enough across the 11-person sample (mix of
 * English given names + Chinese pinyin surnames) that no variant is
 * starved.
 */
function pickIconVariant(name: string) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  }
  return ICON_VARIANTS[Math.abs(h) % ICON_VARIANTS.length]!;
}

type CardRef = InstanceType<typeof DemoCard>;

const lrCard = ref<CardRef>();
const rlCard = ref<CardRef>();
const tbCard = ref<CardRef>();
const btCard = ref<CardRef>();
const collapsedCard = ref<CardRef>();
const avatarCard = ref<CardRef>();

// Mirrors the ECharts `tree-basic` reference data (trimmed to a readable
// depth so the four direction demos stay legible without scrolling).
const projectData: TreeData = {
  name: 'flare',
  children: [
    {
      name: 'analytics',
      children: [
        {
          name: 'cluster',
          children: [
            { name: 'AgglomerativeCluster' },
            { name: 'CommunityStructure' },
            { name: 'HierarchicalCluster' },
          ],
        },
        {
          name: 'graph',
          children: [
            { name: 'BetweennessCentrality' },
            { name: 'LinkDistance' },
            { name: 'ShortestPaths' },
          ],
        },
      ],
    },
    {
      name: 'data',
      children: [
        { name: 'DataField' },
        { name: 'DataSet' },
        { name: 'DataTable' },
      ],
    },
    {
      name: 'display',
      children: [
        { name: 'DirtySprite' },
        { name: 'LineSprite' },
        { name: 'TextSprite' },
      ],
    },
  ],
};

// Compact org chart — small enough to read in all four directions inside a
// 460 px card.
const orgData: TreeData = {
  name: 'CEO',
  children: [
    {
      name: 'CTO',
      children: [
        { name: 'Frontend' },
        { name: 'Backend' },
        { name: 'DevOps' },
      ],
    },
    {
      name: 'CPO',
      children: [{ name: 'PM' }, { name: 'Design' }],
    },
    {
      name: 'CFO',
      children: [{ name: 'Finance' }, { name: 'Legal' }],
    },
  ],
};

const collapsedData: TreeData = {
  name: 'Company',
  color: '#0ea5e9',
  children: [
    {
      name: 'Engineering',
      children: [
        {
          name: 'Frontend',
          children: [
            { name: 'Web' },
            { name: 'Mobile' },
            { name: 'Design Sys' },
          ],
        },
        {
          name: 'Backend',
          children: [
            { name: 'API' },
            { name: 'Data' },
            { name: 'Infra', color: '#ef4444' },
          ],
        },
      ],
    },
    {
      name: 'Product',
      children: [{ name: 'PMs' }, { name: 'UX Research' }],
    },
    {
      name: 'Operations',
      children: [
        { name: 'Finance' },
        { name: 'HR' },
        { name: 'Legal' },
      ],
    },
  ],
};

const orgPeopleData: TreeData = {
  name: 'Ava Chen',
  children: [
    {
      name: 'Leo Wang',
      children: [
        { name: 'Iris Xu' },
        { name: 'Ethan Zhou' },
        { name: 'Noah Lin' },
      ],
    },
    {
      name: 'Mia Liu',
      children: [{ name: 'Olivia Gao' }, { name: 'Lucas Song' }],
    },
    {
      name: 'Ryan Hu',
      children: [{ name: 'Sophie Qin' }, { name: 'David Fan' }],
    },
  ],
};

// Auto-disposed on unmount via the sentinel installed inside each chart's
// container — see `LineAreaCharts.vue` for the full note.
onMounted(() => {
  createChart(lrCard.value!.chartEl!, 'tree', projectData, {
    title: 'Project Hierarchy',
  });
  createChart(rlCard.value!.chartEl!, 'tree', orgData, {
    title: 'Reverse Tree',
    direction: 'right-to-left',
  });
  createChart(tbCard.value!.chartEl!, 'tree', projectData, {
    title: 'Project Hierarchy',
    direction: 'top-to-bottom',
  });
  createChart(btCard.value!.chartEl!, 'tree', orgData, {
    title: 'Roots Up',
    direction: 'bottom-to-top',
  });
  createChart(collapsedCard.value!.chartEl!, 'tree', collapsedData, {
    title: 'Initially Collapsed Tree',
    initialTreeDepth: 2,
  });
  createChart(avatarCard.value!.chartEl!, 'tree', orgPeopleData, {
    direction: 'top-to-bottom',
    disableLabelRotate: true,
    // No `initialTreeDepth` — we want every leaf visible so the
    // 5-variant showcase is fully on screen (otherwise hashing only
    // covers the 4 visible nodes at depth ≤ 1 and 1–2 variants stay
    // hidden behind the collapse arrows).
    formatNodeIcon: ({ name }) => ({
      image: avatarUrl,
      // 36 px reads as a real avatar (not a dot) inside the 560 px-tall
      // org-chart card. Pair with the 80 px SVG source so the contain-
      // fit scales down — never up — for crisp pixels.
      width: 36,
      // The variant table provides `shape` + (optional) `borderWidth`
      // / `borderColor`. Spread last so per-node values win over
      // anything we might add as a uniform default above.
      ...pickIconVariant(name),
    }),
    formatNodeLabel: ({ name }) => ({
      segments: [
        { text: name, style: 'name' },
      ],
      styles: {
        name: { width: 120, align: 'center', fontWeight: 600 },
      },
    }),
    tooltip: {
      customHtml: async (ctx) => {
        if (ctx.kind !== 'item') return '';
        return `<div style="text-align:center"><img src="${avatarUrl}" alt="" width="48" height="48" style="display:block;margin:0 auto;border-radius:50%;object-fit:cover" /><div style="margin-top:6px;font-weight:600">${ctx.name}</div></div>`;
      },
    },
  });
});
</script>
