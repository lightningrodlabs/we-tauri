import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import checker from "vite-plugin-checker";

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
  optimizeDeps: {
    exclude,
  },
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: "eslint --ext .ts,.html src",
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: "../../node_modules/@shoelace-style/shoelace/dist/assets",
          dest: "shoelace",
        },
        {
          src: "we_logo.png",
          dest: "dist/assets",
        },
        {
          src: "../applet-worker/dist/index.mjs",
          dest: "",
          rename: "applet-worker.js",
        },
        {
          src: "../applet-iframe/dist/index.mjs",
          dest: "",
          rename: "applet-iframe.js",
        },
      ],
    }),
  ],
});
