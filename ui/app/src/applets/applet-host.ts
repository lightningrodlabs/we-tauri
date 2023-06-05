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
  WeServices,
} from "@lightningrodlabs/we-applet";
import { DnaHash, EntryHash } from "@holochain/client";
import { HoloHashMap } from "@holochain-open-dev/utils";

import { AppOpenViews } from "../layout/types";
import { signZomeCallTauri } from "../tauri";
import { WeStore } from "../we-store";

export async function setupAppletMessageHandler(
  weStore: WeStore,
  openViews: AppOpenViews
) {
  window.addEventListener("message", async (message) => {
    try {
      const appletMessage: AppletToParentMessage = message.data;
      const appletId = appletMessage.appletId;

      const result = await handleAppletIframeMessage(
        weStore,
        openViews,
        appletId,
        appletMessage.request
      );
      message.ports[0].postMessage({ type: "success", result });
    } catch (e) {
      message.ports[0].postMessage({ type: "error", error: e });
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
    async appletInfo(appletId: EntryHash) {
      const applet = await toPromise(weStore.applets.get(appletId));
      if (!applet) return undefined;
      const groupsForApplet = await toPromise(
        weStore.groupsForApplet.get(appletId)
      );

      return {
        appletBundleId: applet.applet.devhub_happ_release_hash,
        appletName: applet.applet.custom_name,
        groupsIds: Array.from(groupsForApplet.keys()),
      } as AppletInfo;
    },
    async search(filter: string) {
      const hosts = await toPromise(weStore.allAppletsHosts);

      const promises: Array<Promise<Array<HrlWithContext>>> = [];

      for (const host of Array.from(hosts.values())) {
        promises.push(
          (async function () {
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
  appletId: EntryHash,
  message: AppletToParentRequest
) {
  let host: AppletHost;
  const services = buildHeadlessWeServices(weStore);
  switch (message.type) {
    case "get-iframe-config":
      const isInstalled = await toPromise(
        weStore.appletBundlesStore.isInstalled.get(appletId)
      );
      const applet = await toPromise(weStore.applets.get(appletId));

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
          weStore.appletsForBundleHash.get(
            applet.applet.devhub_happ_release_hash
          )
        );
        const config: IframeConfig = {
          type: "cross-applet",
          appPort: weStore.conductorInfo.app_port,
          applets,
        };
        return config;
      } else {
        const groupsStores = await toPromise(
          weStore.groupsForApplet.get(appletId)
        );

        // TODO: change this when personas and profiles is integrated
        const groupStore = Array.from(groupsStores.values())[0];
        const config: IframeConfig = {
          type: "applet",
          appletId,
          appPort: weStore.conductorInfo.app_port,
          profilesLocation: {
            profilesAppId: weStore.conductorInfo.we_app_id,
            profilesRoleName: groupStore.roleName,
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

    case "search":
      return services.search(message.filter);
    case "get-applet-info":
      return services.appletInfo(message.appletId);
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
