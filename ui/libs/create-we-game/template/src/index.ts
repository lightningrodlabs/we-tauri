import { AdminWebsocket, AppWebsocket, InstalledCell } from "@holochain/client";
import { SetupRenderers, WeServices } from "@lightningrodlabs/we-game";

import { WhereGame } from "./where-game";
import { ScopedElementsHost } from "@open-wc/scoped-elements/types/src/types";
import { HolochainClient } from "@holochain-open-dev/cell-client";

const setupRenderers: SetupRenderers = (
  client: HolochainClient,
  adminWebsocket: AdminWebsocket,
  gameCells: InstalledCell[],
  weServices: WeServices
) => {
  return {
    full(element: HTMLElement, host: ScopedElementsHost) {
      host.defineScopedElement("where-game", WhereGame);
      element.innerHTML = `<where-game></where-game>`;
      let gameElement = element.querySelector("where-game") as any;

      gameElement.client = client;
      gameElement.profilesStore = weServices.profilesStore;
      gameElement.cellData = gameCells[0];
    },
    blocks: [],
  };
};

export default setupRenderers;
