import {
  EntryHash,
  AppBundle
} from "@holochain/client";
import { GuiFile, IconSrcOption } from "./types";
import { decompressSync, unzipSync } from "fflate";
import { decode } from "@msgpack/msgpack";
import { NeighbourhoodApplet, RangeKind } from "@neighbourhoods/client";

export async function fakeSeededEntryHash(happBytes: Uint8Array): Promise<EntryHash> {
  const sha = await crypto.subtle.digest("SHA-256", happBytes)
  return new Uint8Array([0x84, 0x21, 0x24, ...new Uint8Array(sha), ...new Uint8Array(4)])
}

export function removeResourceNameDuplicates(collection: Array<{resource_name: string} & any>) {
  const uniques = collection.map(item => [item!.resource_name, collection.find(el => el.resource_name == item!.resource_name)]).reduce((coll, item) =>  {coll.set(item[0], item[1]); return coll;}, new Map())
  return [...uniques.values()]
}

export function rangeKindEqual(rk1: RangeKind, rk2: RangeKind) {
  return (
    Object.keys(rk1)[0] == Object.keys(rk2)[0] && // Number type
    Object.values(rk1)[0]!.min == Object.values(rk2)[0]!.min &&
    Object.values(rk1)[0]!.max == Object.values(rk2)[0]!.max
  );
}

export function rangeKind1CoversRangeKind2(rk1: RangeKind, rk2: RangeKind) {
  return (
    Object.keys(rk1)[0] == Object.keys(rk2)[0] && // Number type
    Object.values(rk1)[0]!.min <= Object.values(rk2)[0]!.min &&
    Object.values(rk1)[0]!.max >= Object.values(rk2)[0]!.max
  );
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
