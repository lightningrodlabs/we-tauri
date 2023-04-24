import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
    exclude: [
      ...exclude,
      "@holochain-open-dev/elements/dist/elements/display-error.js",
    ],
  },
  plugins: [
    // checker({
    //   typescript: true,
    //   eslint: {
    //     lintCommand: "eslint --ext .ts,.html src",
    //   },
    // }),
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
          src: "../applet-sandbox/dist/index.mjs",
          dest: "",
          rename: "applet-sandbox.js",
        },
      ],
    }),
  ],
});
