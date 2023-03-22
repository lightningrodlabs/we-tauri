import { html, css, LitElement, PropertyValueMap } from "lit";
import { state, query, property } from "lit/decorators.js";

import { consume } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { localized, msg } from "@lit/localize";

import "@holochain-open-dev/elements/elements/select-avatar.js";
import { SelectAvatar } from "@holochain-open-dev/elements/elements/select-avatar.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";

import { weStyles } from "../shared-styles.js";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { onSubmit } from "@holochain-open-dev/elements";

/**
 * @element create-group-dialog
 */
@localized()
export class CreateGroupDialog extends ScopedElementsMixin(LitElement) {
  /** Dependencies */
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  async open() {
    this._dialog.show();
  }

  /** Private properties */
  @query("#dialog")
  _dialog!: SlDialog;
  @query("#name-field")
  _nameField!: HTMLInputElement;
  @query("#select-avatar")
  _avatarField!: SelectAvatar;

  private async createGroup(fields: any) {
    const groupDnaHash = await this._weStore.createGroup(
      fields.name,
      fields.logo_src
    );

    this.dispatchEvent(
      new CustomEvent("group-created", {
        detail: { groupDnaHash },
        bubbles: true,
        composed: true,
      })
    );
    this._dialog.hide();
    this._nameField.value = "";
    this._avatarField.clear();
  }

  render() {
    return html`
      <sl-dialog id="dialog" .label=${msg("Create Group")}>
        <form ${onSubmit((f) => this.createGroup(f))}>
          <div class="row" style="margin-top: 16px">
            <select-avatar id="select-avatar" name="logo_src"></select-avatar>

            <sl-input
              name="name"
              style="margin-left: 16px"
              id="name-field"
              .label=${msg("Group name")}
              required
            ></sl-input>
          </div>

          <sl-button
            id="primary-action-button"
            type="submit"
            .label=${msg("Create Group")}
          >
          </sl-button>
        </form>
      </sl-dialog>
    `;
  }
  static get styles() {
    return [
      weStyles,
      css`
        mwc-textfield {
          margin-top: 10px;
        }
      `,
    ];
  }
}
