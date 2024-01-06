import {
  EntryHash,
  CellId,
  CellInfo,
  DisabledAppReason,
  AppInfo,
  DnaHash,
  AgentPubKey,
  AppAgentWebsocket,
  AdminWebsocket,
  AppWebsocket,
  AppBundle
} from "@holochain/client";
import { GuiFile, IconSrcOption } from "./types";
import { decompressSync, unzipSync } from "fflate";
import { decode } from "@msgpack/msgpack";
import { NeighbourhoodApplet } from "@neighbourhoods/client";

/**
 * TODO: Much of this code can actually be encapsulated in modules that deal exclusively with installing and managing applets
 */

export async function fakeSeededEntryHash(happBytes: Uint8Array): Promise<EntryHash> {
  const sha = await crypto.subtle.digest("SHA-256", happBytes)
  return new Uint8Array([0x84, 0x21, 0x24, ...new Uint8Array(sha), ...new Uint8Array(4)])
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

/**
 * Returns the cell_id if the cell info corresponds to a provisioned or cloned cell
 */
export function getCellId(cellInfo: CellInfo): CellId {
  if ("provisioned" in cellInfo) {
    return cellInfo.provisioned.cell_id;
  }
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.cell_id;
  }
  throw new Error("CellInfo does not contain a CellId.")
}

/**
 * Returns the cell_id if the cell info corresponds to a cloned cell
 */
export function getClonedCellId(cellInfo: CellInfo): CellId {
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.cell_id;
  }
  return [new Uint8Array(), new Uint8Array()];
}

/**
 * Gets a DNA hash out of the cell_id array (more readable, more verbose)
 */
export function dnaHash(cell_id: CellId): DnaHash {
  return cell_id![0];
}

/**
 * Gets an Agent Pubkey out of the cell_id array (more readable, more verbose)
 */
export function agentPubKey(cell_id: CellId): AgentPubKey {
  return cell_id![1];
}

/**
 * Compare two Uint8Arrays byte by byte
 * Note: This doesn't short circuit if a and b have the same length,
 *   to do that convert to loop and return when false.
 */
export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
  let ret_val = a.byteLength == b.byteLength;
  return ret_val && a.reduce((prev: boolean, aByte: number, index: number) => (prev && aByte == b[index]), ret_val);
}

/**
 * Compare two Cell Ids (both dna hashes and agent pubkeys)
 */
export function compareCellIds(a: CellId, b: CellId): boolean {
  return compareUint8Arrays(dnaHash(a), dnaHash(b))
    && compareUint8Arrays(agentPubKey(a), agentPubKey(b))
}

/**
 * Get the cell name from from the cell info
 */
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

/**
 * Get the the provisioned cell for a role given the appInfo
 *
 * @param appInfo : AppInfo
 * @param role : string
 */
export function getProvisionedDnaHash(
  appInfo: AppInfo,
  role: string
) {
  // Find the provisioned cell for the group
  const weCellInfo = appInfo.cell_info[role].find((cellInfo) => "provisioned" in cellInfo);
  if (weCellInfo) {
    // Get the dna hash
    const weDnaHash = dnaHash(getCellId(weCellInfo));
    if (weDnaHash) {
      return weDnaHash
    } else {
      throw Error(`Could not get dna hash for "${role}" cell`)
    }
  } else {
    throw Error(`Could not find provisioned "${role}" cell.`)
  }
}

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

export async function toSha1(thing: string) {
  const trans = new TextEncoder()
  const digestBuffer = await crypto.subtle.digest('SHA-1', trans.encode(thing));
  return Array.from(
    new Uint8Array(digestBuffer)
  ).map(
    (b) => b.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Convert an ArrayBuffer into a Base64 encoded URL
 */
export async function toBase64URL(bytes: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(new Blob([bytes]))
    reader.onload = async (ev: ProgressEvent<FileReader>) => {
      if( ev.target) {
        const b64 = ev.target.result as string
        resolve(b64)
      } else {
        reject()
      }
    }
  })
}

/**
 * Import a module from an ArrayBuffer
 */
export async function importModuleFromArrayBuffer(bytes: ArrayBuffer): Promise<{ default: NeighbourhoodApplet}> {
  const wrongDataType = await toBase64URL(bytes);
  const b64minusType = wrongDataType.split(';')[1];
  // prettier-ignore
  const module = await import(`data:text/javascript;${b64minusType}`)
  return module
}

/**
 * Decompresses a webhapp
 *
 * @param compressedWebHapp: Uint8Array
 * @returns [AppBundle, GuiFile, IconSrcOption]
 */
export async function decompressWebHapp(compressedWebHapp: Uint8Array): Promise<[AppBundle, Uint8Array, IconSrcOption]> {

  /**
   * Decompress bytearray into .happ and ui.zip (zlibt2)
   *
   * This is a version of the object described by the Holochain objects:
   * - https://github.com/holochain/holochain/blob/develop/crates/holochain_types/src/web_app/web_app_manifest/web_app_manifest_v1.rs
   * - https://github.com/holochain/holochain/blob/develop/crates/mr_bundle/src/bundle.rs
   *
   * This is what the object looks like when decoded:
   *
   * const bundle = {
   *   "manifest": {
   *     "manifest_version": "1",
   *     "name": "todo",
   *      "ui": {
   *        "bundled": "../ui/ui.zip"
   *      },
   *      "happ_manifest": {
   *        "bundled": "./todo.happ"
   *      }
   *    },
   *    "resources": {
   *      "./todo.happ": ArrayBuffer,
   *      "../ui/ui.zip": ArrayBuffer
   *    }
   *  }
   */
  const bundle = decode(
    decompressSync(new Uint8Array(compressedWebHapp))
  ) as any;

  const webappManifest = bundle.manifest;
  const resources = bundle.resources;

  // Decompress the happ
  const compressedHapp = resources[webappManifest.happ_manifest.bundled];
  const decompressedHapp = decode(
    decompressSync(new Uint8Array(compressedHapp))
  ) as AppBundle;

  // Decompress ui.zip bundle
  const compressedGui = resources[webappManifest.ui.bundled];
  const decompressedGuiMap = unzipSync(new Uint8Array(compressedGui)) as any;

  // Extract index.js and icon.png
  const decompressedGui = decompressedGuiMap["index.js"] as GuiFile;
  const decompressedIcon = decompressedGuiMap["icon.png"]

  // Convert icon to Base64 encoded url
  const iconSrcOption: IconSrcOption = await toBase64URL(decompressedIcon);

  return [decompressedHapp, decompressedGui, iconSrcOption];
}

/**
 * TODO: replace this with equivalent functionality given the new structure of the SensemakerStore
 */
export function flattenRoleAndZomeIndexedResourceDefs(appletResourceDefs: any) {
  return []
}
