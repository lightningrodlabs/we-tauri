import { DisplayError, sharedStyles } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { SlSkeleton, SlTooltip } from "@scoped-elements/shoelace";
import { html, LitElement } from "lit";
import { GroupInfo } from "@lightningrodlabs/we-applet";
import { MdFab } from "@scoped-elements/material-web";
import { localized, msg } from "@lit/localize";

import { weStoreContext } from "../context";
import { WeStore } from "../we-store";
import { SidebarButton } from "./sidebar-button.js";
import { CreateGroupDialog } from "./create-group-dialog";
import { weStyles } from "../shared-styles";
import { DnaHash, encodeHashToBase64 } from "@holochain/client";

@localized()
export class GroupSidebar extends ScopedElementsMixin(LitElement) {
  @consume({ context: weStoreContext })
  _weStore!: WeStore;

  _groupsInfo = new StoreSubscriber(this, () => this._weStore.allGroupsInfo);

  renderGroups(groups: ReadonlyMap<DnaHash, GroupInfo>) {
    return html`
      <create-group-dialog id="create-group-dialog"></create-group-dialog>
      ${Array.from(groups.entries())
        .sort(([_, a], [__, b]) => a.name.localeCompare(b.name))
        .map(
          ([groupDnaHash, groupInfo]) =>
            html`
              <sidebar-button
                style="margin-top: 2px; margin-bottom: 2px; border-radius: 50%;"
                .logoSrc=${groupInfo.logo_src}
                .tooltipText=${groupInfo.name}
                @click=${() => {
                  console.log(encodeHashToBase64(groupDnaHash));
                  this.dispatchEvent(
                    new CustomEvent("group-selected", {
                      detail: {
                        groupDnaHash,
                      },
                      bubbles: true,
                      composed: true,
                    })
                  );
                  // this.handleWeGroupIconPrimaryClick(groupInfo.dna_hash);
                }}
              ></sidebar-button>
            `
        )}

      <sl-tooltip placement="right" .content=${msg("Add Group")} hoist>
        <md-fab
          icon="group_add"
          @click=${() =>
            (
              this.shadowRoot?.getElementById(
                "create-group-dialog"
              ) as CreateGroupDialog
            ).open()}
          style="margin-top: 4px; --md-theme-secondary: #9ca5e3;"
        ></md-fab>
      </sl-tooltip>
    `;
  }

  render() {
    switch (this._groupsInfo.value.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "error":
        return html`<display-error
          tooltip
          .error=${this._groupsInfo.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderGroups(this._groupsInfo.value.value);
    }
  }

  static get scopedElements() {
    return {
      "sl-skeleton": SlSkeleton,
      "display-error": DisplayError,
      "sidebar-button": SidebarButton,
      "md-fab": MdFab,
      "create-group-dialog": CreateGroupDialog,
      "sl-tooltip": SlTooltip,
    };
  }

  static styles = [weStyles, sharedStyles];
}
