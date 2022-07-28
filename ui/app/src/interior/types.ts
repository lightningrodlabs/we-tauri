import { AgentPubKey, DnaHash, EntryHash, InstalledAppId } from "@holochain/client";

export interface WeInfo {
  logo_src: string;
  name: string;
}

export interface Applet {
  name: string;
  description: string;
  logoSrc: string | undefined;

  devhubHappReleaseHash: EntryHash;
  guiFileHash: EntryHash;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
  uid: Record<string, string | undefined>; // Segmented by RoleId
  dnaHashes: Record<string, DnaHash>; // Segmented by RoleId
}

export interface RegisterAppletInput {
  appletAgentPubKey: AgentPubKey,
  applet: Applet,
}

export interface AppletInfo {
  title: string,
  subtitle: string,
  description: string,
  installedAppId?: InstalledAppId,
  entryHash: EntryHash,
  icon: IconSrcOption,
}

export interface PlayingApplet {
  applet: Applet;
  agentPubKey: AgentPubKey;
}

export type Signal = {
  appletHash: EntryHash;
  message: { type: "NewApplet"; content: Applet };
};


export type GuiFile = Uint8Array;

export type IconFileOption = Uint8Array | undefined;

export type IconSrcOption = string | undefined;