import { AdminWebsocket, AppWebsocket, InstalledCell } from "@holochain/client";
import { SetupRenderers, WeServices } from "@lightningrodlabs/we-applet";
import { HolochainClient } from "@holochain-open-dev/cell-client";

import { WhereApplet } from "./where-applet";

const setupRenderers: SetupRenderers = (
  client: HolochainClient,
  adminWebsocket: AdminWebsocket,
  appletCells: InstalledCell[],
  weServices: WeServices
) => {
  return {
    full(element: HTMLElement, registry: CustomElementRegistry) {
      registry.define("where-applet", WhereApplet);
      element.innerHTML = `<where-applet></where-applet>`;
      let appletElement = element.querySelector("where-applet") as any;

      appletElement.client = client;
      appletElement.profilesStore = weServices.profilesStore;
      appletElement.cellData = appletCells[0];
    },
    blocks: [],
  };
};

export default setupRenderers;
