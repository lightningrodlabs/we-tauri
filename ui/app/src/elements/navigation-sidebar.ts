import { hashState } from "@holochain-open-dev/elements";
import { DnaHash } from "@holochain/client";
import { localized } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { state } from "lit/decorators.js";
import { GroupContext } from "../groups/elements/group-context.js";
import { GroupInstalledApplets } from "../groups/elements/group-installed-applets.js";
import { weStyles } from "../shared-styles.js";
import { GroupSidebar } from "./group-sidebar.js";

@localized()
export class NavigationSidebar extends ScopedElementsMixin(LitElement) {
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

  static get scopedElements() {
    return {
      "group-context": GroupContext,
      "group-installed-applets": GroupInstalledApplets,
      "group-sidebar": GroupSidebar,
    };
  }

  static styles = weStyles;
}
