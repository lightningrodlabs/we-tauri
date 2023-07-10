import { html, css, LitElement, PropertyValueMap } from "lit";
import { state, query, property, customElement } from "lit/decorators.js";

import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";

import "@holochain-open-dev/elements/dist/elements/select-avatar.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import { notifyError, onSubmit } from "@holochain-open-dev/elements";

import { WeStore } from "../we-store.js";
import { weStoreContext } from "../context.js";
import { weStyles } from "../shared-styles.js";

/**
 * @element join-group-dialog
 */
@localized()
@customElement("join-group-dialog")
export class JoinGroupDialog extends LitElement {
  /** Dependencies */
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  async open(networkSeed: string) {
    this.networkSeed = networkSeed;
    this._dialog.show();
  }

  /** Private properties */
  @query("#dialog")
  _dialog!: SlDialog;

  @property()
  networkSeed: string | undefined;

  @state()
  joining = false;

  private async joinGroup() {
    if (this.joining) return;

    this.joining = true;

    try {
      const groupClonedCell = await this._weStore.joinGroup(this.networkSeed!);

      this.dispatchEvent(
        new CustomEvent("group-joined", {
          detail: { groupDnaHash: groupClonedCell.cell_id[0] },
          bubbles: true,
          composed: true,
        })
      );
      this._dialog.hide();
      this.networkSeed = undefined;
    } catch (e) {
      notifyError(msg("Error joining the group."));
      console.error(e);
    }
    this.joining = false;
  }

  render() {
    return html`
      <sl-dialog
        id="dialog"
        .label=${msg("Join Group")}
        @sl-request-close=${(e) => {
          if (this.joining) {
            e.preventDefault();
          }
        }}
      >
        <div class="column" style="justify-content: center">
          <span>${msg("Do you want to join this group?")}</span>

          <sl-button
            style="margin-top: 24px"
            variant="primary"
            @click=${() => this.joinGroup()}
            .loading=${this.joining}
          >
            ${msg("Join Group")}
          </sl-button>
        </div>
      </sl-dialog>
    `;
  }

  static styles = [weStyles];
}
