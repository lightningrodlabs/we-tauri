import { HolochainClient } from "@holochain-open-dev/cell-client";
import { ProfilesStore } from "@holochain-open-dev/profiles";
import { AdminWebsocket, InstalledCell } from "@holochain/client";
import { ScopedElementsHost } from "@open-wc/scoped-elements/types/src/types";

export interface GameRenderers {
  full: Renderer;
  blocks: Array<BlockRenderer>;
}

export type Renderer = (
  gameRootElement: HTMLElement,
  host: ScopedElementsHost
) => void;

export interface BlockRenderer {
  name: string;
  render: Renderer;
}

export interface WeServices {
  profilesStore: ProfilesStore;
}

export type SetupRenderers = (
  client: HolochainClient,
  adminWebsocket: AdminWebsocket,
  gameCells: InstalledCell[],
  weServices: WeServices
) => GameRenderers;
