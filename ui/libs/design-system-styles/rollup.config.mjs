import nodeResolve from "@rollup/plugin-node-resolve";
import css from "rollup-plugin-import-css";
import postcss from "rollup-plugin-postcss";
import typescript from '@rollup/plugin-typescript';

const production = !process.env.ROLLUP_WATCH;

export default {
  inlineSources: true,
  input: "src/index.ts",
  output: {
    // entryFileNames: "[hash].js",
    // chunkFileNames: "[hash].js",
    // assetFileNames: "[hash][extname]",
    format: "es",
    dir: "dist",
    sourcemap: !production,
  },
  watch: {
    clearScreen: false,
  },

  plugins: [
    css({include: ['build/dark/variables/css/variables.css'], modules: true}),
    postcss(),
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({
      sourceMap: !production,
      inlineSources: !production,
    }),
  ],
};