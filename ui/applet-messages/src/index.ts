import {
  CallZomeRequest,
  DnaHash,
  DnaHashB64,
  EntryHash,
  EntryHashB64,
} from "@holochain/client";
import { Hrl, GroupProfile } from "@lightningrodlabs/we-applet";

export type OpenViewRequest =
  | {
      type: "group-block";
      groupId: DnaHash;
      appletId: EntryHash;
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
  appletId: EntryHash;
  attachmentType: string;
  attachToHrl: Hrl;
}

export type ParentToAppletRequest =
  | {
      type: "render-view";
      message: RenderView;
      attachmentTypesByGroup: Record<DnaHashB64, InternalGroupAttachmentTypes>;
    }
  | {
      type: "get-entry-info";
      groupId: DnaHash;
      groupProfile: GroupProfile;
      appletId: EntryHash;
      roleName: string;
      integrityZomeName: string;
      entryDefId: string;
      hrl: Hrl;
    }
  | {
      type: "get-attachment-types";
    }
  | {
      type: "search";
      filter: string;
    }
  | {
      type: "create-attachment";
      attachmentType: string;
      attachToHrl: Hrl;
    };

export type ParentToAppletMessage = {
  request: ParentToAppletRequest;
  appPort: number;
  appletInstalledAppId: string;
};

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
      type: "search";
      filter: string;
    }
  | {
      type: "get-entry-info";
      hrl: Hrl;
    };

export interface InternalGroupWithApplets {
  groupId: DnaHash;
  groupProfile: GroupProfile;
  profilesAppId: string;
  profilesRoleName: string;
  applets: Record<EntryHashB64, string>; // These will be the same kind of applet
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
  attachmentTypesByApplet: Record<EntryHashB64, InternalAppletAttachmentTypes>;
}

export type RenderView =
  | {
      type: "group-view";
      view: GroupView;
      groupId: DnaHash;
      groupProfile: GroupProfile;
      appletId: EntryHash;
      appletInstalledAppId: string;
      profilesAppId: string;
      profilesRoleName: string;
    }
  | {
      type: "cross-group-view";
      appletsByGroup: Record<DnaHashB64, InternalGroupWithApplets>;
      view: CrossGroupView;
    };
