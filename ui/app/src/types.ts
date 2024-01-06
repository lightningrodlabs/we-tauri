import { PeerStatusStore } from "@holochain-open-dev/peer-status";
import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AgentPubKey,
  DnaHash,
  EntryHash,
  InstalledAppId,
  EntryHashB64,
  AppAgentClient,
  AppAgentWebsocket,
  AppInfo,
  CellId
} from "@holochain/client";
import {
  SensemakerStore,
  NeighbourhoodInfo,
  NeighbourhoodAppletRenderers
} from "@neighbourhoods/client";

/**
 * The possible states of the dashboard
 */
export enum DashboardMode {
  MainHome,
  WeGroupHome,
  AssessmentsHome,
  AppletGroupInstanceRendering,
  AppletClassRendering,
  Loading,
  NHGlobalConfig,
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
  GroupCentric,
  Agnostic,
}

export type Applet = {
  customName: string; // name of the applet instance as chosen by the person adding it to the group,
  title: string; // title of the applet in the devhub
  description: string;
  logoSrc: string | undefined;

  devhubHappReleaseHash: EntryHash;
  devhubGuiReleaseHash: EntryHash;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
  networkSeed: Record<string, string | undefined>; // Segmented by RoleId
  dnaHashes: Record<string, DnaHash>; // Segmented by RoleId
}

export type AppletGui = {
  devhubHappReleaseHash: EntryHash,
  gui: Uint8Array,
}

export type RegisterAppletInput = {
  appletAgentPubKey: AgentPubKey,
  applet: Applet,
}

export type AppletMetaData = {
  title: string,
  subtitle: string | undefined,
  description: string,
  installedAppId?: InstalledAppId,
  devhubHappReleaseHash: EntryHash,
  devhubGuiReleaseHash: EntryHash,
  icon: IconSrcOption,
}

export type PlayingApplet = {
  applet: Applet;
  agentPubKey: AgentPubKey;
}

export type Signal = {
  appletHash: EntryHashB64;
  message: { type: "NewApplet"; content: Applet };
};

export type GuiFile = Uint8Array;

export type IconSrcOption = string | undefined;

export type SignalPayload = {
  applet_hash: EntryHash,
  message: Message,
  federated_groups: Array<DnaHash>
 };

export type Message = {
  type: "NewApplet",
  content: Applet,
};

/**
 * Data of a group
 */
export type WeGroupData = {
  info: WeGroupInfo;
  appAgentWebsocket: AppAgentWebsocket; // Each we group needs its own signal handler, i.e. its own AppAgentWebsocket object
  profilesStore: ProfilesStore;
  peerStatusStore: PeerStatusStore;
  sensemakerStore: SensemakerStore;
}

/**
 * Info of a group
 */
export type WeGroupInfo = {
  info: NeighbourhoodInfo;
  cell_id: CellId;
  dna_hash: DnaHash;
  cloneName: string;
  enabled: boolean;
}

type BaseAppletInstanceInfo = {
  appletId: EntryHash; // hash of the Applet entry in the applets zome of the group's we dna
  applet: Applet;
  federatedGroups: DnaHash[];
}

/**
 * Info about a specific instance of an installed Applet
 */
export type AppletInstanceInfo = BaseAppletInstanceInfo & {
  appInfo: AppInfo; // InstalledAppInfo
  appAgentWebsocket?: AppAgentClient;
  renderers?: NeighbourhoodAppletRenderers;
}

/**
 * 
 */
export type UninstalledAppletInstanceInfo = BaseAppletInstanceInfo

/**
 * Info about an Applet that was added to the We group by another agent and isn't installed locally yet.
 *
 * REASONING: This type is separated from the AppletInstanceInfo because it requires queries to the DHT to get new
 * applet instances while already installed applet instances can be efficiently queried from the
 * source chain. The matrix therefore only contains locally installed applets.
 */
export type NewAppletInstanceInfo = BaseAppletInstanceInfo
