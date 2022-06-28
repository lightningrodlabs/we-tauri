import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const indexTs = ({appletNameTitleCase, appletName}: {appletNameTitleCase: string; appletName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `import { AdminWebsocket, AppWebsocket, InstalledCell } from "@holochain/client";
import { SetupRenderers, WeServices } from "@lightningrodlabs/we-applet";
import { HolochainClient } from "@holochain-open-dev/cell-client";

import { ${appletNameTitleCase}Applet } from "./${appletName}-applet";

const setupRenderers: SetupRenderers = (
  client: HolochainClient,
  adminWebsocket: AdminWebsocket,
  appletCells: InstalledCell[],
  weServices: WeServices
) => {
  return {
    full(element: HTMLElement, registry: CustomElementRegistry) {
      registry.define("${appletName}-applet", ${appletNameTitleCase}Applet);
      element.innerHTML = \`<${appletName}-applet></${appletName}-applet>\`;
      let appletElement = element.querySelector("${appletName}-applet") as any;

      appletElement.client = client;
      appletElement.profilesStore = weServices.profilesStore;
      appletElement.cellData = appletCells[0];
    },
    blocks: [],
  };
};

export default setupRenderers;
`
});
