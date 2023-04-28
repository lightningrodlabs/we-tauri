import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";
import { GroupProfile } from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { groupStoreContext } from "../context";
import { GroupStore } from "../group-store";

@customElement("group-logo")
export class GroupLogo extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  groupProfile = new StoreSubscriber(
    this,
    () => this.groupStore.groupProfile,
    () => []
  );

  renderLogo(groupProfile: GroupProfile | undefined) {
    if (!groupProfile) return html``;

    return html` <img .src=${groupProfile.logo_src} style="height: 16px; width: 16px;"></img> `;
  }

  render() {
    switch (this.groupProfile.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "complete":
        return this.renderLogo(this.groupProfile.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the group profile")}
          .error=${this.groupProfile.value.error.data.data}
        ></display-error>`;
    }
  }
}
