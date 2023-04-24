import { ActionHash, CallZomeRequest, EntryHash } from "@holochain/client";
import { Hrl } from "@lightningrodlabs/hrl";

export type AppletToParentRequest =
  | {
      type: "sign-zome-call";
      request: CallZomeRequest;
    }
  | {
      type: "open-view";
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

export interface ParentToIframeMessage {
  appPort: number;
  message: RenderView;
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
      hash: ActionHash | EntryHash;
    };
