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
import { EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { EntryRecord } from "@holochain-open-dev/utils";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { GroupView, RenderView } from "applet-messages";

import { groupStoreContext } from "../../groups/context.js";
import { weStyles } from "../../shared-styles.js";
import "./view-frame.js";
import { Applet } from "../../groups/types.js";
import { appletAppIdFromApplet, GroupStore } from "../../groups/group-store.js";
import { mdiInformationOutline } from "@mdi/js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";

@localized()
@customElement("group-view")
export class GroupViewEl extends LitElement {
  @property()
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @state()
  installing = false;

  @property()
  view!: GroupView;

  _applet = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.groupProfile,
        this.groupStore.applets.get(this.appletHash),
        this.groupStore.isInstalled.get(this.appletHash),
      ]) as AsyncReadable<[GroupProfile, EntryRecord<Applet>, boolean]>,
    () => [this.groupStore, this.appletHash]
  );

  renderAppletFrame([groupProfile, applet, isInstalled]: [
    GroupProfile,
    EntryRecord<Applet>,
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
                    await this.groupStore.installApplet(this.appletHash);
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

    const appletInstalledAppId = appletAppIdFromApplet(applet.entry);

    const renderView: RenderView = {
      type: "group-view",
      groupProfile,
      groupId: this.groupStore.groupDnaHash,
      appletId: this.appletHash,
      appletInstalledAppId,
      profilesAppId: this.weStore.conductorInfo.we_app_id,
      profilesRoleName: this.groupStore.roleName,
      view: this.view,
    };
    return html`
      <view-frame
        .renderView=${renderView}
        .appletInstalledAppId=${appletInstalledAppId}
        .groupDnaHash=${this.groupStore.groupDnaHash}
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
