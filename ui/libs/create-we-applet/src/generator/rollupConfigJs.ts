import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const rollupConfigJs = (): ScFile => ({
  type: ScNodeType.File,
  content: `import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";

import babel from "@rollup/plugin-babel";
import { importMetaAssets } from "@web/rollup-plugin-import-meta-assets";
import { terser } from "rollup-plugin-terser";

export default {
  input: "out-tsc/index.js",
  output: {
    format: "es",
    dir: 'dist',
    sourcemap: false
  },
  watch: {
    clearScreen: false,
  },

  plugins: [
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    replace({
      "process.env.NODE_ENV": '"production"',
    }),
    builtins(),
    commonjs({}),
    globals(),
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
            targets: [
              "last 3 Chrome major versions",
              "last 3 Firefox major versions",
              "last 3 Edge major versions",
              "last 3 Safari major versions",
            ],
            modules: false,
            bugfixes: true,
          },
        ],
      ],
      plugins: [
        [
          require.resolve("babel-plugin-template-html-minifier"),
          {
            modules: {
              lit: ["html", { name: "css", encapsulation: "style" }],
            },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ],
      ],
    }),
  ],
};
`
});
    