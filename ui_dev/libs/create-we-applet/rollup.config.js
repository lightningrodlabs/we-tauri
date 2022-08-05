import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import shebang from 'rollup-plugin-add-shebang';

export default {
  input: "src/index.ts",
  output: {
    format: "es",
    dir: "dist",
    sourcemap: false,
  },
  external: [],
  plugins: [
    typescript({}),

    nodeResolve({}),
    commonjs({}),

    shebang({
      // A single or an array of filename patterns. Defaults to ['**/cli.js', '**/bin.js'].
      include: 'dist/index.js'
      // you could also 'exclude' here
      // or specify a special shebang (or a function returning one) using the 'shebang' option
    }),
  ],
};
