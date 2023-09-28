import { ProfilesClient } from "@holochain-open-dev/profiles";
import { EntryHashMap } from "@holochain-open-dev/utils";
import { ActionHash, AppAgentClient,DnaHash, EntryHash } from "@holochain/client";
import { AppletView, CrossAppletView, BlockType, AppletClients, AppletInfo, AttachmentType, EntryInfo, EntryLocationAndInfo, GroupProfile, Hrl, HrlWithContext, WeNotification, RenderView, RenderInfo } from "./types";


declare global {
  interface Window {
    __HC_WE_API__: WeApi
  }
}


export interface WeApi {
  getAttachmentTypes(): EntryHashMap<Record<string, AttachmentType>>;
  appletHash(): EntryHash,
  getRenderView(): RenderView | undefined;
  getRenderInfo(): Promise<RenderInfo>;
  openAppletMain(appletHash: EntryHash): void;
  openAppletBlock(appletHash: EntryHash, block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
  openCrossAppletMain(appletBundleId: ActionHash): void;
  openCrossAppletBlock(
    appletBundleId: ActionHash,
    block: string,
    context: any
  ): void;
  groupProfile(groupId: DnaHash): Promise<GroupProfile | undefined>;
  appletInfo(appletHash: EntryHash): Promise<AppletInfo | undefined>;
  entryInfo(hrl: Hrl): Promise<EntryLocationAndInfo | undefined>;
  search(filter: string): Promise<Array<HrlWithContext>>;
  hrlToClipboard(hrl: HrlWithContext): Promise<void>;
  userSelectHrl(): Promise<HrlWithContext | undefined>;
  notifyWe(notifications: Array<WeNotification>): Promise<void>;
};


export interface AppletServices {
  attachmentTypes: () => Promise<Record<string, AttachmentType>>;
  search: (searchFilter: string) => Promise<Array<HrlWithContext>>;
  getBlockTypes: () => Promise<Record<string, BlockType>>;
  getEntryInfo: (
    roleName,
    integrityZomeName,
    entryDefId,
    hrl
  ) => Promise<EntryInfo | undefined>;
}


export class WeClient {

  appletHash: EntryHash;
  attachmentTypes: EntryHashMap<Record<string, AttachmentType>>;

  private constructor(
    appletHash: EntryHash,
    attachmentTypes: EntryHashMap<Record<string, AttachmentType>> // Segmented by groupId
  ) {
    this.appletHash = appletHash;
    this.attachmentTypes = attachmentTypes;
  }

  static async connect(requestAttachments = true): Promise<WeClient> {

    let attachmentTypes = new EntryHashMap<Record<string, AttachmentType>>();

    if (requestAttachments) {
      attachmentTypes = await window.__HC_WE_API__.getAttachmentTypes();
    }

    const appletHash = window.__HC_WE_API__.appletHash();

    return new WeClient(appletHash, attachmentTypes);
  }

  openAppletMain = (appletHash: EntryHash) => window.__HC_WE_API__.openAppletMain(appletHash);

  openAppletBlock = (appletHash, block: string, context: any) => window.__HC_WE_API__.openAppletBlock(appletHash, block, context);

  openHrl = (hrl: Hrl, context: any) => window.__HC_WE_API__.openHrl(hrl, context);

  openCrossAppletMain = (appletBundleId: ActionHash) => window.__HC_WE_API__.openCrossAppletMain(appletBundleId);

  openCrossAppletBlock = (appletBundleId: ActionHash, block: string, context: any) => window.__HC_WE_API__.openCrossAppletBlock(appletBundleId, block, context);

  groupProfile = async (groupId: DnaHash) => window.__HC_WE_API__.groupProfile(groupId);

  appletInfo = async (appletHash: EntryHash) => window.__HC_WE_API__.appletInfo(appletHash);

  entryInfo = async (hrl: Hrl) => window.__HC_WE_API__.entryInfo(hrl);

  hrlToClipboard = (hrl: HrlWithContext) => window.__HC_WE_API__.hrlToClipboard(hrl);

  search = async (filter: string) => window.__HC_WE_API__.search(filter);

  userSelectHrl = async () => window.__HC_WE_API__.userSelectHrl();

  notifyWe = (notifications: Array<WeNotification>) => window.__HC_WE_API__.notifyWe(notifications);
}

export async function getRenderInfo() {
  return window.__HC_WE_API__.getRenderInfo();
}
