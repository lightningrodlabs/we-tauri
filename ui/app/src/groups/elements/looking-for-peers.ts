import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";
import { notifyError, sharedStyles } from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@holochain-open-dev/profiles/dist/elements/my-profile.js";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";

@localized()
@customElement("looking-for-peers")
export class LookingForPeers extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @state()
  leaving = false;

  async leaveGroup() {
    this.leaving = true;

    const groupDnaHash = this.groupStore.groupDnaHash;
    try {
      await this.weStore.leaveGroup(groupDnaHash);

      this.dispatchEvent(
        new CustomEvent("group-left", {
          detail: {
            groupDnaHash,
          },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e) {
      notifyError(msg("Error leaving the group"));
      console.error(e);
    }

    this.leaving = false;
  }

  get dialog(): SlDialog {
    return this.shadowRoot?.getElementById("leave-group-dialog") as SlDialog;
  }

  renderLeaveGroupDialog() {
    return html`<sl-dialog
      id="leave-group-dialog"
      .label=${msg("Leave Group")}
      @sl-request-close=${(e) => {
        if (this.leaving) {
          e.preventDefault();
        }
      }}
    >
      <span>${msg("Are you sure you want to leave this group?")}</span>

      <sl-button slot="footer" @click=${() => this.dialog.hide()}
        >${msg("Cancel")}</sl-button
      >
      <sl-button
        slot="footer"
        variant="danger"
        .loading=${this.leaving}
        @click=${() => this.leaveGroup()}
        >${msg("Leave")}</sl-button
      >
    </sl-dialog>`;
  }

  render() {
    return html`
      ${this.renderLeaveGroupDialog()}
      <sl-button
        variant="danger"
        @click=${() => this.dialog.show()}
        style="position: absolute; top: 10px; right: 10px;"
        >${msg("Leave Group")}
      </sl-button>
      <div class="column center-content" style="flex: 1">
        <h2>${msg("Looking for peers...")}</h2>
        <span style="max-width: 600px; text-align: center"
          >${msg(
            "No peers found yet to fetch the group's meta data. Ask one of the members of this group to launch We so that you can synchronize with them."
          )}</span
        >
      </div>
    `;
  }

  static styles = [sharedStyles];
}
