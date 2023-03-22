import { StoreSubscriber } from "@holochain-open-dev/stores";
import { customElement } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { localized, msg } from "@lit/localize";
import { EntryHash } from "@holochain/client";

import "@holochain-open-dev/elements/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { AppletInstance } from "../types.js";
import "../../elements/sidebar-button.js";
import { weStyles } from "../../shared-styles.js";

@localized()
@customElement("group-installed-applets")
export class GroupInstalledApplets extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  _installedApplets = new StoreSubscriber(
    this,
    () => this._groupStore?.installedApplets
  );

  renderInstalledApplets(applets: ReadonlyMap<EntryHash, AppletInstance>) {
    return html`
      ${Array.from(applets.entries()).map(
        ([appletInstanceHash, appletInstance]) =>
          html`
            <sidebar-button
              style="margin-top: 2px; margin-bottom: 2px; border-radius: 50%;"
              .logoSrc=${appletInstance.logo_src}
              .tooltipText=${appletInstance.custom_name}
              @click=${() => {
                this.dispatchEvent(
                  new CustomEvent("applet-instance-selected", {
                    detail: {
                      groupDnaHash: this._groupStore.groupDnaHash,
                      appletInstanceHash,
                    },
                    bubbles: true,
                    composed: true,
                  })
                );
              }}
            ></sidebar-button>
          `
      )}
    `;
  }

  render() {
    switch (this._installedApplets.value?.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the applets installed in this group")}
          .error=${this._installedApplets.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderInstalledApplets(this._installedApplets.value.value);
    }
  }

  static styles = [weStyles];
}
