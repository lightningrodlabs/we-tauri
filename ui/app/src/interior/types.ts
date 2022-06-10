import { AgentPubKeyB64, DnaHashB64, EntryHashB64 } from "@holochain-open-dev/core-types";
import { EntryHash, InstalledAppId } from "@holochain/client";

export interface WeInfo {
  logo_src: string;
  name: string;
}

export interface Game {
  name: string;
  description: string;
  logoSrc: string | undefined;

  devhubHappReleaseHash: EntryHashB64;
  guiFileHash: EntryHashB64;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
  uid: Record<string, string | undefined>; // Segmented by RoleId
  dnaHashes: Record<string, DnaHashB64>; // Segmented by RoleId
}

export interface GameInfo {
  title: string,
  subtitle: string,
  description: string,
  installedAppId?: InstalledAppId,
  entryHash: EntryHash,
  icon: string | undefined,
}

export interface PlayingGame {
  game: Game;
  agentPubKey: AgentPubKeyB64;
}

export type Signal = {
  gameHash: EntryHashB64;
  message: { type: "NewGame"; content: Game };
};
