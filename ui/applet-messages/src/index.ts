import {
  CallZomeRequest,
  decodeHashFromBase64,
  DnaHash,
  encodeHashToBase64,
  EntryHash,
  EntryHashB64,
} from "@holochain/client";
import { Hrl } from "@lightningrodlabs/we-applet";

export type OpenViewRequest =
  | {
      type: "applet-main";
      appletId: EntryHash;
    }
  | {
      type: "cross-applet-main";
      appletBundleId: EntryHash;
    }
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
      type: "get-entry-info";
      roleName: string;
      integrityZomeName: string;
      entryDefId: string;
      hrl: Hrl;
    }
  | {
      type: "get-attachment-types";
    }
  | {
      type: "get-block-types";
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

export type IframeConfig =
  | {
      type: "applet";
      appPort: number;
      appletId: EntryHash;

      profilesLocation: ProfilesLocation;
    }
  | {
      type: "cross-applet";
      appPort: number;
      applets: Record<EntryHashB64, ProfilesLocation>;
    };

export type AppletToParentRequest =
  | {
      type: "ready";
    }
  | {
      type: "get-iframe-config";
      crossApplet: boolean;
    }
  | {
      type: "get-hrl-location";
      hrl: Hrl;
    }
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
      type: "get-attachment-types";
    }
  | {
      type: "get-group-profile";
      groupId: DnaHash;
    }
  | {
      type: "get-entry-info";
      hrl: Hrl;
    };

export interface HrlLocation {
  roleName: string;
  integrityZomeName: string;
  entryType: string;
}

export type AppletView =
  | { type: "main" }
  | { type: "block"; block: string; context: any }
  | {
      type: "entry";
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

export interface BlockType {
  label: string;
  icon_src: string;
}

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
    }
  | {
      type: "cross-applet-view";
      view: CrossAppletView;
    };

export function renderViewToQueryString(renderView: RenderView): string {
  let base = `view=${renderView.type}&view-type=${renderView.view.type}`;

  if ("block" in renderView.view) {
    base = `${base}&block=${renderView.view.block}`;
  }
  if ("hrl" in renderView.view) {
    base = `${base}&hrl=${stringifyHrl(renderView.view.hrl)}`;
  }
  if ("context" in renderView.view) {
    base = `${base}&context=${JSON.stringify(renderView.view.context)}`;
  }

  return base;
}

export function queryStringToRenderView(s: string): RenderView {
  const args = s.split("&");

  const view = args[0].split("=")[1];
  const viewType = args[1].split("=")[1];
  let block: string | undefined;
  let hrl: Hrl | undefined;
  let context: any | undefined;

  if (args[2] && args[2].split("=")[0] === "block") {
    block = args[2].split("=")[1];
  }
  if (args[2] && args[2].split("=")[0] === "hrl") {
    hrl = parseHrl(args[2].split("=")[1]);
  }
  if (args[3] && args[3].split("=")[0] === "context") {
    context = JSON.parse(args[3].split("=")[1]);
  }

  return {
    type: view,
    view: {
      type: viewType,
      hrl,
      context,
      block,
    },
  } as RenderView;
}

export function stringifyHrl(hrl: Hrl): string {
  return `hrl://${encodeHashToBase64(hrl[0])}/${encodeHashToBase64(hrl[1])}`;
}

export function parseHrl(hrl: string): Hrl {
  const split1 = hrl.split("://");
  if (split1[0] !== "hrl") throw new Error(`Invalid hrl string: ${hrl}`);

  const split2 = split1[1].split("/");
  return [decodeHashFromBase64(split2[0]), decodeHashFromBase64(split2[1])];
}
