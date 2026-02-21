import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  root: 'site',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // treat <i-chart> as a native custom element, not a Vue component
          isCustomElement: (tag) => tag === 'i-chart',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      // import directly from source so Vite HMR works without rebuilding
      '@bndynet/icharts': resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 3210,
    open: true,
  },
  build: {
    outDir: resolve(__dirname, 'site-dist'),
    emptyOutDir: true,
  },
})
