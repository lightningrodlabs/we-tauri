import { AdminWebsocket, AppWebsocket, InstalledCell } from "@holochain/client";
import { SetupRenderers, WeServices } from "@lightningrodlabs/we-game";
import { HolochainClient } from "@holochain-open-dev/cell-client";

import { WhereGame } from "./where-game";

const setupRenderers: SetupRenderers = (
  client: HolochainClient,
  adminWebsocket: AdminWebsocket,
  gameCells: InstalledCell[],
  weServices: WeServices
) => {
  return {
    full(element: HTMLElement, registry: CustomElementRegistry) {
      registry.define("where-game", WhereGame);
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
