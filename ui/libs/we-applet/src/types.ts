import { Hrl } from "@lightningrodlabs/hrl";

export interface EntryInfo {
  name: string;
  icon_src: string;
}

export interface WeServices {
  openViews: OpenViews;
  info(hrl: Hrl): Promise<EntryInfo | undefined>;
}

export interface OpenViews {
  openGroupBlock(block: string, context: any): void;
  openCrossGroupBlock(block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
}
