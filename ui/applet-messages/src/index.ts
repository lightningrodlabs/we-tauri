import {
  CallZomeRequest,
  DnaHash,
  EntryHash,
  EntryHashB64,
} from "@holochain/client";
import { Hrl } from "@lightningrodlabs/we-applet";

export type OpenViewRequest =
  | {
      type: "applet-block";
      appletId: EntryHash;
      block: string;
      context: any;
    }
  | {
      type: "cross-applet-block";
      appletBundleId: EntryHash;
      block: string;
      context: any;
    }
  | {
      type: "hrl";
      hrl: Hrl;
      context: any;
    };

export interface CreateAttachmentRequest {
  appletId: EntryHash;
  attachmentType: string;
  attachToHrl: Hrl;
}

export type ParentToAppletRequest =
  | {
      type: "render-view";
      message: RenderView;
      attachmentTypes: Record<
        EntryHashB64,
        Record<string, InternalAttachmentType>
      >;
    }
  | {
      type: "get-entry-info";
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
  appletId: EntryHash;
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
      type: "get-applet-info";
      appletId: EntryHash;
    }
  | {
      type: "get-group-profile";
      groupId: DnaHash;
    }
  | {
      type: "get-entry-info";
      hrl: Hrl;
    };

export type AppletView =
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

export type CrossAppletView =
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

export interface ProfilesLocation {
  profilesAppId: string;
  profilesRoleName: string;
}

export type RenderView =
  | {
      type: "applet-view";
      view: AppletView;
      appletId: EntryHash;
      profilesLocation: ProfilesLocation;
    }
  | {
      type: "cross-applet-view";
      applets: Record<EntryHashB64, ProfilesLocation>;
      view: CrossAppletView;
    };
