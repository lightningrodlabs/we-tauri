import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AdminWebsocket,
  AppWebsocket,
  InstalledAppInfo,
} from "@holochain/client";

export type Renderer = (
  rootElement: HTMLElement,
  registry: CustomElementRegistry
) => void;

export interface GameBlock {
  name: string;
  render: Renderer;
}

export interface GameRenderers {
  full: Renderer;
  blocks: Array<GameBlock>;
}

export interface WeServices {
  profilesStore: ProfilesStore;
}

export interface WeGame {
  gameRenderers: (
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weStore: WeServices,
    gameInfo: InstalledAppInfo
  ) => GameRenderers;
}
