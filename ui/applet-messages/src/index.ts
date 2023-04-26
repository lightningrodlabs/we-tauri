import { CallZomeRequest, DnaHash, EntryHash } from "@holochain/client";
import { Hrl, GroupProfile } from "@lightningrodlabs/we-applet";
import { HoloHashMap } from "@holochain-open-dev/utils";

export type OpenViewRequest =
  | {
      type: "group-block";
      groupId: DnaHash;
      appletInstanceId: EntryHash;
      block: string;
      context: any;
    }
  | {
      type: "cross-group-block";
      appletId: EntryHash;
      block: string;
      context: any;
    }
  | {
      type: "hrl";
      hrl: Hrl;
      context: any;
    };

export interface CreateAttachmentRequest {
  groupId: DnaHash;
  appletInstanceId: EntryHash;
  attachmentType: string;
  attachToHrl: Hrl;
}

export type AppletToParentRequest =
  | {
      type: "sign-zome-call";
      request: CallZomeRequest;
    }
  | {
      type: "open-view";
      request: OpenViewRequest;
    }
  | {
      type: "create-attachment";
      request: CreateAttachmentRequest;
    }
  | {
      type: "get-info";
      hrl: Hrl;
    };

export interface InternalGroupWithApplets {
  groupId: DnaHash;
  groupProfile: GroupProfile;
  profilesAppId: string;
  profilesRoleName: string;
  applets: HoloHashMap<EntryHash, string>; // These will be the same kind of applet
}

export type GroupView =
  | { type: "main" }
  | { type: "block"; block: string; context: any }
  | {
      type: "entry";
      role: string;
      zome: string;
      entryType: string;
      hrl: Hrl;
      context: any;
    };

export type CrossGroupView =
  | {
      type: "main";
    }
  | {
      type: "block";
      block: string;
      context: any;
    };

export interface InternalAttachmentType {
  label: string;
  icon_src: string;
}

export interface InternalAppletAttachmentTypes {
  appletName: string;
  attachmentTypes: Record<string, InternalAttachmentType>;
}

export interface InternalGroupAttachmentTypes {
  groupProfile: GroupProfile;
  attachmentTypesByApplet: HoloHashMap<
    EntryHash,
    InternalAppletAttachmentTypes
  >;
}

export interface ParentToIframeMessage {
  appPort: number;
  message: RenderView;

  attachmentTypesByGroup: HoloHashMap<DnaHash, InternalGroupAttachmentTypes>;
}

export type RenderView =
  | {
      type: "group-view";
      view: GroupView;
      groupId: DnaHash;
      groupProfile: GroupProfile;
      appletInstanceId: EntryHash;
      appletInstalledAppId: string;
      profilesAppId: string;
      profilesRoleName: string;
    }
  | {
      type: "cross-group-view";
      appletsByGroup: HoloHashMap<DnaHash, InternalGroupWithApplets>;
      view: CrossGroupView;
    };

export type ParentToWebWorkerMessage =
  | {
      type: "setup";
      appPort: number;
      appletId: string;
    }
  | {
      type: "info";
      groupId: DnaHash;
      groupProfile: GroupProfile;
      appletInstanceId: EntryHash;
      roleName: string;
      integrityZomeName: string;
      entryDefId: string;
      hrl: Hrl;
    }
  | {
      type: "create-attachment";
      attachmentType: string;
      attachToHrl: Hrl;
    };
