import { AppBundle } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { decompressSync, unzipSync } from "fflate";

import { toSrc } from "../processes/import-logsrc-from-file.js";
import { GuiFile, IconFileOption, IconSrcOption } from "./types.js";

/**
 * Decompresses a webhapp
 *
 * @param compressedWebHapp: Uint8Array
 * @returns [AppBundle, GuiFile, IconSrcOption]
 */
export function decompressWebHapp(
  compressedWebHapp: Uint8Array
): [AppBundle, GuiFile, IconSrcOption] {
  // decompress bytearray into .happ and ui.zip (zlibt2)
  const bundle = decode(
    decompressSync(new Uint8Array(compressedWebHapp))
  ) as any;

  // find out format of this decompressed object (see /devhub-dnas/zomes/happ_library/src/packaging.rs --> get_webhapp_package())
  const webappManifest = bundle.manifest;
  const resources = bundle.resources;

  const compressedHapp = resources[webappManifest.happ_manifest.bundled];
  const decompressedHapp = decode(
    decompressSync(new Uint8Array(compressedHapp))
  ) as AppBundle;

  // decompress and etract index.js
  const compressedGui = resources[webappManifest.ui.bundled];
  const decompressedGuiMap = unzipSync(new Uint8Array(compressedGui)) as any;

  const decompressedGui = decompressedGuiMap["index.js"] as GuiFile;
  const decompressedIcon = decompressedGuiMap["icon.png"] as IconFileOption;
  const iconSrcOption: IconSrcOption = toSrc(decompressedIcon);
  return [decompressedHapp, decompressedGui, iconSrcOption];
}
