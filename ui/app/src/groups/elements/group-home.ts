import { sharedStyles } from "@holochain-open-dev/elements";
import { localized, msg } from "@lit/localize";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { encodeHashToBase64 } from "@holochain/client";
import { DnaHash } from "@holochain/client";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { GroupProfile } from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "./group-peers-status.js";
import "./installable-applets.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";

@localized()
@customElement("group-home")
export class GroupHome extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  groupProfile = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.groupProfile,
        this.weStore.originalGroupDnaHash,
        this.groupStore.networkSeed,
      ]) as AsyncReadable<[GroupProfile | undefined, DnaHash, string]>,
    () => [this.groupStore, this.weStore]
  );

  renderInviteToGroupCard(originalGroupDnaHash: DnaHash, networkSeed: string) {
    return html`<sl-card>
      <span slot="header">${msg("Invite Members")}</span>
      <div class="column">
        <span
          >${msg(
            "To invite other people to join this group, send them this link:"
          )}</span
        >

        <a
          style="pointer-events: none"
          href="https://lightningrodlabs.org/we?we://group/${encodeHashToBase64(
            originalGroupDnaHash
          )}/${networkSeed}"
          >https://lightningrodlabs.org/we?we://group/${encodeHashToBase64(
            originalGroupDnaHash
          )}/${networkSeed}</a
        >
      </div>
    </sl-card>`;
  }

  render() {
    switch (this.groupProfile.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "complete":
        const groupProfile = this.groupProfile.value.value[0];

        if (!groupProfile)
          return html`<div class="column">
            <h2>${msg("Out of sync")}</h2>
            <span
              >${msg(
                "Ask one of the members of this group to launch We so that you can synchronize with this group."
              )}</span
            >
          </div>`;

        return html`
          <profile-prompt>
            <div class="column">
              <div class="row">
                ${this.renderInviteToGroupCard(
                  this.groupProfile.value.value[1],
                  this.groupProfile.value.value[2]
                )}
                <group-peers-status
                  style="margin-left: 16px"
                ></group-peers-status>
              </div>
              <installable-applets style="flex: 1"></installable-applets>
            </div>
          </profile-prompt>
        `;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the group information")}
          .error=${this.groupProfile.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = sharedStyles;
}
