import {
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

import { WhereApplet } from "./where-applet";


const whereApplet: WeApplet = {
  gameRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weServices: WeServices,
    appletInfo: InstalledAppInfo
  ): AppletRenderers {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        registry.define("where-applet", WhereApplet);
        element.innerHTML = `<where-applet></where-applet>`;
        let appletElement = element.querySelector("where-applet") as any;

        appletElement.client = new HolochainClient(appWebsocket);
        appletElement.profilesStore = weServices.profilesStore;
        appletElement.cellData = appletInfo.cell_data[0];
      },
      blocks: [],
    };
  },
};

export default whereApplet;
