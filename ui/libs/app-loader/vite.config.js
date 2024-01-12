import { defineConfig } from "vite";
import { resolve } from 'path'

const configure = (UMDName, entryPath) => defineConfig({
  test: {
    /* for example, use global to avoid globals imports (describe, test, expect): */
    globals: true,
    deps: {
      inline: [
        /@neighbourhoods/,
        /@scoped-elements\/shoelace/
      ],
    },
    environment: 'jsdom',
    include: ['./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
  build: {
    lib: {
      // the proper extensions will be added
      fileName: 'index',
      // Could also be a dictionary or array of multiple entry points
      entry: entryPath,
      name: UMDName,
    },
    rollupOptions: {
      // external: /^lit/
    },
    sourcemap: true,
  }
})

export default configure(
  'NeighbourhoodsAppLoader',
  resolve(__dirname, 'src/index.ts'),
)
