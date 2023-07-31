import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AdminWebsocket,
  AppWebsocket,
  AppInfo,
  AppAgentClient,
} from "@holochain/client";
import { SensemakerStore } from "@neighbourhoods/client";

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
  sensemakerStore?: SensemakerStore;
}

export interface NhLauncherApplet {
  appletRenderers: (
    appAgentWebsocket: AppAgentClient,
    weStore: WeServices,
    appletInfo: AppletInfo[],
  ) => Promise<AppletRenderers>;
}


export interface WeInfo {
  logoSrc: string;
  name: string;
}
export interface AppletInfo {
  weInfo: WeInfo,
  appInfo: AppInfo,
}
