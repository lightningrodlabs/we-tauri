import { DnaHash, EntryHash } from "@holochain/client";
import { Hrl } from "@lightningrodlabs/hrl";

export interface AppOpenViews {
  openGroupBlock(
    groupDnaHash: DnaHash,
    appletInstanceHash: EntryHash,
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
