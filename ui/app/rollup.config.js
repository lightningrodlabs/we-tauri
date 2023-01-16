import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

import babel from "@rollup/plugin-babel";
import html from "@web/rollup-plugin-html";
import { importMetaAssets } from "@web/rollup-plugin-import-meta-assets";
import { terser } from "rollup-plugin-terser";
import typescript from '@rollup/plugin-typescript';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "index.html",
  output: {
    entryFileNames: "[hash].js",
    chunkFileNames: "[hash].js",
    assetFileNames: "[hash][extname]",
    format: "es",
    dir: "dist",
  },
  watch: {
    clearScreen: false,
  },

  plugins: [
    /** Enable using HTML as rollup entrypoint */
    html({
      minify: true,
    }),
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    replace({
      "process.env.NODE_ENV": '"production"',
      "process.env.ENV": `"${process.env.ENV}"`,
      "process.env.HC_PORT": `undefined`,
      "process.env.ADMIN_PORT": `undefined`,
    }),
    commonjs({}),
    typescript({
      sourceMap: !production,
      inlineSources: !production,
    }),
    /** Minify JS */
    terser(),
    /** Bundle assets references via import.meta.url */
    importMetaAssets(),
    /** Compile JS to a lower language target */
    babel({
      exclude: /node_modules/,

      babelHelpers: "bundled",
      presets: [
        [
          require.resolve("@babel/preset-env"),
          {
            targets: ['defaults', 'not IE 11', 'safari >13', 'not op_mini all', 'last 3 Chrome versions'],
            modules: false,
            bugfixes: true,
          },
        ],
      ],
      plugins: [],
    }),
  ],
};
