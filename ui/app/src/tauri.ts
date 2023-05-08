import { CallZomeRequestUnsigned } from "@holochain/client";
import { randomNonce } from "@holochain/client";
import { CallZomeRequest } from "@holochain/client";
import { getNonceExpiration } from "@holochain/client";
import { CallZomeRequestSigned } from "@holochain/client";
import { encode } from "@msgpack/msgpack";
import { invoke } from "@tauri-apps/api/tauri";

export async function isKeystoreInitialized(): Promise<boolean> {
  return invoke("is_keystore_initialized");
}

export async function isLaunched(): Promise<boolean> {
  return invoke("is_launched");
}

export async function sign_cal(): Promise<boolean> {
  return invoke("is_launched");
}

export interface ConductorInfo {
  app_port: number;
  admin_port: number;
  we_app_id: string;
}

export async function getConductorInfo(): Promise<ConductorInfo> {
  return invoke("get_conductor_info");
}

export async function enterPassword(
  password: string,
  mdns: boolean
): Promise<void> {
  return invoke("enter_password", { password, mdns });
}

export async function createPassword(
  password: string,
  mdns: boolean
): Promise<void> {
  return invoke("create_password", { password, mdns });
}

export async function openDevhub() {
  return invoke("open_devhub");
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
    nonce: Array.from(await randomNonce()),
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
