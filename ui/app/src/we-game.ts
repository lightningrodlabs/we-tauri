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

// In the context of an already installed we
//  - Install game
//  - Fork game from a we to another

export type InstallGameResult =
  | {
      success: true;
      gameInfo: InstalledAppInfo;
    }
  | {
      success: false;
      error: string;
    };

export interface WeGame {
  createGameRenderer?: (
    appBundle: AppBundle,
    weStore: WeStore,
    resolve: (gameInfo: InstalledAppInfo) => void,
    reject: (error: string) => void
  ) => Renderer;

  forkGameRenderer?: (
    appBundle: AppBundle,
    fromWe: WeStore,
    fromCells: InstalledCell[],
    toWe: WeStore,
    resolve: (gameInfo: InstalledAppInfo) => void,
    reject: (error: string) => void
  ) => Renderer;

  gameRenderers: (
    weStore: WeStore,
    gameInfo: InstalledAppInfo
  ) => GameRenderers;
}
