import { invoke } from "@tauri-apps/api/tauri";

export async function isKeystoreInitialized(): Promise<boolean> {
  return invoke("is_keystore_initialized");
}

export async function isLaunched(): Promise<boolean> {
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

export async function enterPassword(password: string): Promise<void> {
  return invoke("enter_password", { password });
}

export async function createPassword(password: string): Promise<void> {
  return invoke("create_password", { password });
}
