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
  profilesStore: ProfilesStore;
}

export interface WeApplet {
  appletRenderers: (
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weStore: WeServices,
    appletInfo: InstalledAppInfo
  ) => Promise<AppletRenderers>;
}
