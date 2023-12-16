import { CellId, CellInfo, DisabledAppReason, AppInfo, DnaHash, AgentPubKey, AppAgentWebsocket } from "@holochain/client";
import { EntryHash } from "@holochain/client";

export function fakeMd5SeededEntryHash(md5Hash: Uint8Array): EntryHash {
  return new Uint8Array([0x84, 0x21, 0x24, ...md5Hash, ...new Uint8Array(20)]);
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

export function getCellId(cellInfo: CellInfo): CellId {
  if ("provisioned" in cellInfo) {
    return cellInfo.provisioned.cell_id;
  }
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.cell_id;
  }
  throw new Error("CellInfo does not contain a CellId.")
}

export function getClonedCellId(cellInfo: CellInfo): CellId {
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.cell_id;
  }
  return [new Uint8Array(), new Uint8Array()];
}

export function getDnaHash(cell_id: CellId): DnaHash {
  return cell_id![0];
}

export function getAgentPubKey(cell_id: CellId): AgentPubKey {
  return cell_id![1];
}

export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
  let ret_val = a.byteLength == b.byteLength;
  return ret_val && a.reduce((prev: boolean, aByte: number, index: number) => (prev && aByte == b[index]), ret_val);
}

export function compareCellIds(a: CellId, b: CellId): boolean {
  return compareUint8Arrays(getDnaHash(a), getDnaHash(b))
    && compareUint8Arrays(getAgentPubKey(a), getAgentPubKey(b))
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

export function flattenCells(cell_info: Record<string, CellInfo[]>): [string, CellInfo][] {
  return Object.entries(cell_info).map(([roleName, cellInfos]) => {
    return cellInfos.map((CellInfo) => [roleName, CellInfo])
  }).flat() as any
}

export async function getAppletWebSocket(app_id: string) {
  const hcPort = import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_HC_PORT_2 : import.meta.env.VITE_HC_PORT;
  return await AppAgentWebsocket.connect(new URL(`ws://localhost:${hcPort}`), app_id);
}

export function flattenRoleAndZomeIndexedResourceDefs(appletResourceDefs: any) {
  return []
}
