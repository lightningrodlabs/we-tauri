import { get, pipe, toPromise } from "@holochain-open-dev/stores";
import {
  AppletToParentMessage,
  AppletToParentRequest,
  BlockType,
  HrlLocation,
  IframeConfig,
  InternalAttachmentType,
  ParentToAppletRequest,
} from "applet-messages";
import {
  AppletInfo,
  AttachmentType,
  EntryInfo,
  EntryLocationAndInfo,
  Hrl,
  HrlWithContext,
  WeNotification,
  WeServices,
} from "@lightningrodlabs/we-applet";
import { DnaHash, encodeHashToBase64, EntryHash } from "@holochain/client";
import { HoloHashMap } from "@holochain-open-dev/utils";
import { appWindow } from "@tauri-apps/api/window";

import { AppOpenViews } from "../layout/types.js";
import { AppletIframeProtocol, notifyTauri, signZomeCallTauri } from "../tauri.js";
import { WeStore } from "../we-store.js";
import { AppletNotificationSettings } from "./types.js";
import { AppletHash, AppletId } from "../types.js";
import { getAppletNotificationSettings, getNotificationState, storeAppletNotifications, validateNotifications } from "../utils.js";
import { AppletStore } from "./applet-store.js";

function getAppletIdFromOrigin(
  appletIframeProtocol: AppletIframeProtocol,
  origin: string
): AppletId {
  if (appletIframeProtocol === AppletIframeProtocol.Assets) {
    return origin.split("://")[1].split("?")[0].split("/")[0];
  } else {
    return origin.split("://")[1].split("?")[0].split(".")[0];
  }
}

export async function setupAppletMessageHandler(
  weStore: WeStore,
  openViews: AppOpenViews
) {
  window.addEventListener("message", async (message) => {
    try {
      const lowerCaseAppletId = getAppletIdFromOrigin(
        weStore.conductorInfo.applet_iframe_protocol,
        message.origin
      );
      const installedApplets = await toPromise(
        weStore.appletBundlesStore.installedApplets
      );
      const appletId = installedApplets.find(
        (a) => encodeHashToBase64(a).toLowerCase() === lowerCaseAppletId
      );

      if (!appletId) {
        console.log("applet Id not found. installedApplets: ", installedApplets.map((hash) => encodeHashToBase64(hash)), "lowercaseAppletId: ", lowerCaseAppletId);
        const iframeConfig: IframeConfig = {
          type: "not-installed",
          appletName: lowerCaseAppletId,
        };
        message.ports[0].postMessage({ type: "success", result: iframeConfig });
        // throw new Error(`Requested applet is not installed`);
        console.warn("Got a message from an applet that's not installed.");
        return;
      }

      const result = await handleAppletIframeMessage(
        weStore,
        openViews,
        appletId,
        message.data.request
      );
      message.ports[0].postMessage({ type: "success", result });
    } catch (e) {
      console.error("Error while handling applet iframe message. Error: ", e, "Message: ", message);
      console.log("appletId: ", encodeHashToBase64(message.data.appletHash));
      message.ports[0].postMessage({ type: "error", error: (e as any).message });
    }
  });
}

export function buildHeadlessWeServices(weStore: WeStore): WeServices {
  return {
    async entryInfo(hrl: Hrl) {
      const dnaHash = hrl[0];

      const location = await toPromise(
        weStore.hrlLocations.get(dnaHash).get(hrl[1])
      );

      if (!location) return undefined;

      const entryInfo = await toPromise(
        weStore.entryInfo.get(hrl[0]).get(hrl[1])
      );

      if (!entryInfo) return undefined;

      const entryAndAppletInfo: EntryLocationAndInfo = {
        appletHash: location.dnaLocation.appletHash,
        entryInfo,
      };

      return entryAndAppletInfo;
    },
    async groupProfile(groupId: DnaHash) {
      const groupProfile = await toPromise(
        pipe(
          weStore.groups.get(groupId),
          (groupStore) => groupStore.groupProfile
        )
      );

      return groupProfile;
    },
    async appletInfo(appletHash: AppletHash) {
      const applet = await toPromise(weStore.appletStores.get(appletHash));
      if (!applet) return undefined;
      const groupsForApplet = await toPromise(
        weStore.groupsForApplet.get(appletHash)
      );

      return {
        appletBundleId: applet.applet.appstore_app_hash,
        appletName: applet.applet.custom_name,
        groupsIds: Array.from(groupsForApplet.keys()),
      } as AppletInfo;
    },
    async search(filter: string) {
      const hosts = await toPromise(weStore.allAppletsHosts);

      const promises: Array<Promise<Array<HrlWithContext>>> = [];

      for (const host of Array.from(hosts.values())) {
        promises.push(
          (async () => {
            try {
              const results = await host.search(filter);
              return results;
            } catch (e) {
              console.warn(e);
              return [];
            }
          })()
        );
      }

      const hrlsWithApplets = await Promise.all(promises);
      const hrls = ([] as Array<HrlWithContext>)
        .concat(
          ...(hrlsWithApplets.filter((h) => !!h) as Array<
            Array<HrlWithContext>
          >)
        )
        .filter((h) => !!h);
      return hrls;
    },
    async notifyWe(notifications: Array<WeNotification>) {
      throw new Error("notify is not implemented on headless WeServices.");
    },
    attachmentTypes: new HoloHashMap<DnaHash, Record<string, AttachmentType>>(),
    openViews: {
      openAppletMain: () => {},
      openCrossAppletMain: () => {},
      openHrl: () => {},
      openCrossAppletBlock: () => {},
      openAppletBlock: () => {},
    },
    async userSelectHrl() {
      throw new Error("userSelectHrl is not supported in headless WeServices.")
    },
    async hrlToClipboard(hrl: HrlWithContext): Promise<void> {
      weStore.hrlToClipboard(hrl);
    }
  };
}

export async function handleAppletIframeMessage(
  weStore: WeStore,
  openViews: AppOpenViews,
  appletHash: EntryHash,
  message: AppletToParentRequest
) {
  let host: AppletHost;
  const services = buildHeadlessWeServices(weStore);

  const appletLocalStorageKey = `appletLocalStorage#${encodeHashToBase64(appletHash)}`;

  switch (message.type) {
    case "get-iframe-config":
      const isInstalled = await toPromise(
        weStore.appletBundlesStore.isInstalled.get(appletHash)
      );

      const appletStore = await toPromise(weStore.appletStores.get(appletHash));

      if (!isInstalled) {
        const iframeConfig: IframeConfig = {
          type: "not-installed",
          appletName: appletStore.applet.custom_name,
        };
        return iframeConfig;
      }

      const crossApplet = message.crossApplet;
      if (crossApplet) {
        const applets = await toPromise(
          weStore.appletsForBundleHash.get(appletStore.applet.appstore_app_hash)
        );
        const config: IframeConfig = {
          type: "cross-applet",
          appPort: weStore.conductorInfo.app_port,
          applets,
        };
        return config;
      } else {
        const groupsStores = await toPromise(
          weStore.groupsForApplet.get(appletHash)
        );

        // TODO: change this when personas and profiles is integrated
        const groupStore = Array.from(groupsStores.values())[0];
        const config: IframeConfig = {
          type: "applet",
          appletHash,
          appPort: weStore.conductorInfo.app_port,
          profilesLocation: {
            profilesAppId: groupStore.groupClient.appAgentClient.installedAppId,
            profilesRoleName: "group",
          },
        };
        return config;
      }
    case "get-hrl-location":
      const location0 = await toPromise(
        weStore.hrlLocations.get(message.hrl[0]).get(message.hrl[1])
      );
      if (!location0) throw new Error("Hrl not found");

      const hrlLocation: HrlLocation = {
        roleName: location0.dnaLocation.roleName,
        integrityZomeName: location0.entryDefLocation.integrity_zome,
        entryType: location0.entryDefLocation.entry_def,
      };
      return hrlLocation;
    case "open-view":
      switch (message.request.type) {
        case "applet-main":
          return openViews.openAppletMain(message.request.appletHash);
        case "applet-block":
          return openViews.openAppletBlock(
            message.request.appletHash,
            message.request.block,
            message.request.context
          );
        case "cross-applet-main":
          return openViews.openCrossAppletMain(message.request.appletBundleId);
        case "cross-applet-block":
          return openViews.openCrossAppletBlock(
            message.request.appletBundleId,
            message.request.block,
            message.request.context
          );
        case "hrl":
          return openViews.openHrl(
            message.request.hrl,
            message.request.context
          );
      }
      break;
    case "hrl-to-clipboard":
      weStore.hrlToClipboard(message.hrl);
      break;
    case "search":
      return services.search(message.filter);
    case "user-select-hrl":
      return openViews.userSelectHrl();
    case "toggle-clipboard":
      return openViews.toggleClipboard();
    case "notify-we":
      const appletId: AppletId = encodeHashToBase64(appletHash);

      if (!message.notifications) {
        throw new Error(`Got notification message without notifications attribute: ${JSON.stringify(message)}`)
      }

      const appletStore2 = await toPromise(weStore.appletStores.get(appletHash));

      // const mainWindowFocused = await isMainWindowFocused();
      const windowFocused = await appWindow.isFocused();
      const windowVisible = await appWindow.isVisible();

      // If the applet that the notification is coming from is already open, and the We main window
      // itself is also open, don't do anything
      const selectedAppletHash = get(weStore.selectedAppletHash());
      if (selectedAppletHash && selectedAppletHash.toString() === appletHash.toString() && windowFocused) {
        return;
      }

      // add notifications to unread messages and store them in the persisted notifications log
      const notifications: Array<WeNotification> = message.notifications;
      validateNotifications(notifications); // validate notifications to ensure not to corrupt localStorage
      const unreadNotifications = storeAppletNotifications(notifications, appletId);

      // update the notifications store
      appletStore2.setUnreadNotifications(getNotificationState(unreadNotifications));

      // trigger OS notification if allowed by the user and notification is fresh enough (less than 10 minutes old)
      const appletNotificationSettings: AppletNotificationSettings = getAppletNotificationSettings(appletId);

      await Promise.all(notifications.map(async (notification) => {
        // check whether it's actually a new event or not. Events older than 5 minutes won't trigger an OS notification
        // because it is assumed that they are emitted by the Applet UI upon startup of We and occurred while the
        // user was offline
        if ((Date.now() - notification.timestamp) < 300000) {
          console.log("notifying tauri");
          await notifyTauri(
            notification,
            appletNotificationSettings.showInSystray && !windowVisible,
            appletNotificationSettings.allowOSNotification && notification.urgency === "high",
            // appletStore ? encodeHashToBase64(appletStore.applet.appstore_app_hash) : undefined,
            appletStore ? appletStore.applet.custom_name : undefined
          );
        }
      }))
      return;
    case "get-applet-info":
      return services.appletInfo(message.appletHash);
    case "get-group-profile":
      return services.groupProfile(message.groupId);
    case "get-entry-info":
      return services.entryInfo(message.hrl);
    case "get-attachment-types":
      return toPromise(weStore.allAttachmentTypes);
    case "sign-zome-call":
      return signZomeCallTauri(message.request);
    case "create-attachment":
      host = await toPromise(
        pipe(
          weStore.appletStores.get(message.request.appletHash),
          (appletStore) => appletStore!.host
        )
      );
      return host.createAttachment(
        message.request.attachmentType,
        message.request.attachToHrl
      );
    case "localStorage.setItem":
      const appletLocalStorageJson: string | null = window.localStorage.getItem(appletLocalStorageKey);
      const appletLocalStorage: Record<string, string> = appletLocalStorageJson ? JSON.parse(appletLocalStorageJson) : {};
      appletLocalStorage[message.key] = message.value;
      window.localStorage.setItem(appletLocalStorageKey, JSON.stringify(appletLocalStorage));
      break
    case "localStorage.removeItem":
      const appletLocalStorageJson2: string | null = window.localStorage.getItem(appletLocalStorageKey);
      const appletLocalStorage2: Record<string, string> = appletLocalStorageJson2 ? JSON.parse(appletLocalStorageJson2) : undefined;
      if (appletLocalStorage2) {
        const filteredStorage = {};
        Object.keys(appletLocalStorage2).forEach((key) => {
          if (key !== message.key) {
            filteredStorage[key] = appletLocalStorage2[key]
          }
        })
        window.localStorage.setItem(appletLocalStorageKey, JSON.stringify(filteredStorage));
      }
      break
    case "localStorage.clear":
      window.localStorage.removeItem(`appletLocalStorage#${encodeHashToBase64(appletHash)}`);
      break
    case "get-localStorage":
      return window.localStorage.getItem(appletLocalStorageKey);
  }
}

export class AppletHost {
  constructor(public iframe: HTMLIFrameElement) {}

  async getEntryInfo(
    roleName: string,
    integrityZomeName: string,
    entryDefId: string,
    hrl: Hrl
  ): Promise<EntryInfo | undefined> {
    return this.postMessage({
      type: "get-entry-info",
      roleName,
      integrityZomeName,
      entryDefId,
      hrl,
    });
  }

  search(filter: string): Promise<Array<HrlWithContext>> {
    return this.postMessage({
      type: "search",
      filter,
    });
  }

  createAttachment(
    attachmentType: string,
    attachToHrl: Hrl
  ): Promise<HrlWithContext> {
    return this.postMessage({
      type: "create-attachment",
      attachmentType,
      attachToHrl,
    });
  }

  async getAttachmentTypes(): Promise<Record<string, InternalAttachmentType>> {
    return this.postMessage({
      type: "get-attachment-types",
    });
  }

  getBlocks(): Promise<Record<string, BlockType>> {
    return this.postMessage({
      type: "get-block-types",
    });
  }

  private async postMessage<T>(request: ParentToAppletRequest) {
    return new Promise<T>((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();

      this.iframe.contentWindow!.postMessage(request, "*", [port2]);

      port1.onmessage = (m) => {
        if (m.data.type === "success") {
          resolve(m.data.result);
        } else if (m.data.type === "error") {
          reject(m.data.error);
        }
      };
    });
  }
}
