import { ProfilesClient } from "@holochain-open-dev/profiles";
import { Hrl, HrlWithContext } from "@lightningrodlabs/hrl";

export interface EntryInfo {
  name: string;
  icon_src: string;
}

export interface GroupInfo {
  name: string;
  logo_src: string;
}

export interface GroupServices {
  profilesClient: ProfilesClient;
}

export interface AttachmentType {
  label: string;
  icon_src: string;
  create: (attachToHrl: Hrl) => Promise<HrlWithContext>;
}

export interface AppletAttachmentTypes {
  appletName: string;
  attachmentTypes: Record<string, AttachmentType>;
}

export interface GroupAttachmentTypes {
  groupInfo: GroupInfo;
  appletsAttachmentTypes: Array<AppletAttachmentTypes>;
}

export interface WeServices {
  openViews: OpenViews;
  info(hrl: Hrl): Promise<EntryInfo | undefined>;
  groupsAttachmentTypes: Array<GroupAttachmentTypes>;
}

export interface OpenViews {
  openGroupBlock(block: string, context: any): void;
  openCrossGroupBlock(block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
}
