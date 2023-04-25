import { AppAgentClient } from "@holochain/client";
import { Hrl, HrlWithContext } from "@lightningrodlabs/hrl";
import { AttachmentType, EntryInfo, GroupServices, WeServices } from "./types";

export * from "./types.js";
export * from "./attachments/attachments-client.js";
export * from "./attachments/attachments-store.js";

export type MainView = (rootElement: HTMLElement) => void;
export type BlockView = (rootElement: HTMLElement, context: any) => void;
export type EntryTypeView = (
  rootElement: HTMLElement,
  hrl: Hrl,
  context: any
) => void;

export interface CrossGroupViews {
  main: MainView;
  blocks: Record<string, BlockView>;
}

export interface ReferenceableEntryType {
  info: (hrl: Hrl) => Promise<EntryInfo | undefined>;
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

  attachmentTypes: (
    appletClient: AppAgentClient
  ) => Record<string, AttachmentType>;
  search: (
    appletClient: AppAgentClient,
    searchFilter: string
  ) => Promise<Array<HrlWithContext>>;

  crossGroupViews: (
    applets: GroupWithApplets[],
    weServices: WeServices
  ) => CrossGroupViews;
}
