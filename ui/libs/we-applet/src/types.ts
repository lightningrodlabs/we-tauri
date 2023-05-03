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

export interface AttachmentType {
  label: string;
  icon_src: string;
  create: (attachToHrl: Hrl) => Promise<HrlWithContext>;
}

export interface OpenViews {
  openAppletBlock(appletId: EntryHash, block: string, context: any): void;
  openCrossAppletBlock(
    appletBundleId: EntryHash,
    block: string,
    context: any
  ): void;
  openHrl(hrl: Hrl, context: any): void;
}

export interface EntryLocationAndInfo {
  appletId: EntryHash;
  entryInfo: EntryInfo;
}

export interface AppletInfo {
  appletBundleId: EntryHash;
  appletName: string;
  groupsIds: Array<DnaHash>;
}

export interface WeServices {
  openViews: OpenViews;
  attachmentTypes: ReadonlyMap<EntryHash, Record<string, AttachmentType>>; // Segmented by groupId

  groupProfile(groupId: DnaHash): Promise<GroupProfile | undefined>;
  appletInfo(appletId: EntryHash): Promise<AppletInfo | undefined>;
  entryInfo(hrl: Hrl): Promise<EntryLocationAndInfo | undefined>;
  search(filter: string): Promise<Array<HrlWithContext>>;
}

export type MainView = (rootElement: HTMLElement) => void;
export type BlockView = (rootElement: HTMLElement, context: any) => void;
export type EntryTypeView = (
  rootElement: HTMLElement,
  hrl: Hrl,
  context: any
) => void;

export interface ReferenceableEntryType {
  info: (hrl: Hrl) => Promise<EntryInfo | undefined>;
  view: EntryTypeView;
}

export interface AppletViews {
  main: MainView;
  blocks: Record<string, BlockView>; // all events -> schedule
  entries: Record<
    string,
    Record<string, Record<string, ReferenceableEntryType>>
  >; // Segmented by RoleName, integrity ZomeName and EntryType
}

export interface CrossAppletViews {
  main: MainView;
  blocks: Record<string, BlockView>;
}

export interface WeApplet {
  appletViews: (
    client: AppAgentClient,
    appletId: EntryHash,
    profilesClient: ProfilesClient,
    weServices: WeServices
  ) => AppletViews;

  crossAppletViews: (
    applets: ReadonlyMap<
      EntryHash,
      { appletClient: AppAgentClient; profilesClient: ProfilesClient }
    >,
    weServices: WeServices
  ) => CrossAppletViews;

  attachmentTypes: (
    appletClient: AppAgentClient
  ) => Promise<Record<string, AttachmentType>>;

  search: (
    appletClient: AppAgentClient,
    searchFilter: string
  ) => Promise<Array<HrlWithContext>>;
}
