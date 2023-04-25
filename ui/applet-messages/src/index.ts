import {
  ActionHash,
  CallZomeRequest,
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { Hrl } from "@lightningrodlabs/hrl";
import { GroupInfo } from "@lightningrodlabs/we-applet";

export type OpenViewRequest =
  | {
      type: "group-block";
      block: string;
      context: any;
    }
  | { type: "cross-group-block"; block: string; context: any }
  | {
      type: "hrl";
      hrl: Hrl;
      context: any;
    };

export interface CreateAttachmentRequest {
  groupDnaHash: DnaHash;
  appletInstanceHash: EntryHash;
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

export interface GroupAppletInfo {
  appletId: string;
  profilesAppId: string;
  profilesRoleName: string;
}

export interface CrossGroupAppletInfo {
  appletsIds: string[];
  profilesAppId: string;
  profilesRoleName: string;
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
  appletInstanceHash: EntryHash;
  appletName: string;
  attachmentTypes: Record<string, InternalAttachmentType>;
}

export interface InternalGroupAttachmentTypes {
  groupDnaHash: DnaHash;
  groupInfo: GroupInfo;
  appletsAttachmentTypes: Array<InternalAppletAttachmentTypes>;
}

export interface ParentToIframeMessage {
  appPort: number;
  message: RenderView;

  groupsAttachmentTypes: Array<InternalGroupAttachmentTypes>;
}

export type RenderView =
  | {
      type: "group-view";
      view: GroupView;
      info: GroupAppletInfo;
    }
  | {
      type: "cross-group-view";
      infos: CrossGroupAppletInfo[];
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
