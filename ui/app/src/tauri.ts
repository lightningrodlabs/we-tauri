import {
  AgentPubKey,
  AppInfo,
  CallZomeRequestUnsigned,
  CellType,
  encodeHashToBase64,
} from "@holochain/client";
import { randomNonce } from "@holochain/client";
import { CallZomeRequest } from "@holochain/client";
import { getNonceExpiration } from "@holochain/client";
import { CallZomeRequestSigned } from "@holochain/client";
import { encode } from "@msgpack/msgpack";
import { invoke } from "@tauri-apps/api/tauri";
import { isWindows } from "./utils.js";

export async function isKeystoreInitialized(): Promise<boolean> {
  return invoke("is_keystore_initialized");
}

export async function isLaunched(): Promise<boolean> {
  return invoke("is_launched");
}

// Here we are trying to cover all platforms in different ways
// Windows doesn't support requests of type applet://APPLETID
// MacOs doesn't support requests of type http://APPLETID.localhost:4040
export enum AppletIframeProtocol {
  Assets,
  LocalhostSubdomain,
  LocaltestMe,
}

export interface ConductorInfo {
  app_port: number;
  admin_port: number;
  applets_ui_port: number;
  appstore_app_id: string;
  devhub_app_id: string;
  applet_iframe_protocol: AppletIframeProtocol;
}

async function fetchPing(origin: string) {
  const iframe = document.createElement("iframe");
  iframe.src = origin;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  return new Promise((resolve, reject) => {
    let resolved = false;

    const listener = (message) => {
      if (message.source === iframe.contentWindow) {
        resolved = true;
        document.body.removeChild(iframe);
        window.removeEventListener("message", listener);
        resolve(null);
      }
    };
    setTimeout(() => {
      if (resolved) return;
      document.body.removeChild(iframe);
      window.removeEventListener("message", listener);
      reject(new Error("Protocol failed to start."));
    }, 1000);

    window.addEventListener("message", listener);
  });
}

export async function joinGroup(
  networkSeed: string,
  agentPubKey: AgentPubKey
): Promise<AppInfo> {
  const appInfo: AppInfo = await invoke("join_group", {
    networkSeed,
    agentPubKey: encodeHashToBase64(agentPubKey),
  });

  for (const [role, cells] of Object.entries(appInfo.cell_info)) {
    for (const cell of cells) {
      if (CellType.Provisioned in cell) {
        cell[CellType.Provisioned].cell_id = [
          new Uint8Array(cell[CellType.Provisioned].cell_id[0]),
          new Uint8Array(cell[CellType.Provisioned].cell_id[1]),
        ];
      }
      if (CellType.Cloned in cell) {
        cell[CellType.Cloned].cell_id = [
          new Uint8Array(cell[CellType.Cloned].cell_id[0]),
          new Uint8Array(cell[CellType.Cloned].cell_id[1]),
        ];
      }
      if (CellType.Stem in cell) {
        cell[CellType.Stem].cell_id = [
          new Uint8Array(cell[CellType.Stem].cell_id[0]),
          new Uint8Array(cell[CellType.Stem].cell_id[1]),
        ];
      }
    }
  }

  return appInfo;
}

export async function getConductorInfo(): Promise<ConductorInfo> {
  const conductor_info: any = await invoke("get_conductor_info");

  let applet_iframe_protocol = AppletIframeProtocol.LocaltestMe;
  if (isWindows()) {
    try {
      await fetchPing(
        `http://ping.localhost:${conductor_info.applets_ui_port}`
      );
      applet_iframe_protocol = AppletIframeProtocol.LocalhostSubdomain;
    } catch (e) {
      applet_iframe_protocol = AppletIframeProtocol.LocaltestMe;
    }
  } else {
    try {
      await fetchPing("applet://ping");
      applet_iframe_protocol = AppletIframeProtocol.Assets;
    } catch (e) {
      try {
        await fetchPing(
          `http://ping.localhost:${conductor_info.applets_ui_port}`
        );
        applet_iframe_protocol = AppletIframeProtocol.LocalhostSubdomain;
      } catch (e) {
        applet_iframe_protocol = AppletIframeProtocol.LocaltestMe;
      }
    }
  }

  return {
    ...conductor_info,
    applet_iframe_protocol,
  };
}

export async function enterPassword(password: string): Promise<void> {
  return invoke("enter_password", { password });
}

export async function createPassword(password: string): Promise<void> {
  return invoke("create_password", { password });
}

export async function openDevhub() {
  return invoke("open_devhub");
}

export async function openAppStore() {
  return invoke("open_appstore");
}

export async function isDevModeEnabled(): Promise<boolean> {
  return invoke("is_dev_mode_enabled");
}

export async function enableDevMode() {
  return invoke("enable_dev_mode");
}

export async function disableDevMode() {
  return invoke("disable_dev_mode");
}

/** Copied from https://github.com/holochain/holochain-client-js/blob/main/src/environments/launcher.ts */
type TauriByteArray = number[]; // Tauri requires a number array instead of a Uint8Array

interface CallZomeRequestSignedTauri
  extends Omit<
    CallZomeRequestSigned,
    "cap_secret" | "cell_id" | "provenance" | "nonce"
  > {
  cell_id: [TauriByteArray, TauriByteArray];
  provenance: TauriByteArray;
  nonce: TauriByteArray;
  expires_at: number;
}

interface CallZomeRequestUnsignedTauri
  extends Omit<
    CallZomeRequestUnsigned,
    "cap_secret" | "cell_id" | "provenance" | "nonce"
  > {
  cell_id: [TauriByteArray, TauriByteArray];
  provenance: TauriByteArray;
  nonce: TauriByteArray;
  expires_at: number;
}

export const signZomeCallTauri = async (request: CallZomeRequest) => {
  const zomeCallUnsigned: CallZomeRequestUnsignedTauri = {
    provenance: Array.from(request.provenance),
    cell_id: [Array.from(request.cell_id[0]), Array.from(request.cell_id[1])],
    zome_name: request.zome_name,
    fn_name: request.fn_name,
    payload: Array.from(encode(request.payload)),
    nonce: Array.from(randomNonce()),
    expires_at: getNonceExpiration(),
  };

  const signedZomeCallTauri: CallZomeRequestSignedTauri = await invoke(
    "sign_zome_call",
    { zomeCallUnsigned }
  );

  const signedZomeCall: CallZomeRequestSigned = {
    provenance: Uint8Array.from(signedZomeCallTauri.provenance),
    cap_secret: null,
    cell_id: [
      Uint8Array.from(signedZomeCallTauri.cell_id[0]),
      Uint8Array.from(signedZomeCallTauri.cell_id[1]),
    ],
    zome_name: signedZomeCallTauri.zome_name,
    fn_name: signedZomeCallTauri.fn_name,
    payload: Uint8Array.from(signedZomeCallTauri.payload),
    signature: Uint8Array.from(signedZomeCallTauri.signature),
    expires_at: signedZomeCallTauri.expires_at,
    nonce: Uint8Array.from(signedZomeCallTauri.nonce),
  };

  return signedZomeCall;
};
