import { invoke } from "@tauri-apps/api/tauri";

export async function isKeystoreInitialized(): Promise<boolean> {
  return invoke("is_keystore_initialized");
}

export async function isLaunched(): Promise<boolean> {
  return invoke("is_launched");
}

export interface PortsInfo {
  app_port: number;
  admin_port: number;
}

export async function getPortsInfo(): Promise<PortsInfo> {
  return invoke("get_ports_info");
}

export async function enterPassword(password: string): Promise<void> {
  return invoke("enter_password", { password });
}

export async function createPassword(password: string): Promise<void> {
  return invoke("create_password", { password });
}
