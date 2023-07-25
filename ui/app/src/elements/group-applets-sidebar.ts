import { AsyncReadable, join, pipe, sliceAndJoin, StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";
import { EntryHash } from "@holochain/client";
import { hashProperty } from "@holochain-open-dev/elements";

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
import { GroupStore } from "../groups/group-store.js";
import { groupStoreContext } from "../groups/context.js";
import { CustomView } from "../custom-views/types.js";


// Sidebar for the applet instances of a group
@localized()
@customElement("group-applets-sidebar")
export class GroupAppletsSidebar extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  @property(hashProperty("applet-hash"))
  selectedAppletHash!: EntryHash;

  _groupApplets = new StoreSubscriber(
    this,
    () => pipe(this._groupStore.allApplets, (allApplets) =>
          sliceAndJoin(this.weStore.applets, allApplets)
        ) as AsyncReadable<ReadonlyMap<EntryHash, AppletStore>>,
    () => [this._groupStore]
  );

  renderApplets(applets: ReadonlyMap<EntryHash, AppletStore>) {

    return html`
      <div class="row" style="align-items:center">
        ${Array.from(applets.entries())
          .sort((a1, a2) =>
            a1[1].applet.custom_name.localeCompare(a2[1].applet.custom_name)
          )
          .map(
            ([_appletBundleHash, appletStore]) =>
              html`
                <sl-tooltip
                  hoist
                  placement="bottom"
                  .content=${appletStore.applet.custom_name}
                >
                  <applet-logo
                    .selected=${this.selectedAppletHash === appletStore.appletHash}
                    .appletHash=${appletStore.appletHash}
                    @click=${() => {
                      this.dispatchEvent(
                        new CustomEvent("applet-selected", {
                          detail: {
                            appletHash:
                              appletStore.appletHash,
                          },
                          bubbles: true,
                          composed: true,
                        })
                      );
                    }}
                    style="cursor: pointer; margin-top: 2px; margin-bottom: 2px; margin-right: 12px; --size: 58px"
                  ></applet-logo>
                </sl-tooltip>
              `
          )}
      </div>
    `;
  }

  renderAppletsLoading() {
    switch (this._groupApplets.value.status) {
      case "pending":
        return html`<sl-skeleton
          style="height: 58px; width: 58px; --border-radius: 8px; border-radius: 8px; margin-right: 10px;"
          effect="pulse"
        ></sl-skeleton>
        <sl-skeleton
          style="height: 58px; width: 58px; --border-radius: 8px; border-radius: 8px; margin-right: 10px;"
          effect="pulse"
        ></sl-skeleton>
        <sl-skeleton
          style="height: 58px; width: 58px; --border-radius: 8px; border-radius: 8px; margin-right: 10px;"
          effect="pulse"
        ></sl-skeleton>
        `;
      case "error":
        return html`<display-error
          .headline=${msg("Error displaying the applets")}
          tooltip
          .error=${this._groupApplets.value.error}
        ></display-error>`;
      case "complete":
        return this.renderApplets(this._groupApplets.value.value);
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
