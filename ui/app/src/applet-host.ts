import { pipe, toPromise } from "@holochain-open-dev/stores";
import { encodeHashToBase64, EntryHash } from "@holochain/client";
import {
  AppletToParentRequest,
  InternalAttachmentType,
  ParentToAppletMessage,
  ParentToAppletRequest,
  RenderView,
} from "applet-messages";
import {
  AppletInfo,
  EntryInfo,
  EntryLocationAndInfo,
  Hrl,
  HrlWithContext,
} from "@lightningrodlabs/we-applet";

import { AppOpenViews } from "./layout/types";
import { signZomeCallTauri } from "./tauri";
import { WeStore } from "./we-store";

export class AppletHost {
  constructor(
    public appletHash: EntryHash,
    public iframe: HTMLIFrameElement,
    public weStore: WeStore,
    public openViews: AppOpenViews | undefined
  ) {
    const childWindow = this.iframe.contentWindow!;
    window.addEventListener("message", async (message) => {
      if (message.source === childWindow) {
        try {
          const result = await this.handleMessage(message.data);
          message.ports[0].postMessage({ type: "success", result });
        } catch (e) {
          message.ports[0].postMessage({ type: "error", error: e });
        }
      }
    });
  }

  async renderView(renderView: RenderView) {
    const attachmentTypes = await toPromise(this.weStore.allAttachmentTypes);

    return this.postMessage({
      type: "render-view",
      message: renderView,
      attachmentTypes,
    });
  }

  async getEntryInfo(
    roleName: string,
    integrityZomeName: string,
    entryDefId: string,
    hrl: Hrl
  ): Promise<EntryInfo | undefined> {
    return this.postMessage({
      type: "get-entry-info",
      appletId: this.appletHash,
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

  getAttachmentTypes(): Promise<Record<string, InternalAttachmentType>> {
    return this.postMessage({
      type: "get-attachment-types",
    });
  }

  private async postMessage<T>(request: ParentToAppletRequest) {
    return new Promise<T>((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();

      const message: ParentToAppletMessage = {
        request,
        appletId: this.appletHash,
        appPort: this.weStore.conductorInfo.app_port,
      };

      this.iframe.contentWindow!.postMessage(message, "*", [port2]);

      port1.onmessage = (m) => {
        if (m.data.type === "success") {
          resolve(m.data.result);
        } else if (m.data.type === "error") {
          reject(m.data.error);
        }
      };
    });
  }

  async handleMessage(message: AppletToParentRequest) {
    let host: AppletHost;
    switch (message.type) {
      case "open-view":
        switch (message.request.type) {
          case "applet-block":
            return this.openViews?.openAppletBlock(
              message.request.appletId,
              message.request.block,
              message.request.context
            );
          case "cross-applet-block":
            return this.openViews?.openCrossAppletBlock(
              message.request.appletBundleId,
              message.request.block,
              message.request.context
            );
          case "hrl":
            return this.openViews?.openHrl(
              message.request.hrl,
              message.request.context
            );
        }

      case "search":
        const hosts = await toPromise(this.weStore.allAppletsHosts);

        const promises: Array<Promise<Array<HrlWithContext>>> = [];

        for (const host of Array.from(hosts.values())) {
          promises.push(
            (async function () {
              try {
                const results = await host.search(message.filter);
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
      case "get-applet-info":
        const applet = await toPromise(
          this.weStore.applets.get(message.appletId)
        );
        if (!applet) return undefined;
        const groupsForApplet = await toPromise(
          this.weStore.groupsForApplet.get(message.appletId)
        );

        return {
          appletBundleId: applet.applet.devhub_happ_release_hash,
          appletName: applet.applet.custom_name,
          groupsIds: Array.from(groupsForApplet.keys()),
        } as AppletInfo;
      case "get-group-profile":
        const groupProfile = await toPromise(
          pipe(
            this.weStore.groups.get(message.groupId),
            (groupStore) => groupStore.groupProfile
          )
        );

        return groupProfile;
      case "get-entry-info":
        const dnaHash = message.hrl[0];

        const location = await toPromise(
          this.weStore.hrlLocations.get(dnaHash).get(message.hrl[1])
        );

        if (!location) return undefined;

        const entryInfo = await toPromise(
          this.weStore.entryInfo.get(message.hrl[0]).get(message.hrl[1])
        );

        if (!entryInfo) return undefined;

        const entryAndAppletInfo: EntryLocationAndInfo = {
          appletId: location.dnaLocation.appletHash,
          entryInfo,
        };

        return entryAndAppletInfo;
      case "sign-zome-call":
        return signZomeCallTauri(message.request);
      case "create-attachment":
        host = await toPromise(
          pipe(
            this.weStore.applets.get(message.request.appletId),
            (appletStore) => appletStore!.host
          )
        );

        return host.createAttachment(
          message.request.attachmentType,
          message.request.attachToHrl
        );
    }
  }
}
