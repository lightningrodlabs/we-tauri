import {
  AsyncReadable,
  joinAsyncMap,
  pipe,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { localized, msg } from "@lit/localize";
import { DnaHash, encodeHashToBase64, EntryHash } from "@holochain/client";
import { slice } from "@holochain-open-dev/utils";
import {
  hashState,
  notifyError,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { mdiDelete, mdiExportVariant, mdiToyBrickPlus } from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";

import "./federate-applet-dialog.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import "../../elements/sidebar-button.js";
import { weStyles } from "../../shared-styles.js";
import { Applet } from "../../applets/types.js";

@localized()
@customElement("group-applets-settings")
export class GroupAppletsSettings extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  _groupApplets = new StoreSubscriber(
    this,
    () =>
      pipe(
        this._groupStore.allApplets,
        (allApplets) =>
          joinAsyncMap(
            slice(this._groupStore.applets, allApplets)
          ) as AsyncReadable<ReadonlyMap<EntryHash, Applet>>
      ),
    () => [this._groupStore]
  );

  @state(hashState())
  appletToUninstall: EntryHash | undefined;

  @state(hashState())
  appletToFederate: EntryHash | undefined;

  @state()
  uninstalling = false;

  async uninstallApplet(appletToUninstall: EntryHash) {
    this.uninstalling = true;
    try {
      await this._groupStore.uninstallApplet(appletToUninstall);
    } catch (e) {
      notifyError(msg("Error uninstalling applet."));
      console.error(e);
    }

    this.uninstalling = false;
  }

  renderUninstallDialog() {
    if (!this.appletToUninstall) return html``;

    return html`<sl-dialog
      .label=${msg("Uninstall Applet")}
      open
      @sl-request-close=${(e) => {
        if (this.uninstalling) {
          e.preventDefault();
        }
      }}
      @sl-hide=${() => {
        this.appletToUninstall = undefined;
      }}
    >
      <span>${msg("Do you want to uninstall this applet?")}</span>
      <sl-button
        slot="footer"
        @click=${() => {
          this.appletToUninstall = undefined;
        }}
        >${msg("Cancel")}</sl-button
      >
      <sl-button
        slot="footer"
        .loading=${this.uninstalling}
        variant="primary"
        @click=${() => this.uninstallApplet(this.appletToUninstall!)}
        >${msg("Uninstall")}</sl-button
      >
    </sl-dialog>`;
  }

  renderFederateDialog() {
    if (!this.appletToFederate) return html``;

    return html`<federate-applet-dialog
      @sl-hide=${() => {
        this.appletToFederate = undefined;
      }}
    ></federate-applet-dialog>`;
  }

  renderInstalledApplets(applets: ReadonlyMap<EntryHash, Applet>) {
    if (applets.size === 0)
      return html`
        <div class="row center-content" style="flex: 1">
          <span class="placeholder" style="margin: 24px"
            >${msg(
              "This group doesn't have any applets installed yet. Go to the applet library (the "
            )} <sl-icon .src=${wrapPathInSvg(mdiToyBrickPlus)}></sl-icon>${msg(
              " icon above) to install applets to this group."
            )}
          </span>
        </div>
      `;

    return html`
      ${this.renderUninstallDialog()} ${this.renderFederateDialog()}
      <div class="column" style="align-items:center">
        ${Array.from(applets.entries())
          .sort(([_, a], [__, b]) => a.custom_name.localeCompare(b.custom_name))
          .map(
            ([appletHash, applet]) =>
              html`
                <sl-card style="width: 600px">
                  <div class="row" style="flex: 1; align-items: center">
                    <img
                      style="width: 48px; height: 48px; border-radius: 50%; margin-right: 16px"
                      src="applet://${encodeHashToBase64(appletHash)}/icon.png"
                    />
                    <span style="flex: 1">${applet.custom_name}</span>

                    <sl-icon-button
                      .src=${wrapPathInSvg(mdiExportVariant)}
                      style="font-size: 2rem"
                      @click=${() => {
                        this.appletToFederate = appletHash;
                      }}
                    ></sl-icon-button>
                    <sl-icon-button
                      .src=${wrapPathInSvg(mdiDelete)}
                      style="font-size: 2rem"
                      @click=${() => {
                        this.appletToUninstall = appletHash;
                      }}
                    ></sl-icon-button>
                  </div>
                </sl-card>
              `
          )}
      </div>
    `;
  }

  render() {
    switch (this._groupApplets.value?.status) {
      case "pending":
        return html`<sl-skeleton
          style="height: 48px; width: 48px;"
        ></sl-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the applets installed in this group")}
          .error=${this._groupApplets.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderInstalledApplets(this._groupApplets.value.value);
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
      }
    `,
  ];
}
