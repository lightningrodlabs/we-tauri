import {
  AgentPubKeyB64,
  HeaderHashB64,
  EntryHashB64,
  DnaHashB64,
} from "@holochain-open-dev/core-types";

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
  logo_url: string;
  meta?: Record<string, string>;
}

export type Signal = {
  gameHash: EntryHashB64;
  message: { type: "NewGame"; content: GameEntry };
};
