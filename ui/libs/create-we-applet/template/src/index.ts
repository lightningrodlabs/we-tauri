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

import { ProfilesApplet } from "./profiles-applet";


const profilesApplet: WeApplet = {
  async appletRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weServices: WeServices,
    appletInfo: InstalledAppInfo
  ): Promise<AppletRenderers> {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        registry.define("profiles-applet", ProfilesApplet);
        element.innerHTML = `<profiles-applet></profiles-applet>`;
        let appletElement = element.querySelector("profiles-applet") as any;

        appletElement.client = new HolochainClient(appWebsocket);
        appletElement.profilesStore = weServices.profilesStore;
        appletElement.cellData = appletInfo.cell_data[0];
      },
      blocks: [],
    };
  },
};

export default profilesApplet;
