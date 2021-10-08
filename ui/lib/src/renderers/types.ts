import { AppWebsocket, InstalledCell } from "@holochain/conductor-api";

export type Dictionary<T> = { [key: string]: T };

export interface Renderers {
  full: StandaloneRenderer;
  blocks: Array<BlockRenderer>;
}

export type StandaloneRenderer = (
  element: HTMLElement,
  customElementRegistry: CustomElementRegistry
) => void;

export interface BlockRenderer {
  name: string;
  render: StandaloneRenderer;
}

export type SetupRenderers = (
  appWebsocket: AppWebsocket,
  cellData: InstalledCell
) => Renderers;
