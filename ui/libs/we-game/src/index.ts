import { AppBundle, InstalledCell } from "@holochain/client";

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
      gameCells: InstalledCell[];
    }
  | {
      success: false;
      error: string;
    };

export interface WeGame {
  createGameRenderer?: (
    appBundle: AppBundle,
    weStore: WeStore,
    resolve: (gameCells: InstalledCell[]) => void,
    reject: (error: string) => void
  ) => Renderer;

  forkGameRenderer?: (
    appBundle: AppBundle,
    fromWe: WeStore,
    fromCells: InstalledCell[],
    toWe: WeStore,
    resolve: (gameCells: InstalledCell[]) => void,
    reject: (error: string) => void
  ) => Renderer;

  gameRenderers: (
    weStore: WeStore,
    gameCells: Array<InstalledCell>
  ) => GameRenderers;
}
