import { ProfilesClient } from "@holochain-open-dev/profiles";
import {
  AppAgentClient,
  ActionHash,
  EntryHash,
  DnaHash,
} from "@holochain/client";

export type Hrl = [DnaHash, ActionHash | EntryHash];

// Contextual reference to a Hrl
// Useful use case: image we want to point to a specific section of a document
// The document action hash would be the Hrl, and the context could be { section: "Second Paragraph" }
export interface HrlWithContext {
  hrl: Hrl;
  context: any;
}

export interface EntryInfo {
  name: string;
  icon_src: string;
}

export interface GroupProfile {
  name: string;
  logo_src: string;
}

export interface AttachmentType {
  label: string;
  icon_src: string;
  create: (attachToHrl: Hrl) => Promise<HrlWithContext>;
}

export interface WeNotification {
  /**
   * Title of the message.
   */
  title: string;
  /**
   * content of the notification
   */
  body: string;
  /**
   * type of notification, in a chat app e.g. "message" or "mention"
   */
  notification_type: string;
  /**
   * Icon for the message type.
   */
  icon_src: string | undefined;
  /**
   * urgency level "low" only shows up in the We UI when opened
   * urgency level "medium" shows up as a dot in the system tray icon
   * urgency level "high" additionally triggers an OS notification
   */
  urgency: "low" | "medium" | "high";
  /**
   * Timestamp **in milliseconds** of when the event that the notification is about
   * has occured.
   * Ideally the timestamp of the DHT Action associated to the notification.
   * It may be displayed by We in notification feeds and will be used to determine
   * whether an event is "fresh" or has occurred while the user was offline.
   * In the latter case, We will not show an OS notification for
   * that notification on startup of We.
   */
  timestamp: number;
  // /**
  //  * If not provided, We resets the notification count (used for
  //  * dots on applet icons and similar) for this message automatically when
  //  * the user opens the applet (default). Otherwise, the applet is assumed
  //  * to take care of clearing the notification count for this message via
  //  * use of resetNotificationCount() and based on applet-internal logic.
  //  * If handled improperly by the applet, this can lead to accumulation
  //  * of notifications and We will delete stale notifications after
  //  * a certain time period.
  //  */
  // customCountReset?: NotificationId;
}

export type NotificationId = string;

export interface NotificationCount {
  low: number,
  medium: number,
  high: number,
}

export interface OpenViews {
  openAppletMain(appletHash: EntryHash): void;
  openAppletBlock(appletHash: EntryHash, block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
  openCrossAppletMain(appletBundleId: ActionHash): void;
  openCrossAppletBlock(
    appletBundleId: ActionHash,
    block: string,
    context: any
  ): void;
}

export interface EntryLocationAndInfo {
  appletHash: EntryHash;
  entryInfo: EntryInfo;
}

export interface AppletInfo {
  appletBundleId: ActionHash;
  appletName: string;
  groupsIds: Array<DnaHash>;
}

export interface WeServices {
  openViews: OpenViews;
  attachmentTypes: ReadonlyMap<EntryHash, Record<string, AttachmentType>>; // Segmented by groupId

  groupProfile(groupId: DnaHash): Promise<GroupProfile | undefined>;
  appletInfo(appletHash: EntryHash): Promise<AppletInfo | undefined>;
  entryInfo(hrl: Hrl): Promise<EntryLocationAndInfo | undefined>;
  search(filter: string): Promise<Array<HrlWithContext>>;
  /**
   * Send notifications to We
   * @param notifications Array of notifications to send to We
   */
  notifyWe(notifications: Array<WeNotification>): Promise<void>;
  // /**
  //  * Clear notification indicators associated to this message
  //  * (e.g. notification dot on the applet icon in We)
  //  * Use this method, if you want to have internal logic on keeping
  //  * track of which events have been seen by the user.
  //  * We by default takes care of this by clearing all notification
  //  * dots of an applet upon opening the applet.
  //  *
  //  * @param notificationCount Either a specific notification Id or all
  //  */
  // clearNotification(notificationId: NotificationId | "all"): Promise<void>;
}

export type MainView = (rootElement: HTMLElement) => void;
export interface BlockView {
  label: string;
  icon_src: string;
  view: (rootElement: HTMLElement, context: any) => void;
}
export type EntryTypeView = (
  rootElement: HTMLElement,
  hrl: Hrl,
  context: any
) => void;

export interface ReferenceableEntryType {
  info: (hrl: Hrl) => Promise<EntryInfo | undefined>;
  view: EntryTypeView;
}

export interface AppletViews {
  main: MainView;
  blocks: Record<string, BlockView>; // all events -> schedule
  entries: Record<
    string,
    Record<string, Record<string, ReferenceableEntryType>>
  >; // Segmented by RoleName, integrity ZomeName and EntryType
}

export interface CrossAppletViews {
  main: MainView;
  blocks: Record<string, BlockView>;
}

export interface AppletClients {
  appletClient: AppAgentClient;
  profilesClient: ProfilesClient;
}

export interface WeApplet {
  appletViews: (
    client: AppAgentClient,
    appletHash: EntryHash,
    profilesClient: ProfilesClient,
    weServices: WeServices
  ) => Promise<AppletViews>;

  crossAppletViews: (
    applets: ReadonlyMap<EntryHash, AppletClients>,
    weServices: WeServices
  ) => Promise<CrossAppletViews>;

  attachmentTypes: (
    appletClient: AppAgentClient,
    appletHash: EntryHash,
    weServices: WeServices
  ) => Promise<Record<string, AttachmentType>>;

  search: (
    appletClient: AppAgentClient,
    appletHash: EntryHash,
    weServices: WeServices,
    searchFilter: string
  ) => Promise<Array<HrlWithContext>>;
}
