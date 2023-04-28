import { ProfilesClient } from "@holochain-open-dev/profiles";
import {
  AppAgentClient,
  ActionHash,
  EntryHash,
  DnaHash,
} from "@holochain/client";

export type Hrl = [DnaHash, ActionHash | EntryHash];

// Contextual reference to a Hrl
// Useful use case: image we want to point to a specific section of a document
// The document action hash would be the Hrl, and the context could be { section: "Second Paragraph" }
export interface HrlWithContext {
  hrl: Hrl;
  context: any;
}

export interface EntryInfo {
  name: string;
  icon_src: string;
}

export interface GroupProfile {
  name: string;
  logo_src: string;
}

export interface GroupServices {
  groupProfile: GroupProfile;
  profilesClient: ProfilesClient;
}

export interface AttachmentType {
  label: string;
  icon_src: string;
  create: (attachToHrl: Hrl) => Promise<HrlWithContext>;
}

export interface OpenViews {
  openGroupBlock(
    groupId: DnaHash,
    appletInstanceId: EntryHash,
    block: string,
    context: any
  ): void;
  openCrossGroupBlock(appletId: EntryHash, block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
}

export interface AppletAttachmentTypes {
  appletInstanceName: string;
  attachmentTypes: Record<string, AttachmentType>;
}

export interface GroupAttachmentTypes {
  groupProfile: GroupProfile;
  attachmentTypesByApplet: ReadonlyMap<EntryHash, AppletAttachmentTypes>; // segmented by appletInstanceId
}

export interface EntryLocationAndInfo {
  groupId: DnaHash;
  groupProfile: GroupProfile;
  appletInstanceId: EntryHash;
  appletInstanceName: string;
  entryInfo: EntryInfo;
}

export interface WeServices {
  openViews: OpenViews;
  attachmentTypesByGroup: ReadonlyMap<DnaHash, GroupAttachmentTypes>; // Segmented by groupId

  getEntryInfo(hrl: Hrl): Promise<EntryLocationAndInfo | undefined>;
}

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
  applets: ReadonlyMap<EntryHash, AppAgentClient>; // segmented by appletInstanceId
}

export interface WeApplet {
  groupViews: (
    client: AppAgentClient,
    groupId: DnaHash,
    appletInstanceId: EntryHash,
    groupServices: GroupServices,
    weServices: WeServices
  ) => GroupViews;

  crossGroupViews: (
    appletsByGroup: ReadonlyMap<DnaHash, GroupWithApplets>, // Segmented by groupId
    weServices: WeServices
  ) => CrossGroupViews;

  attachmentTypes: (
    appletClient: AppAgentClient
  ) => Promise<Record<string, AttachmentType>>;

  search: (
    appletClient: AppAgentClient,
    searchFilter: string
  ) => Promise<Array<HrlWithContext>>;
}
