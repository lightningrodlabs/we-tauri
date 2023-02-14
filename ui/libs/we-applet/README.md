# @neighbourhoods/nh-we-applet

This package contains the interfaces and contracts that a UI module needs to implement in order to become a We Applet.

You can use [@lightningrodlabs/create-we-applet](https://npmjs.com/package/@lightningrodlabs/create-we-applet) to easily scaffold the initial structure for a We Applet.

Made for holochain `v0.1.0`.

## Implementing the UI for a we applet

You need to import the `WeApplet` type from `@neighbourhoods/nh-we-applet`, and have only a default export in your file:

> index.ts.

```ts
import { AdminWebsocket, AppWebsocket, InstalledCell } from "@holochain/client";
import { WeApplet, WeServices } from "@neighbourhoods/nh-we-applet";
import { HolochainClient } from "@holochain-open-dev/cell-client";

const applet: WeApplet = {
  async appletRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weServices: WeServices,
    appletInfo: InstalledAppletInfo[] // Contains info about which app instance(s) should be rendered. Potentially applets across different groups 
  ): Promise<AppletRenderers> {
    // Maybe instantiate a store?

    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        // Replace this with the UI for your applet
        element.innerHTML = `<my-applet></my-applet>`;
        let appletElement = element.querySelector("my-applet") as any;

        appletElement.appWebsocket = appWebsocket;
        appletElement.profilesStore = weServices.profilesStore;
        appletElement.cellData = appletInfo.cell_data[0];
        appletElement.sensemakerStore = weServices.sensemakerStore;
      },
      blocks: [],
    };
  },
};

export default applet;

```

## Building

Use [rollup](https://rollupjs.org/guide/en/) to build a fully bundled javascript file that doesn't have any external imports.

This is an example configuration for it:

> rollup.config.js

```js
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";

import babel from "@rollup/plugin-babel";
import { importMetaAssets } from "@web/rollup-plugin-import-meta-assets";
import { terser } from "rollup-plugin-terser";

export default {
  input: "out-tsc/index.js", // This needs to be pointing to the file that has the `WeApplet` default export
  output: {
    format: "es",
    dir: 'dist',
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
    }),
  ],
};
```

Now you have it! You can use the generated `.js` file as a We Applet UI file.
