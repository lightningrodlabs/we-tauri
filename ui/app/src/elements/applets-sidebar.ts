import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";
import { EntryHash } from "@holochain/client";
import { HoloHashMap } from "@holochain-open-dev/utils";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import "../groups/elements/group-context.js";
import "../applets/elements/applet-logo.js";
import "./create-group-dialog.js";

import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { weStyles } from "../shared-styles.js";
import { AppletStore } from "../applets/applet-store.js";

@localized()
@customElement("applets-sidebar")
export class AppletsSidebar extends LitElement {
  @consume({ context: weStoreContext })
  _weStore!: WeStore;

  applets = new StoreSubscriber(
    this,
    () => this._weStore.allInstalledApplets,
    () => []
  );

  renderApplets(applets: ReadonlyMap<EntryHash, AppletStore>) {
    const appletsByBundleHash: HoloHashMap<EntryHash, AppletStore> =
      new HoloHashMap();

    for (const [appletHash, appletStore] of Array.from(applets.entries())) {
      if (!appletsByBundleHash.has(appletStore.applet.appstore_app_hash)) {
        appletsByBundleHash.set(
          appletStore.applet.appstore_app_hash,
          appletStore
        );
      }
    }

    return html`
      <div class="row" style="align-items:center">
        ${Array.from(appletsByBundleHash.entries())
          .sort((a1, a2) =>
            a1[1].applet.custom_name.localeCompare(a2[1].applet.custom_name)
          )
          .map(
            ([appletBundleHash, appletStore]) =>
              html`
                <sl-tooltip
                  hoist
                  placement="bottom"
                  .content=${appletStore.applet.custom_name}
                >
                  <applet-logo
                    .appletHash=${appletStore.appletHash}
                    @click=${() => {
                      this.dispatchEvent(
                        new CustomEvent("applet-selected", {
                          detail: {
                            appletBundleHash,
                          },
                          bubbles: true,
                          composed: true,
                        })
                      );
                    }}
                    style="cursor: pointer; margin-top: 2px; margin-bottom: 2px; margin-right: 12px; --size: 48px"
                  ></applet-logo>
                </sl-tooltip>
              `
          )}
      </div>
    `;
  }

  renderAppletsLoading() {
    switch (this.applets.value.status) {
      case "pending":
        return html`<sl-skeleton
          style="height: 48px; width: 48px; border-radius: 8px"
        ></sl-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error displaying the applets")}
          tooltip
          .error=${this.applets.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderApplets(this.applets.value.value);
    }
  }

  render() {
    return html`
      <div class="row" style="flex: 1; padding: 4px; align-items: center;">
        ${this.renderAppletsLoading()}
      </div>
    `;
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
