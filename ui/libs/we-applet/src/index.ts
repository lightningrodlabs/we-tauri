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

export interface OpenViews {
  openGroupBlock(block: string, context: any): void;
  openCrossGroupBlock(block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
}

export type BlockView = (rootElement: HTMLElement, context: any) => void;
export type EntryTypeView = (
  rootElement: HTMLElement,
  hash: EntryHash | ActionHash,
  context: any
) => void;

export interface CrossGroupViews {
  blocks: { main: BlockView } & Record<string, BlockView>;
}

export interface EntryTypeDescriptors {
  name: (hash: EntryHash | ActionHash) => Promise<string>;
  view: EntryTypeView;
}

export interface GroupViews {
  blocks: { main: BlockView } & Record<string, BlockView>; // all events -> schedule
  entries: Record<string, Record<string, Record<string, EntryTypeDescriptors>>>; // Segmented by RoleName, integrity ZomeName and EntryType
}

export interface GroupServices {
  profilesStore: ProfilesStore;
}

export type Hrl = [DnaHash, ActionHash | EntryHash];

// Contextual reference to a Hrl
// Useful use case: image we want to point to a specific section of a document
// The document action hash would be the Hrl, and the context could be { section: "Second Paragraph" }
export interface HrlWithContext {
  hrl: Hrl;
  context: any;
}

export interface AttachableType {
  name: string;
  create: (
    appletClient: AppAgentClient,
    attachToHrl: Hrl
  ) => Promise<HrlWithContext>;
}

export interface GroupWithApplets {
  groupInfo: GroupInfo;
  groupServices: GroupServices;
  appletsClients: AppAgentClient[]; // These will be the same kind of applet
}

export interface WeServices {
  openViews: OpenViews;
}

export interface WeApplet {
  groupViews: (
    appletClient: AppAgentClient,
    groupInfo: GroupInfo,
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
