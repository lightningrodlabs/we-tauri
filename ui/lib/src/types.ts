// TODO: add globally available interfaces for your elements

import {
  AgentPubKeyB64,
  HeaderHashB64,
  EntryHashB64,
  DnaHashB64,
} from "@holochain-open-dev/core-types";

export type Dictionary<T> = { [key: string]: T };

export type Players = { [key: string]: Dictionary<string> };

export interface GameInfo {
  entry: GameEntry;
  hash: HeaderHashB64;
  author: AgentPubKeyB64;
}

export interface GameEntry {
  name: string;
  dna_hash: DnaHashB64;
  dna_file_hash: EntryHashB64;
  ui_file_hash: EntryHashB64;
  logo_url: String;
  meta?: Dictionary<string>;
}

export type Signal = {
  gameHash: EntryHashB64;
  message: { type: "NewGame"; content: GameEntry };
};

export const GEAR_ICON_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Gear_icon_svg.svg/560px-Gear_icon_svg.svg.png";
