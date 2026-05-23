import { defineConfig } from 'tsup';

export default defineConfig([
  {
    // Two entries:
    //  - `src/index.ts`       → main entry (auto-registers <i-chart>)
    //  - `src/index-core.ts`  → SSR-safe subpath (`@bndynet/icharts/core`,
    //                            same public API minus the web component)
    entry: ['src/index.ts', 'src/index-core.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['echarts', 'lit', 'lit/decorators.js', '@bndynet/color-hub'],
    minify: false,
  },
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    globalName: 'iCharts',
    sourcemap: true,
    noExternal: [/.*/],
    minify: true,
    esbuildOptions(options) {
      options.legalComments = 'none';
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
]);
