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
  private constructor(
    public appletInstalledAppId: string,
    public groupDnaHash: DnaHash,
    public appletInstanceHash: EntryHash,
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

  static async connect(
    appletInstalledAppId: string,
    groupDnaHash: DnaHash,
    appletInstanceHash: EntryHash,
    iframe: HTMLIFrameElement,
    weStore: WeStore,
    openViews: AppOpenViews | undefined
  ): Promise<AppletHost> {
    return new Promise((resolve) => {
      iframe.onload = () => {
        resolve(
          new AppletHost(
            appletInstalledAppId,
            groupDnaHash,
            appletInstanceHash,
            iframe,
            weStore,
            openViews
          )
        );
      };
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
      appletInstanceId: this.appletInstanceHash,
      roleName,
      integrityZomeName,
      entryDefId,
      hrl,
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

      console.log(message, "asdf");
      this.iframe.contentWindow!.postMessage(message, "*", [port2]);

      port1.onmessage = (m) => {
        console.log("result", m.data);
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
              message.request.appletInstanceId,
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

      case "get-entry-info":
        const dnaHash = message.hrl[0];

        const dnaLocation = await toPromise(
          this.weStore.dnaLocations.get(dnaHash)
        );
        const hrlLocation = await toPromise(
          this.weStore.hrlLocations.get(dnaHash).get(message.hrl[1])
        );

        if (!hrlLocation) return undefined;

        host = await toPromise(
          this.weStore.appletsHosts
            .get(dnaLocation.groupDnaHash)
            .get(dnaLocation.appletInstanceHash)
        );

        const entryInfo = await host.getEntryInfo(
          dnaLocation.roleName,
          hrlLocation.integrity_zome,
          hrlLocation.entry_def,
          message.hrl
        );

        if (!entryInfo) return undefined;

        const appletInstance = await toPromise(
          this.weStore.appletsInstancesByGroup
            .get(dnaLocation.groupDnaHash)
            .get(dnaLocation.appletInstanceHash)
        );

        if (!appletInstance) return undefined;

        const groupStore = await toPromise(
          this.weStore.groups.get(dnaLocation.groupDnaHash)
        );

        const groupProfile = await toPromise(groupStore.groupProfile);

        if (!groupProfile) return undefined;

        const entryAndAppletInfo: EntryLocationAndInfo = {
          groupId: dnaLocation.groupDnaHash,
          groupProfile,
          appletInstanceId: dnaLocation.appletInstanceHash,
          appletInstanceName: appletInstance.entry.custom_name,
          entryInfo,
        };

        return entryAndAppletInfo;
      case "sign-zome-call":
        return signZomeCallTauri(message.request);
      case "create-attachment":
        host = await toPromise(
          this.weStore.appletsHosts
            .get(message.request.groupId)
            .get(message.request.appletInstanceId)
        );

        return host.createAttachment(
          message.request.attachmentType,
          message.request.attachToHrl
        );
    }
  }
}
