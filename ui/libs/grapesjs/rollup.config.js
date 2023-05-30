import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import postcssLit from "rollup-plugin-postcss-lit";

const pkg = require("./package.json");

export default {
  input: `src/index.ts`,
  output: [{ dir: "dist", format: "es", sourcemap: true }],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash-es')
  external: [...Object.keys(pkg.dependencies), /lit/],
  watch: {
    clearScreen: false,
  },
  plugins: [
    replace({
      "this.documentEl()": "this.container",
      delimiters: ["", ""],
    }),
    postcss({
      inject: false,
    }),
    postcssLit(),
    typescript(),
    resolve(),
    commonjs({}),
  ],
};
