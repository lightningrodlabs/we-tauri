import { fromRollup } from "@web/dev-server-rollup";
import rollupCommonjs from "@rollup/plugin-commonjs";
import rollupReplace from "@rollup/plugin-replace";
import rollupBuiltins from "rollup-plugin-node-builtins";
// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes("--hmr");

const HC_PORT = process.env.HC_PORT || 8888;

const replace = fromRollup(rollupReplace);
const commonjs = fromRollup(rollupCommonjs);
const builtins = fromRollup(rollupBuiltins);

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  rootDir: "../../../",
  open: true,
  watch: !hmr,
  /** Resolve bare module imports */
  nodeResolve: {
    browser: true,
    preferBuiltins: false,
    exportConditions: ["browser", "development"],
  },

  clearTerminalOnReload: false,

  middleware: [
    async (ctx, next) => {
      if (ctx.request.url.includes(".launcher-env.json", undefined)) {
        ctx.body = {
          APP_INTERFACE_PORT: process.env.HC_PORT,
          ADMIN_INTERFACE_PORT: process.env.ADMIN_PORT,
          INSTALLED_APP_ID: "we",
        };
      }

      return next();
    },
  ],

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  appIndex: "index.html",

  plugins: [
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
    replace({
      "process.env.HC_PORT": JSON.stringify(HC_PORT),
      "process.env.ADMIN_PORT": JSON.stringify(process.env.ADMIN_PORT),
    }),
    builtins(),
    commonjs(),
  ],

  // See documentation for all available options
});
