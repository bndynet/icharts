import { watch } from 'vue';

import { defineConfig, useTheme } from '@bndynet/vue-site';

export default defineConfig({
  title: '<i-chart />',
  nav: [
    { label: 'Home', icon: 'home', page: () => import('../README.md?raw') },
    {
      label: 'Charts',
      icon: 'chart-pie',
      children: [
        {
          label: 'Line Area',
          icon: 'chart-line',
          page: () => import('./views/charts/LineAreaCharts.vue'),
        },
        {
          label: 'Bar',
          icon: 'chart-bar',
          page: () => import('./views/charts/BarCharts.vue'),
        },
        {
          label: 'Pie',
          icon: 'chart-pie',
          page: () => import('./views/charts/PieCharts.vue'),
        },
        {
          label: 'Radar',
          icon: 'radar',
          page: () => import('./views/charts/RadarCharts.vue'),
        },
        {
          label: 'Gauge',
          icon: 'gauge',
          page: () => import('./views/charts/GaugeCharts.vue'),
        },
        {
          label: 'Chord',
          icon: 'orbit',
          page: () => import('./views/charts/ChordCharts.vue'),
        },
        {
          label: 'Sankey',
          icon: 'workflow',
          page: () => import('./views/charts/SankeyCharts.vue'),
        },
        {
          label: 'Network',
          icon: 'network',
          page: () => import('./views/charts/NetworkCharts.vue'),
        },
        {
          label: 'Tree',
          icon: 'list-tree',
          page: () => import('./views/charts/TreeCharts.vue'),
        },
        {
          label: 'Advanced',
          icon: 'sparkles',
          page: () => import('./views/charts/AdvancedCharts.vue'),
        },
        {
          label: 'Web Component',
          icon: 'component',
          page: () => import('./views/charts/WebComponentCharts.vue'),
        },
      ],
    },
    {
      label: 'Dashboard',
      icon: 'layout-dashboard',
      page: () => import('./views/DashboardView.vue'),
    },
    {
      label: 'Dynamic Data',
      icon: 'activity',
      page: () => import('./views/DynamicDataView.vue'),
    },
    {
      label: 'Custom Tooltip',
      icon: 'message-square-text',
      page: () => import('./views/CustomTooltipView.vue'),
    },
    {
      label: 'Custom Legend',
      icon: 'tag',
      page: () => import('./views/CustomLegendView.vue'),
    },
  ],
  env: {
    port: 3000,
    outDir: 'site-dist',
    customElements: ['i-chart'],
    watchPackages: [
      {
        name: '@bndynet/icharts',
        entryPath: '../src/index.ts',
      },
    ],
  },
  bootstrap: './bootstrap.ts',
  configureApp: async (app) => {
    //TODO: Register global components, directives, plugins, etc. here.

    // Dynamically import packages which is in watchPackages.
    const icharts = await import('@bndynet/icharts')
    app.runWithContext(() => {
      const { theme } = useTheme()
      if (theme) {
        watch(theme, (next, prev) => { 
          console.log('theme:', prev, '→', next);
          icharts.switchTheme(next);
        }, { immediate: true })
      }
    })
  },
});
