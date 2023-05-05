import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog";
import { notifyError } from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import { groupStoreContext } from "../context";
import { GroupStore } from "../group-store";
import { WeStore } from "../../we-store";
import { weStoreContext } from "../../context";

@localized()
@customElement("your-settings")
export class YourSettings extends LitElement {
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
      <sl-button variant="danger" @click=${() => this.dialog.show()}
        >${msg("Leave Group")}</sl-button
      >
    `;
  }
}
