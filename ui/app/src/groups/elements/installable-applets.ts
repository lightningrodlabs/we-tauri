import { html, LitElement, css } from "lit";
import { consume } from "@lit-labs/context";
import { customElement, query, state } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";
import {
  asyncDeriveAndJoin,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import { InstallAppletBundleDialog } from "./install-applet-bundle-dialog.js";
import "./install-applet-bundle-dialog.js";

import { GroupStore } from "../group-store.js";
import { groupStoreContext } from "../context.js";
import { weStyles } from "../../shared-styles.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { IconSrcOption } from "../../applet-bundles/types.js";
import { AppEntry, Entity } from "../../processes/appstore/types.js";

@localized()
@customElement("installable-applets")
export class InstallableApplets extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  _installableApplets = new StoreSubscriber(
    this,
    () =>
      asyncDeriveAndJoin(
        this.groupStore.weStore.appletBundlesStore.allAppletBundles,
        (allAppletBundles) =>
          join(
            allAppletBundles.map((b) =>
              this.weStore.appletBundlesStore.appletBundleLogo.get(b.id)
            )
          )
      ),
    () => []
  );

  @query("#applet-dialog")
  _appletDialog!: InstallAppletBundleDialog;

  renderInstallableApplet(
    appEntry: Entity<AppEntry>,
    iconSrc: string | undefined
  ) {
    return html`
      <sl-card class="applet-card" style="height: 200px">
        <div slot="header" class="row" style="align-items: center;">
          ${ iconSrc
            ? html`<img
              src=${iconSrc}
              alt="${appEntry.content.title} applet icon"
              style="height: 50px; width: 50px; border-radius: 5px; margin-right: 15px;"
            />`
            : html``
          }
          <span style="font-size: 18px;">${appEntry.content.title}</span>
        </div>
        <div class="column" style="flex: 1">
          <span style="flex: 1">${appEntry.content.subtitle}</span>
          <sl-button
            @click=${() => {
              this._appletDialog.open(appEntry);
            }}
          >
            ${msg("Add to group")}
          </sl-button>
        </div>
      </sl-card>
    `;
  }

  renderApplets(allApplets: [Array<Entity<AppEntry>>, Array<IconSrcOption>]) {
    return html`
      <install-applet-bundle-dialog
        id="applet-dialog"
      ></install-applet-bundle-dialog>

      <div style="display: flex; flex-direction: row; flex-wrap: wrap;">
        ${allApplets[0].length === 0
          ? html`
              <div class="column center-content">
                <span class="placeholder"
                  >${msg("No applets available yet.")}</span
                >
              </div>
            `
          : allApplets[0].map((item, i) =>
              this.renderInstallableApplet(item, allApplets[1][i])
            )}
      </div>
    `;
  }

  render() {
    switch (this._installableApplets.value?.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1;">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "complete":
        return this.renderApplets(this._installableApplets.value.value);
      case "error":
        return html`<display-error
          .headline=${msg(
            "Error fetching the applets available for installation"
          )}
          .error=${this._installableApplets.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    css`
      .applet-card {
        width: 300px;
        height: 180px;
        margin: 10px;
      }
    `,
    weStyles,
  ];
}
