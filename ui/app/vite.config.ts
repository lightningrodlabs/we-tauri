/// <reference types="vitest" />

import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    /* for example, use global to avoid globals imports (describe, test, expect): */
    globals: true,
    deps: {
        inline: [/@neighbourhoods/]
      }
  },
})