# @lightningrodlabs/we-applet

This package contains the interfaces and contracts that a UI module needs to implement in order to become a We Applet.

You can use [@lightningrodlabs/create-we-applet](https://npmjs.com/package/@lightningrodlabs/create-we-applet) to easily scaffold the initial structure for a We Applet.

## Implementing a We Applet

You need to import the `SetupRenderers` type from `@lightningrodlabs/we-applet`, and have only a default export in your file:

> index.ts.

```ts
import { AdminWebsocket, AppWebsocket, InstalledCell } from "@holochain/client";
import { SetupRenderers, WeServices } from "@lightningrodlabs/we-applet";
import { HolochainClient } from "@holochain-open-dev/cell-client";

const setupRenderers: SetupRenderers = (
  client: HolochainClient,
  adminWebsocket: AdminWebsocket,
  appletCells: InstalledCell[], // This will contain all the cells that your applet has installed
  weServices: WeServices
) => {
  // Maybe instantiate a store?

  return {
    full(appletRootElement: HTMLElement, registry: CustomElementRegistry) {
      appletRootElement.innerHTML = "<span>Replace this with the appropriate HTML for your applet</span>";

      // You can also do `registry.define('my-element', MyElement);`
      // to register CustomElements that are going to be available in the scope for the element
    },
    blocks: [],
  };
};

export default setupRenderers;
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
  input: "out-tsc/index.js", // This needs to be pointing to the file that has the `SetupRenderers` default export
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
```

Now you have it! You can use the generated `.js` file as a We Applet UI file.
