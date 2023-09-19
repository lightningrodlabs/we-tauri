import { defineConfig, loadEnv  } from "vite";

const components = [
  "dialog",
  "dropdown",
  "menu",
  "menu-item",
  "checkbox",
  "divider",
  "menu-label",
  "option",
  "select",
  "tooltip",
  "card",
  "icon-button",
  "button",
  "icon",
  "alert",
  "input",
  "spinner",
  "avatar",
  "skeleton",
];
const exclude = components.map(
  (c) => `@shoelace-style/shoelace/dist/components/${c}/${c}.js`
);

export default defineConfig({
  test: {
    /* for example, use global to avoid globals imports (describe, test, expect): */
    globals: true,
    deps: {
        inline: [/@neighbourhoods/, /@scoped-elements\/shoelace/, /@holochain-open-dev\/elements/], 
      },
    environment: 'jsdom',
    include: ['./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
  plugins: [
    // checker({
    //   typescript: true,
    //   eslint: {
    //     lintCommand: "eslint --ext .ts,.html src",
    //   },
    // }),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: "node_modules/@shoelace-style/shoelace/dist/assets",
    //       dest: "shoelace",
    //     }
    //   ],
    // }),
  ],
  build: { 
    sourcemap: true,
  }
});
