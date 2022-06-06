import { AppBundle, InstalledAppInfo, InstalledCell } from "@holochain/client";
import { WeStore } from "./interior/we-store";

export interface GameRenderers {
  full: Renderer;
  blocks: Array<GameBlock>;
}

export type Renderer = (
  rootElement: HTMLElement,
  registry: CustomElementRegistry
) => void;

export interface GameBlock {
  name: string;
  render: Renderer;
}

export interface WeGame {

  gameRenderers: (
    weStore: WeStore,
    gameInfo: InstalledAppInfo
  ) => GameRenderers;
}
