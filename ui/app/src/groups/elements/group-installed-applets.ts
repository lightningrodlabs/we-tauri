import { DisplayError } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { SlSkeleton } from "@scoped-elements/shoelace";
import { html, LitElement } from "lit";
import { localized, msg } from "@lit/localize";
import { EntryHash } from "@holochain/client";

import { groupStoreContext } from "../context";
import { GenericGroupStore } from "../group-store";
import { AppletInstance } from "../types";
import { SidebarButton } from "../../elements/sidebar-button";
import { weStyles } from "../../shared-styles";

@localized()
export class GroupInstalledApplets extends ScopedElementsMixin(LitElement) {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GenericGroupStore<any>;

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
          .error=${this._installedApplets.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderInstalledApplets(this._installedApplets.value.value);
    }
  }

  static get scopedElements() {
    return {
      "sl-skeleton": SlSkeleton,
      "display-error": DisplayError,
      "sidebar-button": SidebarButton,
    };
  }

  static styles = [weStyles];
}
