import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const indexTs = ({gameNameTitleCase, gameName}: {gameNameTitleCase: string; gameName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `import { AdminWebsocket, AppWebsocket, InstalledCell } from "@holochain/client";
import { SetupRenderers, WeServices } from "@lightningrodlabs/we-game";
import { HolochainClient } from "@holochain-open-dev/cell-client";

import { ${gameNameTitleCase}Game } from "./${gameName}-game";

const setupRenderers: SetupRenderers = (
  client: HolochainClient,
  adminWebsocket: AdminWebsocket,
  gameCells: InstalledCell[],
  weServices: WeServices
) => {
  return {
    full(element: HTMLElement, registry: CustomElementRegistry) {
      registry.define("${gameName}-game", ${gameNameTitleCase}Game);
      element.innerHTML = \`<${gameName}-game></${gameName}-game>\`;
      let gameElement = element.querySelector("${gameName}-game") as any;

      gameElement.client = client;
      gameElement.profilesStore = weServices.profilesStore;
      gameElement.cellData = gameCells[0];
    },
    blocks: [],
  };
};

export default setupRenderers;
`
});
    