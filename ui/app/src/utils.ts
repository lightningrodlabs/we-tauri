import {
  EntryHash,
  CellId,
  CellInfo,
  DisabledAppReason,
  AppInfo,
  AppAgentWebsocket,
  AdminWebsocket,
  GrantedFunctionsType,
  CellType,
  AgentPubKey,
  AppAgentClient,
  CapSecret,
  AppAgentCallZomeRequest,
  CreateCloneCellRequest,
  DisableCloneCellRequest,
  EnableCloneCellRequest,
  AppAgentEvents,
  AppSignalCb,
  RoleNameCallZomeRequest,
  signZomeCall,
} from "@holochain/client";
import { UnsubscribeFunction } from "emittery";
import { getAllAppsWithGui } from "./processes/devhub/get-happs";

const DEVHUB_APP_ID = "DevHub";

export async function initDevhubClient(
  adminWebsocket: AdminWebsocket
): Promise<AppAgentClient> {
  const client = await initAppClient(DEVHUB_APP_ID);

  const devhubClient = new WrappedAppAgentClient(client);
  try {
    await getAllAppsWithGui(devhubClient);
  } catch (e) {
    const devhubCells = await client.appInfo();
    for (const [role_name, [cell]] of Object.entries(devhubCells.cell_info)) {
      await adminWebsocket.authorizeSigningCredentials(
        cell[CellType.Provisioned].cell_id,
        {
          [GrantedFunctionsType.All]: null,
        }
      );
    }
  }
  return devhubClient;
}

export async function initAppClient(appId: string): Promise<AppAgentWebsocket> {
  const client = await AppAgentWebsocket.connect("", appId);
  client.installedAppId = appId;
  client.cachedAppInfo = undefined;
  client.appWebsocket.overrideInstalledAppId = appId;
  return client;
}

export class WrappedAppAgentClient implements AppAgentClient {
  constructor(protected client: AppAgentWebsocket) {}
  appInfo() {
    return this.client.appInfo();
  }
  on<Name extends keyof AppAgentEvents>(
    eventName: Name | readonly Name[],
    listener: AppSignalCb
  ): UnsubscribeFunction {
    return this.client.on(eventName, listener);
  }
  async callZome(zomeCallRequest: AppAgentCallZomeRequest) {
    let payload: AppAgentCallZomeRequest = {
      ...zomeCallRequest,
    };
    if ((payload as RoleNameCallZomeRequest).role_name) {
      const cellId = this.client.getCellIdFromRoleName(
        (payload as RoleNameCallZomeRequest).role_name,
        await this.client.appInfo()
      );
      payload = await signZomeCall({
        ...payload,
        cell_id: cellId,
      } as any);
    }

    return this.client.callZome(payload);
  }
  createCloneCell(arg: CreateCloneCellRequest) {
    return this.client.createCloneCell(arg);
  }
  enableCloneCell(arg: EnableCloneCellRequest) {
    return this.client.enableCloneCell(arg);
  }
  disableCloneCell(arg: DisableCloneCellRequest) {
    return this.client.disableCloneCell(arg);
  }
  get myPubKey() {
    return this.client.myPubKey;
  }
}

export function fakeMd5SeededEntryHash(md5Hash: Uint8Array): EntryHash {
  return new Uint8Array([0x84, 0x21, 0x24, ...md5Hash, ...new Uint8Array(20)]);
}

export function getStatus(app: AppInfo): string {
  if (isAppRunning(app)) {
    return "RUNNING";
  } else if (isAppDisabled(app)) {
    return "DISABLED";
  } else if (isAppPaused(app)) {
    return "PAUSED";
  } else {
    return "UNKNOWN";
  }
}

export function isAppRunning(app: AppInfo): boolean {
  return Object.keys(app.status).includes("running");
}
export function isAppDisabled(app: AppInfo): boolean {
  return Object.keys(app.status).includes("disabled");
}
export function isAppPaused(app: AppInfo): boolean {
  return Object.keys(app.status).includes("paused");
}
export function getReason(app: AppInfo): string | undefined {
  if (isAppRunning(app)) return undefined;
  if (isAppDisabled(app)) {
    const reason = (
      app.status as unknown as {
        disabled: {
          reason: DisabledAppReason;
        };
      }
    ).disabled.reason;

    if ((reason as any) === "never_started") {
      return "App was never started";
    } else if ((reason as any) === "user") {
      return "App was disabled by the user";
    } else {
      return `There was an error with this app: ${
        (
          reason as {
            error: string;
          }
        ).error
      }`;
    }
  } else {
    return (
      app.status as unknown as {
        paused: { reason: { error: string } };
      }
    ).paused.reason.error;
  }
}

export function getCellId(cellInfo: CellInfo): CellId | undefined {
  if ("provisioned" in cellInfo) {
    return cellInfo.provisioned.cell_id;
  }
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.cell_id;
  }
  return undefined;
}

export function getCellName(cellInfo: CellInfo): string | undefined {
  if ("provisioned" in cellInfo) {
    return cellInfo.provisioned.name;
  }
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.name;
  }
  if ("stem" in cellInfo) {
    return cellInfo.stem.name;
  }
}

export function flattenCells(
  cell_info: Record<string, CellInfo[]>
): [string, CellInfo][] {
  return Object.entries(cell_info)
    .map(([roleName, cellInfos]) => {
      return cellInfos.map((CellInfo) => [roleName, CellInfo]);
    })
    .flat() as any;
}
