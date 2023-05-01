import { DnaHash, EntryHash } from "@holochain/client";
import { Hrl } from "@lightningrodlabs/we-applet";

export interface AppOpenViews {
  openGroupBlock(
    groupDnaHash: DnaHash,
    appletHash: EntryHash,
    block: string,
    context: any
  ): void;
  openCrossGroupBlock(
    devhubAppReleaseHash: EntryHash,
    block: string,
    context: any
  ): void;
  openHrl(hrl: Hrl, context: any): void;
}
