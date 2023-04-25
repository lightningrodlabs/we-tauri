import {
  hashProperty,
  notifyError,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
  toPromise,
} from "@holochain-open-dev/stores";
import { AppAgentClient, EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Hrl, OpenViews, WeServices } from "@lightningrodlabs/we-applet";
import { EntryRecord } from "@holochain-open-dev/utils";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import {
  AppletToParentRequest,
  GroupView,
  ParentToIframeMessage,
  RenderView,
} from "applet-messages";

import { groupStoreContext } from "../../groups/context.js";
import { weStyles } from "../../shared-styles.js";
import "./view-frame.js";
import { AppletInstance, GroupInfo } from "../../groups/types.js";
import { AppOpenViews } from "../types.js";
import { openViewsContext } from "../context.js";
import { GroupStore } from "../../groups/group-store.js";
import { mdiInformationOutline } from "@mdi/js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { signZomeCallTauri } from "../../tauri.js";

@localized()
@customElement("group-view")
export class GroupViewEl extends LitElement {
  @property()
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  @state()
  installing = false;

  @property()
  view!: GroupView;

  @consume({ context: openViewsContext, subscribe: true })
  openViews!: AppOpenViews;

  _appletClient = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.groupInfo,
        this.groupStore.appletClient.get(this.appletInstanceHash),
        this.groupStore.applets.get(this.appletInstanceHash),
        this.groupStore.isInstalled.get(this.appletInstanceHash),
      ]) as AsyncReadable<
        [GroupInfo, AppAgentClient, EntryRecord<AppletInstance>, boolean]
      >,
    () => [this.groupStore, this.appletInstanceHash]
  );

  async handleMessage(
    appletInstance: EntryRecord<AppletInstance>,
    message: AppletToParentRequest
  ) {
    switch (message.type) {
      case "open-view":
        switch (message.request.type) {
          case "group-block":
            return this.openViews.openGroupBlock(
              this.groupStore.groupDnaHash,
              this.appletInstanceHash,
              message.request.block,
              message.request.context
            );
          case "cross-group-block":
            return this.openViews.openCrossGroupBlock(
              appletInstance.entry.devhub_happ_release_hash,
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

        const groupStore = await toPromise(
          this.weStore.groups.get(dnaLocation.groupDnaHash)
        );
        const worker = await toPromise(
          groupStore.appletWorker.get(dnaLocation.appletInstanceHash)
        );

        break;
      case "sign-zome-call":
        return signZomeCallTauri(message.request);
    }
  }

  renderAppletFrame([groupInfo, client, appletInstance, isInstalled]: [
    GroupInfo,
    AppAgentClient,
    EntryRecord<AppletInstance>,
    boolean
  ]) {
    if (!isInstalled) {
      return html`
        <div class="row center-content" style="flex: 1">
          <sl-card
            ><div class="column center-content">
              <sl-icon
                .src=${wrapPathInSvg(mdiInformationOutline)}
                style="font-size: 64px; margin-bottom: 16px"
              ></sl-icon>
              <span style="margin-bottom: 4px"
                >${msg("You don't have this applet installed yet.")}</span
              >
              <span style="margin-bottom: 16px"
                >${msg("Install it if you want to see this view.")}</span
              >
              <sl-button
                variant="primary"
                .loading=${this.installing}
                @click=${async () => {
                  this.installing = true;
                  try {
                    await this.groupStore.installAppletInstance(
                      this.appletInstanceHash
                    );
                    await this.groupStore.installedApps.reload();
                  } catch (e) {
                    notifyError(msg("Couldn't install applet"));
                    console.error(e);
                  }
                  this.installing = false;
                }}
                >${msg("Install Applet")}</sl-button
              >
            </div></sl-card
          >
        </div>
      `;
    }

    const appletId = this.groupStore.appletAppIdFromAppletInstance(
      appletInstance.entry
    );
    return html`
      <view-frame
        .renderView=${{
          type: "group-view",
          info: {
            appletId,
            profilesAppId: this.weStore.appId,
            profilesRoleName: this.groupStore.roleName,
          },
          view: this.view,
        } as RenderView}
        .appletId=${appletId}
        style="flex: 1"
        .messageHandler=${(request: AppletToParentRequest) =>
          this.handleMessage(appletInstance, request)}
      ></view-frame>
    `;
  }
  render() {
    switch (this._appletClient.value?.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error initializing the client for this group")}
          .error=${this._appletClient.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderAppletFrame(this._appletClient.value.value);
    }
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
