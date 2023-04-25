import { ProfilesClient } from "@holochain-open-dev/profiles";
import { AppAgentClient, ActionHash, EntryHash } from "@holochain/client";
import { Hrl, HrlWithContext } from "@lightningrodlabs/hrl";
import { EntryInfo, WeServices } from "./types";

export * from "./types.js";

export type MainView = (rootElement: HTMLElement) => void;
export type BlockView = (rootElement: HTMLElement, context: any) => void;
export type EntryTypeView = (
  rootElement: HTMLElement,
  hash: EntryHash | ActionHash,
  context: any
) => void;

export interface CrossGroupViews {
  main: MainView;
  blocks: Record<string, BlockView>;
}

export interface ReferenceableEntryType {
  info: (hash: EntryHash | ActionHash) => Promise<EntryInfo | undefined>;
  view: EntryTypeView;
}

export interface GroupViews {
  main: MainView;
  blocks: Record<string, BlockView>; // all events -> schedule
  entries: Record<
    string,
    Record<string, Record<string, ReferenceableEntryType>>
  >; // Segmented by RoleName, integrity ZomeName and EntryType
}

export interface GroupServices {
  profilesClient: ProfilesClient;
}

export interface AttachableType {
  name: string;
  create: (
    appletClient: AppAgentClient,
    attachToHrl: Hrl
  ) => Promise<HrlWithContext>;
}

export interface GroupWithApplets {
  groupServices: GroupServices;
  appletsClients: AppAgentClient[]; // These will be the same kind of applet
}

export interface WeApplet {
  groupViews: (
    appletClient: AppAgentClient,
    groupServices: GroupServices,
    weServices: WeServices
  ) => GroupViews;

  attachableTypes: Array<AttachableType>;
  search: (
    appletClient: AppAgentClient,
    searchFilter: string
  ) => Promise<Array<HrlWithContext>>;

  crossGroupViews: (
    applets: GroupWithApplets[],
    weServices: WeServices
  ) => CrossGroupViews;
}
