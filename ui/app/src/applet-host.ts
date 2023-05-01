import { toPromise } from "@holochain-open-dev/stores";
import { EntryHash } from "@holochain/client";
import { DnaHash } from "@holochain/client";
import {
  AppletToParentRequest,
  InternalAttachmentType,
  ParentToAppletMessage,
  ParentToAppletRequest,
  RenderView,
} from "applet-messages";
import {
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
    public appletInstalledAppId: string,
    public groupDnaHash: DnaHash,
    public appletHash: EntryHash,
    public iframe: HTMLIFrameElement,
    public weStore: WeStore,
    public openViews: AppOpenViews | undefined
  ) {
    const childWindow = this.iframe.contentWindow!;
    window.addEventListener("message", async (message) => {
      if (message.source === childWindow) {
        const result = await this.handleMessage(message.data);
        message.ports[0].postMessage(result);
      }
    });
  }

  async renderView(renderView: RenderView) {
    const attachmentTypesByGroup = await toPromise(
      this.weStore.groupAttachmentTypes
    );
    return this.postMessage({
      type: "render-view",
      message: renderView,
      attachmentTypesByGroup,
    });
  }

  async getEntryInfo(
    roleName: string,
    integrityZomeName: string,
    entryDefId: string,
    hrl: Hrl
  ): Promise<EntryInfo | undefined> {
    const groupStore = await toPromise(
      this.weStore.groups.get(this.groupDnaHash)
    );
    const groupProfile = await toPromise(groupStore.groupProfile);

    return this.postMessage({
      type: "get-entry-info",
      groupId: this.groupDnaHash,
      groupProfile: groupProfile!,
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
    return new Promise<T>((resolve) => {
      const { port1, port2 } = new MessageChannel();

      const message: ParentToAppletMessage = {
        request,
        appletInstalledAppId: this.appletInstalledAppId,
        appPort: this.weStore.conductorInfo.app_port,
      };

      this.iframe.contentWindow!.postMessage(message, "*", [port2]);

      port1.onmessage = (m) => {
        resolve(m.data);
      };
    });
  }

  async handleMessage(message: AppletToParentRequest) {
    let host: AppletHost;
    switch (message.type) {
      case "open-view":
        switch (message.request.type) {
          case "group-block":
            return this.openViews?.openGroupBlock(
              message.request.groupId,
              message.request.appletId,
              message.request.block,
              message.request.context
            );
          case "cross-group-block":
            return this.openViews?.openCrossGroupBlock(
              message.request.appletId,
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

        for (const groupHosts of Array.from(hosts.values())) {
          for (const host of Array.from(groupHosts.values())) {
            promises.push(host.search(message.filter));
          }
        }

        const hrlsWithApplets = await Promise.all(promises);

        const hrls = ([] as Array<HrlWithContext>).concat(...hrlsWithApplets);

        return hrls;
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

        const applet = await toPromise(
          this.weStore.appletsInstancesByGroup
            .get(location.dnaLocation.groupDnaHash)
            .get(location.dnaLocation.appletHash)
        );

        if (!applet) return undefined;

        const groupStore = await toPromise(
          this.weStore.groups.get(location.dnaLocation.groupDnaHash)
        );

        const groupProfile = await toPromise(groupStore.groupProfile);

        if (!groupProfile) return undefined;

        const entryAndAppletInfo: EntryLocationAndInfo = {
          groupId: location.dnaLocation.groupDnaHash,
          groupProfile,
          appletId: location.dnaLocation.appletHash,
          appletName: applet.entry.custom_name,
          entryInfo,
        };

        return entryAndAppletInfo;
      case "sign-zome-call":
        return signZomeCallTauri(message.request);
      case "create-attachment":
        host = await toPromise(
          this.weStore.appletsHosts
            .get(message.request.groupId)
            .get(message.request.appletId)
        );

        return host.createAttachment(
          message.request.attachmentType,
          message.request.attachToHrl
        );
    }
  }
}
