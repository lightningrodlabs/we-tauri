import { Base64 } from "js-base64";
import { IconFileOption, IconSrcOption } from "../applets/types";

export function toSrc(png: IconFileOption): IconSrcOption {
  if (png) {
    const base64Data = Base64.fromUint8Array(png);
    return "data:image/png;base64," + base64Data;
  }

  return undefined;
}
