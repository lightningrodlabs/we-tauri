// TODO: add globally available interfaces for your elements

import { AgentPubKeyB64, HeaderHashB64, EntryHashB64, DnaHashB64 } from "@holochain-open-dev/core-types";
import { createContext, Context } from "@lit-labs/context";
import { WeStore } from "./we.store";

export const weContext : Context<WeStore> = createContext('hc_zome_we/service');

export type Dictionary<T> = { [key: string]: T };

export interface GameInfo {
  entry: GameEntry,
  hash: HeaderHashB64;
  author: AgentPubKeyB64,
}

export interface GameEntry {
  name: string;
  dna_hash: DnaHashB64;
  ui_url: String;
  meta?: Dictionary<string>;
}

export type Signal =
  | {
    gameHash: EntryHashB64, message: {type: "NewGame", content:  GameEntry}
  }
