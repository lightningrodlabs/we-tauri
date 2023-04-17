import { sharedStyles } from "@holochain-open-dev/elements";
import { localized, msg } from "@lit/localize";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";

import "./group-peers-status.js";
import "./installable-applets.js";
import { consume } from "@lit-labs/context";
import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { StoreSubscriber } from "@holochain-open-dev/stores";

@localized()
@customElement("group-home")
export class GroupHome extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  networkSeed = new StoreSubscriber(
    this,
    () => this.groupStore?.networkSeed,
    () => [this.groupStore]
  );

  renderInviteToGroupCard() {
    return html`<sl-card>
      <span slot="header">${msg("Invite Members")}</span>

      <span
        >${msg(
          "To invite other people to join this group, send them this link:"
        )}</span
      >

      <span
        >${this.networkSeed.value.status === "complete"
          ? html`<a
              style="pointer-events: none"
              href="https://lightningrodlabs.github.io/we?we-group://${this
                .networkSeed.value.value}"
              >https://lightningrodlabs.github.io/we?we-group://${this
                .networkSeed.value.value}</a
            >`
          : msg("Loading...")}</span
      >
    </sl-card>`;
  }

  render() {
    return html`
      <profile-prompt>
        ${this.renderInviteToGroupCard()}
        <group-peers-status></group-peers-status>
        <installable-applets style="flex: 1"></installable-applets>
      </profile-prompt>
    `;
  }

  static styles = sharedStyles;
}
