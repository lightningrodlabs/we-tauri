import { hashState } from "@holochain-open-dev/elements";
import { DnaHash } from "@holochain/client";
import { localized } from "@lit/localize";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import "../groups/elements/group-context.js";
import "../groups/elements/group-installed-applets.js";
import "./group-sidebar.js";
import { weStyles } from "../shared-styles.js";

@localized()
@customElement("navigation-sidebar")
export class NavigationSidebar extends LitElement {
  @state(hashState())
  selectedGroupDnaHash: DnaHash | undefined;

  renderGroupApplets(groupDnaHash: DnaHash) {
    return html`
      <group-context .groupDnaHash=${groupDnaHash}>
        <group-installed-applets></group-installed-applets
      ></group-context>
    `;
  }

  render() {
    return html`
      <div class="row">
        <group-sidebar
          @group-selected=${(e) =>
            (this.selectedGroupDnaHash = e.detail.groupDnaHash)}
        ></group-sidebar>
        ${this.selectedGroupDnaHash
          ? this.renderGroupApplets(this.selectedGroupDnaHash)
          : html``}
      </div>
    `;
  }

  static styles = weStyles;
}
