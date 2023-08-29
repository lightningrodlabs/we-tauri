import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      // the proper extensions will be added
      fileName: 'index',
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'NeighbourhoodsDesignSystemComponents',
    },
    rollupOptions: {
      // external: /^lit/
    },
  },
})
