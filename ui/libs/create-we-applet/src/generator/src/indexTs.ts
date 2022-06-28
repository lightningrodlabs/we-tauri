import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const indexTs = ({appletNameTitleCase, appletName}: {appletNameTitleCase: string; appletName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `import {
  AdminWebsocket,
  AppWebsocket,
  InstalledAppInfo,
  InstalledCell,
} from "@holochain/client";
import {
  WeApplet,
  AppletRenderers,
  WeServices,
} from "@lightningrodlabs/we-applet";
import { HolochainClient } from "@holochain-open-dev/cell-client";

import { ${appletNameTitleCase}Applet } from "./${appletName}-applet";


const ${appletName}Applet: WeApplet = {
  async appletRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weServices: WeServices,
    appletInfo: InstalledAppInfo
  ): Promise<AppletRenderers> {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        registry.define("${appletName}-applet", ${appletNameTitleCase}Applet);
        element.innerHTML = \`<${appletName}-applet></${appletName}-applet>\`;
        let appletElement = element.querySelector("${appletName}-applet") as any;

        appletElement.client = new HolochainClient(appWebsocket);
        appletElement.${appletName}Store = weServices.${appletName}Store;
        appletElement.cellData = appletInfo.cell_data[0];
      },
      blocks: [],
    };
  },
};

export default ${appletName}Applet;
`
});
    