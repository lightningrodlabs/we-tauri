import { sharedStyles, wrapPathInSvg } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { GroupInfo } from "@lightningrodlabs/we-applet";
import { localized, msg } from "@lit/localize";
import { DnaHash } from "@holochain/client";
import { mdiAccountMultiplePlus } from "@mdi/js";

import "@holochain-open-dev/elements/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import "./sidebar-button.js";
import { weStyles } from "../shared-styles.js";
import "./create-group-dialog.js";
import { CreateGroupDialog } from "./create-group-dialog.js";

@localized()
@customElement("group-sidebar")
export class GroupSidebar extends LitElement {
  @consume({ context: weStoreContext })
  _weStore!: WeStore;

  _groupsInfo = new StoreSubscriber(this, () => this._weStore.allGroupsInfo);

  renderGroups(groups: ReadonlyMap<DnaHash, GroupInfo>) {
    return Array.from(groups.entries())
      .sort(([_, a], [__, b]) => a.name.localeCompare(b.name))
      .map(
        ([groupDnaHash, groupInfo]) =>
          html`
            <sidebar-button
              style="margin-top: 2px; margin-bottom: 2px; border-radius: 50%;"
              .logoSrc=${groupInfo.logo_src}
              .tooltipText=${groupInfo.name}
              @click=${() => {
                this.dispatchEvent(
                  new CustomEvent("group-selected", {
                    detail: {
                      groupDnaHash,
                    },
                    bubbles: true,
                    composed: true,
                  })
                );
              }}
            ></sidebar-button>
          `
      );
  }

  renderGroupsLoading() {
    switch (this._groupsInfo.value.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error displaying the groups")}
          tooltip
          .error=${this._groupsInfo.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderGroups(this._groupsInfo.value.value);
    }
  }

  render() {
    return html`
      <create-group-dialog id="create-group-dialog"></create-group-dialog>

      ${this.renderGroupsLoading()}

      <sl-tooltip placement="right" .content=${msg("Add Group")} hoist>
        <sl-button
          size="large"
          circle
          @click=${() =>
            (
              this.shadowRoot?.getElementById(
                "create-group-dialog"
              ) as CreateGroupDialog
            ).open()}
          style="margin-top: 4px;"
        >
          <sl-icon .src=${wrapPathInSvg(mdiAccountMultiplePlus)}></sl-icon>
        </sl-button>
      </sl-tooltip>
    `;
  }

  static styles = [weStyles];
}
