import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default (UMDName, entryPath) => defineConfig({
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
  },
})
