import { CellId, CellInfo, DisabledAppReason, AppInfo } from "@holochain/client";
import { EntryHash } from "@holochain/client";


export function fakeMd5SeededEntryHash(md5Hash: Uint8Array): EntryHash {
  return new Uint8Array([0x84, 0x21, 0x24, ...md5Hash, ...new Uint8Array(20)]);
}




export function getStatus(app: AppInfo): string {
  if (isAppRunning(app)) {
    return "RUNNING"
  } else if (isAppDisabled(app)) {
    return "DISABLED"
  } else if (isAppPaused(app)) {
    return "PAUSED"
  } else {
    return "UNKNOWN"
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
  if ("Provisioned" in cellInfo) {
    return cellInfo.Provisioned.cell_id;
  }
  if ("Cloned" in cellInfo) {
    return cellInfo.Cloned.cell_id;
  }
  return undefined;
}

export function getCellName(cellInfo: CellInfo): string | undefined {
  if ("Provisioned" in cellInfo) {
    return cellInfo.Provisioned.name;
  }
  if ("Cloned" in cellInfo) {
    return cellInfo.Cloned.name;
  }
  if ("Stem" in cellInfo) {
    return cellInfo.Stem.name;
  }
}


export function flattenCells(cell_info: Record<string, CellInfo[]>): [string, CellInfo][] {
  return Object.entries(cell_info).map(([roleName, cellInfos]) => {
    return cellInfos.map((CellInfo) => [roleName, CellInfo])
  }).flat() as any
}