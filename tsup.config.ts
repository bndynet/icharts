import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
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
