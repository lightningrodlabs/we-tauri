import {
  AgentPubKeyB64,
  EntryHashB64,
  DnaHashB64,
} from "@holochain-open-dev/core-types";
import { AgentPubKey, DnaHash, EntryHash, InstalledAppId } from "@holochain/client";


export type DashboardMode = "mainHome" | "appletClass" | "weGroup";


export interface WeInfo {
  logo_src: string;
  name: string;
}

export interface Applet {
  name: string;
  description: string;
  logoSrc: string | undefined;

  devhubHappReleaseHash: EntryHash;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
  uid: Record<string, string | undefined>; // Segmented by RoleId
  dnaHashes: Record<string, DnaHash>; // Segmented by RoleId
}

export interface AppletGui {
  devhubHappReleaseHash: EntryHash,
  gui: Uint8Array,
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
  devhubHappReleaseHash: EntryHash,
  icon: IconSrcOption,
}

export interface PlayingApplet {
  applet: Applet;
  agentPubKey: AgentPubKey;
}

export type Signal = {
  appletHash: EntryHashB64;
  message: { type: "NewApplet"; content: Applet };
};


export type GuiFile = Uint8Array;

export type IconFileOption = Uint8Array | undefined;

export type IconSrcOption = string | undefined;