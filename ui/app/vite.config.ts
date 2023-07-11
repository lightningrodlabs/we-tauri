import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import checker from "vite-plugin-checker";

export default defineConfig({
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
