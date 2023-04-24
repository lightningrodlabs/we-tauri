import { DnaHash, EntryHash } from "@holochain/client";
import { Hrl } from "@lightningrodlabs/hrl";

export interface AppOpenViews {
  openGroupBlock(
    groupDnaHash: DnaHash,
    appletInstanceHash: EntryHash,
    block: string
  ): void;
  openCrossGroupBlock(devhubAppReleaseHash: EntryHash, block: string): void;
  openHrl(hrl: Hrl, context: any): void;
}
