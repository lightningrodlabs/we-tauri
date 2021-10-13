import { AppWebsocket, InstalledCell } from "@holochain/conductor-api";
import { ScopedElementsHost } from "@open-wc/scoped-elements/types/src/types";

export type Dictionary<T> = { [key: string]: T };

export interface Renderers {
  full: StandaloneRenderer;
  blocks: Array<BlockRenderer>;
}

export type StandaloneRenderer = (
  element: HTMLElement,
  host: ScopedElementsHost
) => void;

export interface BlockRenderer {
  name: string;
  render: StandaloneRenderer;
}

export type SetupRenderers = (
  appWebsocket: AppWebsocket,
  cellData: InstalledCell
) => Renderers;
