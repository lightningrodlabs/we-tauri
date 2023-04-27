import {
  hashProperty,
  hashState,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { localized, msg } from "@lit/localize";
import { DnaHash } from "@holochain/client";
import { mdiAccountMultiplePlus, mdiHelpCircleOutline, mdiHome } from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import "../groups/elements/group-context.js";
import "../groups/elements/registered-applets-sidebar.js";
import "./sidebar-button.js";
import "./create-group-dialog.js";

import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { weStyles } from "../shared-styles.js";
import { CreateGroupDialog } from "./create-group-dialog.js";

@localized()
@customElement("group-sidebar")
export class GroupSidebar extends LitElement {
  @consume({ context: weStoreContext })
  _weStore!: WeStore;

  @property(hashProperty("selected-group-dna-hash"))
  selectedGroupDnaHash: DnaHash | undefined;

  _groupsProfiles = new StoreSubscriber(
    this,
    () => this._weStore.allGroupsProfiles
  );

  renderGroupApplets(groupDnaHash: DnaHash) {
    return html`
      <group-context .groupDnaHash=${groupDnaHash}>
        <registered-applets-sidebar
          style="padding: 4px"
        ></registered-applets-sidebar
      ></group-context>
    `;
  }

  renderGroups(groups: ReadonlyMap<DnaHash, GroupProfile | undefined>) {
    const knownGroups = Array.from(groups.entries()).filter(
      ([_, groupProfile]) => !!groupProfile
    ) as Array<[DnaHash, GroupProfile]>;
    const unknownGroups = Array.from(groups.entries()).filter(
      ([_, groupProfile]) => !groupProfile
    ) as Array<[DnaHash, GroupProfile]>;

    return html`
      ${knownGroups
        .sort(([_, a], [__, b]) => a.name.localeCompare(b.name))
        .map(
          ([groupDnaHash, groupProfile]) =>
            html`
              <sidebar-button
                style="margin-top: 2px; margin-bottom: 2px; border-radius: 50%;"
                .logoSrc=${groupProfile.logo_src}
                .tooltipText=${groupProfile.name}
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
        )}
      ${unknownGroups.map(
        ([groupDnaHash]) =>
          html`
            <sidebar-button
              style="margin-top: 2px; margin-bottom: 2px; border-radius: 50%;"
              .logoSrc=${wrapPathInSvg(mdiHelpCircleOutline)}
              .tooltipText=${msg("Not synched")}
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
      )}
    `;
  }

  renderGroupsLoading() {
    switch (this._groupsProfiles.value.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error displaying the groups")}
          tooltip
          .error=${this._groupsProfiles.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderGroups(this._groupsProfiles.value.value);
    }
  }

  render() {
    return html`
      <create-group-dialog id="create-group-dialog"></create-group-dialog>

      <div class="row">
        <div
          class="column"
          style="padding: 4px; align-items: center; background-color: rgba(48, 63, 159, 0.51)"
        >
          <sl-tooltip placement="right" .content=${msg("Home")} hoist>
            <sl-button
              size="large"
              circle
              @click=${() => {
                this.dispatchEvent(
                  new CustomEvent("home-selected", {
                    bubbles: true,
                    composed: true,
                  })
                );
              }}
              style="${this.selectedGroupDnaHash === undefined
                ? "border: 3px solid purple;"
                : "border: 3px solid transparent;"}; border-radius: 50%; margin-top: 2px; margin-bottom: 2px;"
            >
              <sl-icon .src=${wrapPathInSvg(mdiHome)}></sl-icon>
            </sl-button>
          </sl-tooltip>

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
        </div>

        ${this.selectedGroupDnaHash
          ? this.renderGroupApplets(this.selectedGroupDnaHash)
          : html``}
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
