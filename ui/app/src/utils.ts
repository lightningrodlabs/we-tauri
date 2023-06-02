import {
  EntryHash,
  CellId,
  CellInfo,
  DisabledAppReason,
  AppInfo,
  AppAgentWebsocket,
  ListAppsResponse,
  DnaHash,
  CellType,
  encodeHashToBase64,
} from "@holochain/client";

export async function initAppClient(
  appId: string,
  defaultTimeout?: number
): Promise<AppAgentWebsocket> {
  const client = await AppAgentWebsocket.connect("", appId, defaultTimeout);
  client.installedAppId = appId;
  client.cachedAppInfo = undefined;
  client.appWebsocket.overrideInstalledAppId = appId;
  await client.appInfo();
  return client;
}

export function appletOrigin(appletId: EntryHash): string {
  //@ts-ignore
  return import.meta.env.DEV
    ? `applet://${encodeHashToBase64(appletId)}`
    : `https://${encodeHashToBase64(appletId)}`;
}

export function findAppForDnaHash(
  apps: ListAppsResponse,
  dnaHash: DnaHash
): { appInfo: AppInfo; roleName: string } | undefined {
  for (const app of apps) {
    for (const [roleName, cells] of Object.entries(app.cell_info)) {
      for (const cell of cells) {
        if (CellType.Cloned in cell) {
          if (
            cell[CellType.Cloned].cell_id[0].toString() === dnaHash.toString()
          ) {
            return { appInfo: app, roleName };
          }
        } else if (CellType.Provisioned in cell) {
          if (
            cell[CellType.Provisioned].cell_id[0].toString() ===
            dnaHash.toString()
          ) {
            return { appInfo: app, roleName };
          }
        }
      }
    }
  }
  return undefined;
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
