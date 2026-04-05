import { watch } from 'vue';

import { defineConfig, useTheme } from '@bndynet/vue-site';

export default defineConfig({
  title: '<i-chart />',
  nav: [
    { label: 'Home', icon: 'home', page: () => import('../README.md?raw') },
    {
      label: 'Charts',
      icon: 'chart-pie',
      page: () => import('./views/ChartsView.vue'),
    },
    {
      label: 'Dashboard',
      icon: 'layout-dashboard',
      page: () => import('./views/DashboardView.vue'),
    },
    {
      label: 'Tooltip',
      icon: 'message-square-text',
      page: () => import('./views/TooltipView.vue'),
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
