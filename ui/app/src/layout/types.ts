import { DnaHash, EntryHash } from "@holochain/client";
import { Hrl } from "@lightningrodlabs/we-applet";

export interface AppOpenViews {
  openAppletBlock(appletHash: EntryHash, block: string, context: any): void;
  openCrossAppletBlock(
    appletBundleHash: EntryHash,
    block: string,
    context: any
  ): void;
  openHrl(hrl: Hrl, context: any): void;
}
