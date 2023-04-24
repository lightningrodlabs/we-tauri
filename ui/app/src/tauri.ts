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
