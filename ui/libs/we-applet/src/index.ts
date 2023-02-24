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

export type EntryTypeView = (
  hash: EntryHash | ActionHash,
  context: any
) => Promise<{
  name: string;
  view: View;
}>;

export interface CrossGroupPerspectiveViews {
  main: View;
  blocks: Record<string, View>;
}

export interface GroupPerspectiveViews {
  main: View;
  blocks: Record<string, View>; // all events -> schedule
  entries: Record<string, Record<string, EntryTypeView>>; // Segmented by RoleName and entry type id
}

export interface GroupServices {
  profilesStore: ProfilesStore;
}

export type Hrl = [DnaHash, ActionHash | EntryHash];

export interface AttachableType {
  name: string;
  create: (attachToHash: Hrl) => Promise<{ attachableHrl: Hrl; context: any }>;
}

// Perspective of an applet instance in a group
export interface GroupPerspective {
  views: GroupPerspectiveViews;
  search: (searchFilter: string) => Promise<Array<Hrl>>;
  attachablesTypes: Array<AttachableType>;
}

export interface CrossGroupPerspective {
  views: CrossGroupPerspectiveViews;
}

export interface GroupWithApplets {
  groupInfo: GroupInfo;
  groupServices: GroupServices;
  appletsClients: AppAgentClient[]; // These will be the same kind of applet
}

export interface WeApplet {
  groupPerspective: (
    appletInstanceClient: AppAgentClient,
    groupInfo: GroupInfo,
    groupServices: GroupServices
  ) => GroupPerspective;
  crossGroupPerspective: (applets: GroupWithApplets[]) => CrossGroupPerspective;
}
