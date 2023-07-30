import { pipe, toPromise } from "@holochain-open-dev/stores";
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

import { AppOpenViews } from "../layout/types.js";
import { AppletIframeProtocol, notifyTauri, signZomeCallTauri } from "../tauri.js";
import { WeStore } from "../we-store.js";
import { Applet, NotifiactionSettings, NotificationLevel, NotificationSettingsStorage, NotificationStorage, NotificationTimestamp } from "./types.js";
import { AppletHash, AppletId } from "../types.js";
import { AppletStore } from "./applet-store.js";

function getAppletIdFromOrigin(
  appletIframeProtocol: AppletIframeProtocol,
  origin: string
): string {
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
        const iframeConfig: IframeConfig = {
          type: "not-installed",
          appletName: lowerCaseAppletId,
        };
        message.ports[0].postMessage({ type: "success", result: iframeConfig });
        throw new Error(`Requested applet is not installed`);
      }

      const result = await handleAppletIframeMessage(
        weStore,
        openViews,
        appletId,
        message.data.request
      );
      message.ports[0].postMessage({ type: "success", result });
    } catch (e) {
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
        appletId: location.dnaLocation.appletHash,
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
      const applet = await toPromise(weStore.applets.get(appletHash));
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
    async notify(message: WeNotification) {
      console.error("notify is not implemented on headless WeServices.");
    },
    attachmentTypes: new HoloHashMap<DnaHash, Record<string, AttachmentType>>(),
    openViews: {
      openAppletMain: () => {},
      openCrossAppletMain: () => {},
      openHrl: () => {},
      openCrossAppletBlock: () => {},
      openAppletBlock: () => {},
    },
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
  switch (message.type) {
    case "get-iframe-config":
      const isInstalled = await toPromise(
        weStore.appletBundlesStore.isInstalled.get(appletHash)
      );
      const applet = await toPromise(weStore.applets.get(appletHash));

      if (!isInstalled) {
        const iframeConfig: IframeConfig = {
          type: "not-installed",
          appletName: applet.applet.custom_name,
        };
        return iframeConfig;
      }

      const crossApplet = message.crossApplet;
      if (crossApplet) {
        const applets = await toPromise(
          weStore.appletsForBundleHash.get(applet.applet.appstore_app_hash)
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
          return openViews.openAppletMain(message.request.appletId);
        case "applet-block":
          return openViews.openAppletBlock(
            message.request.appletId,
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
    case "search":
      return services.search(message.filter);
    case "notify":
      const appletId = encodeHashToBase64(appletHash);

      // add notification to localStorage (pre-filtered by urgency level for efficiency)
      const notificationStorageJson = window.localStorage.getItem("notifications");
      const notificationsStorage: NotificationStorage = notificationStorageJson
        ? JSON.parse(notificationStorageJson)
        : {};

      const appletNotifications: Record<NotificationLevel, Array<[WeNotification, NotificationTimestamp]>> = notificationsStorage[appletId] ?
        notificationsStorage[appletId] :
        { "low": [], "medium": [], "high": [] };

      switch (message.message.urgency) {
        case "low":
          if (appletNotifications.low) {
            appletNotifications.low.push([message.message, Date.now()])
          } else {
            appletNotifications["low"] = [[message.message, Date.now()]];
          }
          break;
        case "medium":
          if (appletNotifications.medium) {
            appletNotifications.medium.push([message.message, Date.now()])
          } else {
            appletNotifications["medium"] = [[message.message, Date.now()]]
          }
          break;
        case "high":
          if (appletNotifications.low) {
            appletNotifications.high.push([message.message, Date.now()])
          } else {
            appletNotifications["high"] = [[message.message, Date.now()]];
          }
          break;
      }

      notificationsStorage[appletId] = appletNotifications;
      window.localStorage.setItem("notifications", JSON.stringify(notificationsStorage));


      // send notification to tauri for systray dot and/or OS notification
      const notificationSettingsJson = window.localStorage.getItem("notificationSettings");
      const notificationSettings: NotificationSettingsStorage = notificationSettingsJson
        ? JSON.parse(notificationSettingsJson)
        : {};

      const appletNotificationSettings: NotifiactionSettings = notificationSettings[appletId]
        ? notificationSettings[appletId]
        : {
          allowOSNotification: true,
          showInSystray: true,
          showInGroupSidebar: true,
          showInAppletSidebar: true,
          showInGroupHomeFeed: true,
        };

      let appletStore: AppletStore | undefined;
      try {
        appletStore = await toPromise(weStore.applets.get(appletHash));
      } catch (e) {
        console.warn("Failed to fetch applet icon in notification hook: ", (e as any).toString());
      }

      // TODO implement sending the Applet Icon to tauri for display in the notification
      await notifyTauri(
        message.message,
        appletNotificationSettings.showInSystray,
        appletNotificationSettings.allowOSNotification,
        // appletStore ? encodeHashToBase64(appletStore.applet.appstore_app_hash) : undefined,
        appletStore ? appletStore.applet.custom_name : undefined
      );
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
          weStore.applets.get(message.request.appletId),
          (appletStore) => appletStore!.host
        )
      );

      return host.createAttachment(
        message.request.attachmentType,
        message.request.attachToHrl
      );
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
