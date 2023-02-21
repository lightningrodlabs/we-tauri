import { DisplayError } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume, provide } from "@lit-labs/context";
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

@localized()
export class GroupSidebar extends ScopedElementsMixin(LitElement) {
  @consume({ context: weStoreContext })
  _weStore!: WeStore;

  _groupsInfo = new StoreSubscriber(this, () => this._weStore.allGroupsInfo);

  renderGroups(groups: GroupInfo[]) {
    return html`
      <create-group-dialog id="create-group-dialog"></create-group-dialog>
      ${groups
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (groupInfo) =>
            html`
              <sidebar-button
                style="margin-top: 2px; margin-bottom: 2px; border-radius: 50%;"
                .logoSrc=${groupInfo.logo_src}
                .tooltipText=${groupInfo.name}
                @click=${() => {
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
}
