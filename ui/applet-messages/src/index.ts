import {
  decodeHashFromBase64,
  encodeHashToBase64,
} from "@holochain/client";
import { Hrl, RenderView } from "@lightningrodlabs/we-applet";
import { encode } from "@msgpack/msgpack";
import { fromUint8Array } from "js-base64";



export function renderViewToQueryString(renderView: RenderView): string {

  let base = `view=${renderView.type}`;

  if (renderView.view) {
    console.log("### @renderViewToQUeryString");
    base = `view=${renderView.type}&view-type=${renderView.view.type}`;

    if ("block" in renderView.view) {
      base = `${base}&block=${renderView.view.block}`;
    }
    if ("hrl" in renderView.view) {
      base = `${base}&hrl=${stringifyHrl(renderView.view.hrl)}`;
    }
    if ("context" in renderView.view) {
      const b64context = fromUint8Array(encode(renderView.view.context), true);
      base = `${base}&context=${b64context}`;
    }
  }

  return base;
}

export function stringifyHrl(hrl: Hrl): string {
  return `hrl://${encodeHashToBase64(hrl[0])}/${encodeHashToBase64(hrl[1])}`;
}

