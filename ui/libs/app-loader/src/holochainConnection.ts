import {
  AppAgentWebsocket,
  AdminWebsocket,
  AppWebsocket,
} from "@holochain/client";
import {
  getCellId
} from "./cellUtils"

export function getAppPort() {
  return import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_HC_PORT_2 : import.meta.env.VITE_HC_PORT
}

export function getAdminPort() {
  return import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_ADMIN_PORT_2 : import.meta.env.VITE_ADMIN_PORT
}

export async function getAdminWebsocket() {
  return await AdminWebsocket.connect(new URL(`ws://localhost:${getAdminPort()}`))
}

export async function getAppWebsocket() {
  return await AppWebsocket.connect(new URL(`ws://localhost:${getAppPort()}`))
}

export async function getAppAgentWebsocket(app_id: string) {
  return await AppAgentWebsocket.connect(new URL(`ws://localhost:${getAppPort()}`), app_id);
}

export async function connectHolochainApp(installed_app_id: string) {
  const hcPort = import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_HC_PORT_2 : import.meta.env.VITE_HC_PORT;
  const adminPort = import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_ADMIN_PORT_2 : import.meta.env.VITE_ADMIN_PORT;
  const adminWebsocket = await AdminWebsocket.connect(new URL(`ws://localhost:${adminPort}`));
  const appWebsocket = await AppWebsocket.connect(new URL(`ws://localhost:${hcPort}`));
  const appInfo = await appWebsocket.appInfo({
    installed_app_id
  });
  const installedCells = appInfo.cell_info;
  await Promise.all(
    Object.values(installedCells).flat().map(cellInfo => {
      adminWebsocket.authorizeSigningCredentials(getCellId(cellInfo)!);
    })
  );
  return {
    adminWebsocket,
    appWebsocket,
    appInfo
  }
}
