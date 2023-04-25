import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import {
  AppletToParentRequest,
  ParentToIframeMessage,
  RenderView,
} from "applet-messages";
import { weStyles } from "../../shared-styles.js";
import { getConductorInfo, signZomeCallTauri } from "../../tauri.js";
import { consume } from "@lit-labs/context";
import { AppOpenViews } from "../types.js";
import { openViewsContext } from "../context.js";
import { toPromise } from "@holochain-open-dev/stores";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @property()
  appletInstalledAppId!: string;

  @query("#view-frame")
  iframe!: HTMLIFrameElement;

  @property()
  renderView!: RenderView;

  @consume({ context: openViewsContext, subscribe: true })
  openViews!: AppOpenViews;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  async onLoad() {
    const info = await getConductorInfo();

    const { port1, port2 } = new MessageChannel();

    this.iframe.contentWindow!.postMessage(
      {
        message: this.renderView,
        appPort: info.app_port,
      } as ParentToIframeMessage,
      `applet://${this.appletInstalledAppId}`,
      [port2]
    );
    const childWindow = this.iframe.contentWindow!;
    window.addEventListener("message", async (message) => {
      if (message.source === childWindow) {
        const result = await this.handleMessage(message.data);
        message.ports[0].postMessage(result);
      }
    });
  }

  async handleMessage(message: AppletToParentRequest) {
    switch (message.type) {
      case "open-view":
        switch (message.request.type) {
          case "group-block":
            return this.openViews.openGroupBlock(
              message.request.groupId,
              message.request.appletInstanceId,
              message.request.block,
              message.request.context
            );
          case "cross-group-block":
            return this.openViews.openCrossGroupBlock(
              message.request.appletId,
              message.request.block,
              message.request.context
            );
          case "hrl":
            return this.openViews.openHrl(
              message.request.hrl,
              message.request.context
            );
        }

      case "get-info":
        const dnaHash = message.hrl[0];

        const dnaLocation = await toPromise(
          this.weStore.dnaLocations.get(dnaHash)
        );
        const hrlLocation = await toPromise(
          this.weStore.hrlLocations.get(dnaHash).get(message.hrl[1])
        );

        if (!hrlLocation) return undefined;

        let groupStore = await toPromise(
          this.weStore.groups.get(dnaLocation.groupDnaHash)
        );
        let worker = await toPromise(
          groupStore.appletWorker.get(dnaLocation.appletInstanceHash)
        );

        return worker.info(
          dnaLocation.roleName,
          hrlLocation.integrity_zome,
          hrlLocation.entry_def,
          message.hrl
        );
      case "sign-zome-call":
        return signZomeCallTauri(message.request);
      case "create-attachment":
        groupStore = await toPromise(
          this.weStore.groups.get(message.request.groupId)
        );
        worker = await toPromise(
          groupStore.appletWorker.get(message.request.appletInstanceId)
        );

        return worker.createAttachment(
          message.request.attachmentType,
          message.request.attachToHrl
        );
    }
  }

  render() {
    return html`<iframe
      id="view-frame"
      src="applet://${this.appletInstalledAppId}"
      @load=${() => this.onLoad()}
      style="flex: 1"
    ></iframe>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
    `,
    weStyles,
  ];
}
