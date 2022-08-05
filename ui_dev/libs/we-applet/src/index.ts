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

export interface AppletBlock {
  name: string;
  render: Renderer;
}

export interface AppletRenderers {
  full: Renderer;
  blocks: Array<AppletBlock>;
}

export interface WeServices {
  profilesStore?: ProfilesStore;  // in case of cross-we renderers the profilesStore may not be required
}

export interface WeApplet {
  appletRenderers: (
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weStore: WeServices,
    appletInfo: InstalledAppInfo | InstalledAppletInfo[], // type depending on whether it is a cross-we renderer or not
  ) => Promise<AppletRenderers>;
}


export interface WeInfo {
  logo_src: string;
  name: string;
}

export interface InstalledAppletInfo {
  weInfo: WeInfo,
  installedAppInfo: InstalledAppInfo,
}