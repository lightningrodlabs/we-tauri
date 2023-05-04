import {
  hashProperty,
  notifyError,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { DnaHash, EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { mdiAlertOutline, mdiInformationOutline } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { AppletView, RenderView } from "applet-messages";

import { weStyles } from "../../shared-styles.js";
import "./view-frame.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { Applet } from "../../applets/types.js";
import { GroupStore } from "../../groups/group-store.js";

@localized()
@customElement("applet-view")
export class AppletViewEl extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @state()
  installing = false;

  @property()
  view!: AppletView;

  _applet = new StoreSubscriber(
    this,
    () =>
      join([
        this.weStore.applets.get(this.appletHash),
        this.weStore.groupsForApplet.get(this.appletHash),
        this.weStore.appletBundlesStore.isInstalled.get(this.appletHash),
      ]) as AsyncReadable<
        [Applet | undefined, ReadonlyMap<DnaHash, GroupStore>, boolean]
      >,
    () => [this.appletHash]
  );

  renderAppletFrame([applet, groupsStores, isInstalled]: [
    Applet | undefined,
    ReadonlyMap<DnaHash, GroupStore>,
    boolean
  ]) {
    if (!applet)
      return html`
        <div class="row center-content" style="flex: 1">
          <sl-card
            ><div class="column center-content">
              <sl-icon
                .src=${wrapPathInSvg(mdiAlertOutline)}
                style="font-size: 64px; margin-bottom: 16px"
              ></sl-icon>
              <span style="margin-bottom: 4px"
                >${msg("Applet not found.")}</span
              >
              <span style="margin-bottom: 16px"
                >${msg(
                  "Join a group with this applet installed it if you want to see this view."
                )}</span
              >
            </div></sl-card
          >
        </div>
      `;

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
                    await this.weStore.appletBundlesStore.installApplet(
                      this.appletHash,
                      applet
                    );
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

    // TODO: change this when personas and profiles is integrated
    const groupStore = Array.from(groupsStores.values())[0];

    const renderView: RenderView = {
      type: "applet-view",
      appletId: this.appletHash,
      profilesLocation: {
        profilesAppId: this.weStore.conductorInfo.we_app_id,
        profilesRoleName: groupStore.roleName,
      },
      view: this.view,
    };
    return html`
      <view-frame
        .renderView=${renderView}
        .appletHash=${this.appletHash}
        style="flex: 1"
      ></view-frame>
    `;
  }

  render() {
    switch (this._applet.value?.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error initializing the client for this group")}
          .error=${this._applet.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderAppletFrame(this._applet.value.value);
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
