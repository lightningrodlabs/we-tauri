import { AppInfo, DnaHash, EntryHash, encodeHashToBase64 } from "@holochain/client";
import { hashProperty, wrapPathInSvg } from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";
import { mdiArchiveArrowDown, mdiArchiveArrowUp, mdiExportVariant } from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";

import { Applet } from "../../applets/types.js";
import { weStyles } from "../../shared-styles.js";
import { weStoreContext } from "../../context.js";
import { WeStore } from "../../we-store.js";
import { appIdFromAppletHash, dnaHashForCell, getProvisionedCells } from "../../utils.js";

@customElement("applet-detail-card")
export class AppletDetailCard extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @property()
  applet!: Applet;

  @property()
  appInfo: AppInfo | undefined;

  @property()
  federatedGroups!: ReadonlyMap<EntryHash, Array<DnaHash>>;

  @property()
  installationStatus: "installed" | "archived" = "installed"

  async firstUpdated() {
    this.appInfo = await this.weStore.appWebsocket.appInfo({ installed_app_id: appIdFromAppletHash(this.appletHash) })
  }

  render() {
    switch (this.installationStatus) {
      case "installed":
        return html`
          <sl-card style="flex: 1; margin-bottom: 16px; min-width: 800px;">
            <div class="column">
              <div class="row" style="flex: 1; align-items: center">
                <applet-logo
                  .appletHash=${this.appletHash}
                  style="margin-right: 16px"
                ></applet-logo>
                <span style="flex: 1">${this.applet.custom_name}</span>

                ${Array.from(this.federatedGroups.get(this.appletHash)!).map(
                  (groupDnaHash) => html`
                    <group-context .groupDnaHash=${groupDnaHash}>
                      <group-logo
                        style="margin-right: 8px; --size: 32px"
                      ></group-logo
                    ></group-context>
                  `
                )}

                <sl-tooltip .content=${msg("Federate")}>
                  <sl-icon-button
                    .src=${wrapPathInSvg(mdiExportVariant)}
                    style="font-size: 2rem"
                    @click=${() => {
                      this.dispatchEvent(new CustomEvent('federate-applet', {
                        detail: this.appletHash,
                        bubbles: true,
                      }));
                    }}
                    @keypress.enter=${() => {
                      this.dispatchEvent(new CustomEvent('federate-applet', {
                        detail: this.appletHash,
                        bubbles: true,
                      }));
                    }}
                  ></sl-icon-button>
                </sl-tooltip>
                <sl-tooltip .content=${msg("Archive")}>
                  <sl-icon-button
                    .src=${wrapPathInSvg(mdiArchiveArrowDown)}
                    style="font-size: 2rem;"
                    @click=${() => {
                      this.dispatchEvent(new CustomEvent('archive-applet', {
                        detail: this.appletHash,
                        bubbles: true,
                      }));
                    }}
                    @keypress.enter=${() => {
                      this.dispatchEvent(new CustomEvent('archive-applet', {
                        detail: this.appletHash,
                        bubbles: true,
                      }));
                    }}
                  ></sl-icon-button>
                </sl-tooltip>
              </div>
              <div>
                ${this.appInfo
                  ? getProvisionedCells(this.appInfo).map(([roleName, cellInfo]) =>
                      html`<span><b>${roleName}: </b></span><span>${dnaHashForCell(cellInfo)}</span>`
                    )
                  : html``
                }
              </div>
              <div>
                <span><b>appletHash: </b></span><span>${encodeHashToBase64(this.appletHash)}</span>
              </div>
            </div>
          </sl-card>
        `
      case "archived":
        return html`
          <sl-card style="flex: 1; margin-bottom: 16px">
            <div class="row" style="flex: 1; align-items: center">
              <applet-logo
                .appletHash=${this.appletHash}
                style="margin-right: 16px"
              ></applet-logo>
              <span style="flex: 1">${this.applet.custom_name}</span>

              <sl-tooltip .content=${msg("Unarchive")}>
                <sl-icon-button
                  .src=${wrapPathInSvg(mdiArchiveArrowUp)}
                  style="font-size: 2rem;"
                  @click=${() => {
                    this.dispatchEvent(new CustomEvent('unarchive-applet', {
                      detail: this.appletHash,
                      bubbles: true,
                    }));
                  }}
                  @keypress.enter=${() => {
                    this.dispatchEvent(new CustomEvent('unarchive-applet', {
                      detail: this.appletHash,
                      bubbles: true,
                    }));
                  }}
                ></sl-icon-button>
              </sl-tooltip>
            </div>
          </sl-card>
        `
    }
  }

  static styles = weStyles;
}
