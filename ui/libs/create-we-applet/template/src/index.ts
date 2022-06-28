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

import { PeerStatusApplet } from "./peer_status-applet";

const peer_statusApplet: WeApplet = {
  async appletRenderers(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weServices: WeServices,
    appletAppInfo: InstalledAppInfo
  ): Promise<AppletRenderers> {
    return {
      full(element: HTMLElement, registry: CustomElementRegistry) {
        registry.define("peer_status-applet", PeerStatusApplet);
        element.innerHTML = `<peer_status-applet></peer_status-applet>`;
        let appletElement = element.querySelector("peer_status-applet") as any;

        appletElement.appWebsocket =  appWebsocket;
        appletElement.profilesStore = weServices.profilesStore;
        appletElement.appletAppInfo = appletAppInfo;
      },
      blocks: [],
    };
  },
};

export default peer_statusApplet;
