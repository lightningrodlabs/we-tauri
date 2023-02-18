import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AppAgentClient,
  ActionHash,
  EntryHash,
  DnaHash,
} from "@holochain/client";

export interface GroupInfo {
  logo_src: string;
  name: string;
}

export type View = (
  rootElement: HTMLElement,
  registry: CustomElementRegistry
) => void;

export type EntryTypeView = (hash: EntryHash | ActionHash) => Promise<{
  name: string;
  summary: View;
  detail: View;
}>;

export type AppletViews = {
  main: View;
  blocks: Record<string, View>;
  entries: Record<string, Record<string, EntryTypeView>>; // Segmented by RoleName and entry type id
};

export interface GroupServices {
  profilesStore: ProfilesStore;
}

export type Hrl = [DnaHash, ActionHash | EntryHash];

export interface GroupCentricApplet {
  views: AppletViews;
  search: (searchFilter: string) => Promise<Array<Hrl>>;
}

export interface AgentCentricApplet {
  view: View;
}

export interface GroupApplets {
  groupInfo: GroupInfo;
  groupServices: GroupServices;
  appletAgentClient: AppAgentClient[];
}

export interface WeApplet {
  groupCentric: (
    appletAgentClient: AppAgentClient,
    groupInfo: GroupInfo,
    groupServices: GroupServices
  ) => Promise<GroupCentricApplet>;
  agentCentric: (applets: GroupApplets[]) => Promise<AgentCentricApplet>;
}
