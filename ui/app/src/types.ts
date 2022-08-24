import { EntryHashB64 } from "@holochain-open-dev/core-types";
import { AgentPubKey, DnaHash, EntryHash, InstalledAppId } from "@holochain/client";


export enum DashboardMode {
  MainHome,
  WeGroupHome,
  AppletGroupInstanceRendering,
  AppletClassHome,
  AppletClassRendering,
}

/**
 * appletCentricNavigation lets you choose the applet *class* on the main panel and will only display the groups
 * that have this applet installed on the secondary panel (with the tooltip showing the name of the applet
 * *instance* in case of multiple applet instances of the same class in one group)
 *
 * groupCentricNavigation lets you choose the group on the main panel and will only display the
 * applet *instances* that are installed for this group on the secondary panel
 *
 * agnosticNavigation displays all the groups on one panel and all the applet *classes* on the other panel
 * --> can be used on the main home screen for example. Picking from the applet *classes* will throw you
 * into the appletCentricNavigation mode and picking a group will instead throw you in groupCentricNavigation mode.
 *
 */
export enum NavigationMode {
  AppletCentric,
  GroupCentric,
  Agnostic,
}


//
/**
 *
 * agentCentricRendering needs access to ?? agentStore maybe?
 *
 * groupCentricRendering needs access to profilesStore and peerStatusStore.
 *
 *
 */
export enum RenderingMode {
  AgentCentric,
  GroupCentric,
  Agnostic,
}


export interface Applet {
  customName: string; // name of the applet instance as chosen by the person adding it to the group,
  title: string; // title of the applet in the devhub
  description: string;
  logoSrc: string | undefined;

  devhubHappReleaseHash: EntryHash;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
  networkSeed: Record<string, string | undefined>; // Segmented by RoleId
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