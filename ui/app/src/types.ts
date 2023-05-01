import { DnaHash, EntryHash, InstalledAppId } from "@holochain/client";
import { IconSrcOption } from "./applet-bundles/types";

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

export interface AppletBundleMetadata {
  title: string;
  subtitle: string | undefined;
  description: string;
  installedAppId?: InstalledAppId;
  devhubHappReleaseHash: EntryHash;
  devhubGuiReleaseHash: EntryHash;
  icon: IconSrcOption;
}
