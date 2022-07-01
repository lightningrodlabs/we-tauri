import { IconFileOption, IconSrcOption } from "../interior/types";

export function toSrc(png: IconFileOption): IconSrcOption {

  if (png) {
    debugger
    const base64Data = btoa(String.fromCharCode.apply(null, [...png]))
    return "data:image/png;base64," + base64Data;
  }

  return undefined
}