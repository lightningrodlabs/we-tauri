import nodeResolve from "@rollup/plugin-node-resolve";
import css from "rollup-plugin-import-css";
import typescript from '@rollup/plugin-typescript';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "index.ts",
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
    css(),
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