import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AppWebsocket,
  AppInfo,
  AppAgentClient,
  ActionHash,
  EntryHash,
} from "@holochain/client";

export type Renderer = (
  rootElement: HTMLElement,
  registry: CustomElementRegistry
) => void;

export type EntryRenderer = (hash: EntryHash | ActionHash) => Renderer;

export interface AppletRenderers {
  main: Renderer;
  blocks: Record<string, Renderer>;
  entries: Record<string, Record<string, EntryRenderer>>; // Segmented by RoleName and entry type id
}

export interface GroupServices {
  profilesStore: ProfilesStore; // in case of cross-we renderers the profilesStore may not be required
}

export interface GroupAppletsInfo {
  appletsInfo: AppInfo[];
  groupInfo: GroupInfo;
  groupServices: GroupServices;
}

export interface WeApplet {
  agentCentric: (
    appWebsocket: AppWebsocket,
    appletInstances: GroupAppletsInfo[]
  ) => Promise<Renderer>;
  groupCentric: (
    appAgentClient: AppAgentClient,
    groupInfo: GroupInfo,
    groupServices: GroupServices
  ) => Promise<AppletRenderers>;
}

export interface GroupInfo {
  logo_src: string;
  name: string;
}
