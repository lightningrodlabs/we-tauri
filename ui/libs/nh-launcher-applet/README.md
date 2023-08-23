# @neighbourhoods/nh-launcher-applet

This package contains the interfaces and contracts that a UI module needs to implement in order to become a NH Launcher Applet.

Made for holochain `v0.1.0`.

## Implementing the UI for a we applet

You need to import the `NhLauncherApplet` type from `@neighbourhoods/nh-launcher-applet`, and have only a default export in your file:

> index.ts.

```ts
import { AppAgentClient, InstalledCell } from "@holochain/client";
import { NhLauncherApplet, NeighbourhoodServices, AppletInfo, AppletRenderers } from "@neighbourhoods/nh-launcher-applet";
import { HolochainClient } from "@holochain-open-dev/cell-client";

const applet: NhLauncherApplet = {
  async appletRenderers(
    appAgentWebsocket: AppAgentClient,
    neighbourhoodServices: NeighbourhoodServices,
    appletInfo: AppletInfo[] // Contains info about which app instance(s) should be rendered. Potentially applets across different groups 
  ): Promise<AppletRenderers> {
    // Maybe instantiate a store?

    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        // Replace this with the UI for your applet
        element.innerHTML = `<my-applet></my-applet>`;
        let appletElement = element.querySelector("my-applet") as any;

        appletElement.appAgentWebsocket = appAgentWebsocket;
        appletElement.profilesStore = neighbourhoodServices.profilesStore;
        appletElement.appletInfo = appletInfo;
        appletElement.sensemakerStore = neighbourhoodServices.sensemakerStore;
      },
      appletConfig,
      widgetPairs: [{
        assess: assessDimensionWidget,
        display: displayDimensionWidget,
        compatibleDimensions: ['importance', 'total-importance']
      }]
    };
  },
};

export default applet;

```

## Building

Use [vite](https://vitejs.dev/guide/) to build a fully bundled javascript file that doesn't have any external imports.

This is an example configuration for it:

> vite.config.js

```js
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return isProduction ? {
    plugins: [
      {
        name: 'copy-assets',
        apply: 'build',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'icon.png',
            source: require('fs').readFileSync('icon.png'),
          });
        },
      },
    ],
    build: {
      lib: {
        entry: 'src/applet-index.ts',
        name: 'applet',
        fileName: (_format) => `index.js`,
        formats: ['es'],
      }
    },
  } : {}
})
```

Now you have it! You can use the generated `.js` file as a We Applet UI file.
