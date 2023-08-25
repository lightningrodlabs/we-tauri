import {
  ActionHash,
  CallZomeRequest,
  decodeHashFromBase64,
  DnaHash,
  encodeHashToBase64,
  EntryHash,
  EntryHashB64,
} from "@holochain/client";
import { Hrl, HrlWithContext, WeNotification } from "@lightningrodlabs/we-applet";
import { encode, decode } from "@msgpack/msgpack";
import { fromUint8Array, toUint8Array } from "js-base64";

export type OpenViewRequest =
  | {
      type: "applet-main";
      appletHash: EntryHash;
    }
  | {
      type: "cross-applet-main";
      appletBundleId: ActionHash;
    }
  | {
      type: "applet-block";
      appletHash: EntryHash;
      block: string;
      context: any;
    }
  | {
      type: "cross-applet-block";
      appletBundleId: ActionHash;
      block: string;
      context: any;
    }
  | {
      type: "hrl";
      hrl: Hrl;
      context: any;
    };

export interface CreateAttachmentRequest {
  appletHash: EntryHash;
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
      appletHash: EntryHash;

      profilesLocation: ProfilesLocation;
    }
  | {
      type: "cross-applet";
      appPort: number;
      applets: Record<EntryHashB64, ProfilesLocation>;
    }
  | {
      type: "not-installed";
      appletName: string;
    };

export interface AppletToParentMessage {
  appletHash: EntryHash;
  request: AppletToParentRequest;
}

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
      type: "notify-we";
      notifications: Array<WeNotification>;
  }
  | {
      type: "get-applet-info";
      appletHash: AppletHash;
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
    }
  | {
      type: "hrl-to-clipboard";
      hrl: HrlWithContext;
    }
  | {
      type: "user-select-hrl";
    }
  | {
      type: "toggle-clipboard";
    }
  | {
      type: "localStorage.setItem";
      key: string;
      value: string;
    }
  | {
      type: "localStorage.removeItem";
      key: string;
    }
  | {
      type: "localStorage.clear";
    }
  | {
      type: "get-localStorage";
    };


type AppletHash = EntryHash;

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
    const b64context = fromUint8Array(encode(renderView.view.context), true);
    base = `${base}&context=${b64context}`;
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
    context = decode(toUint8Array(args[3].split("=")[1]));
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
