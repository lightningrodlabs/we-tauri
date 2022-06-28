import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const webDevServerConfigMjs = (): ScFile => ({
  type: ScNodeType.File,
  content: `// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import { fromRollup } from "@web/dev-server-rollup";
import rollupReplace from "@rollup/plugin-replace";
import rollupCommonjs from "@rollup/plugin-commonjs";

const replace = fromRollup(rollupReplace);
const commonjs = fromRollup(rollupCommonjs);

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes("--hmr");

if (!process.env.HC_PORT)
  throw new Error(\`There is no HC_PORT environment variable defined! 
Define it in your package.json when calling this subprocess.\`);

if (!process.env.ADMIN_PORT)
  throw new Error(\`There is no ADMIN_PORT environment variable defined! 
Define it in your package.json when calling this subprocess.\`);

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: true,
  watch: !hmr,
  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ["browser", "development"],
    browser: true,
    preferBuiltins: false,
  },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  appIndex: "./demo/index.html",
  clearTerminalOnReload: false,

  plugins: [
    replace({
      "process.env.HC_PORT": JSON.stringify(process.env.HC_PORT),
      "process.env.ADMIN_PORT": JSON.stringify(process.env.ADMIN_PORT) || undefined,
      delimiters: ["", ""],
    }),

    commonjs(),
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
`
});
    