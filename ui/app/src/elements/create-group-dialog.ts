import { html, css, LitElement, PropertyValueMap } from "lit";
import { state, query, property } from "lit/decorators.js";

import { consume } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  MdDialog,
  MdOutlinedTextField,
  MdFilledButton,
  MdOutlinedButton,
} from "@scoped-elements/material-web";
import { SelectAvatar, sharedStyles } from "@holochain-open-dev/elements";
import { localized, msg } from "@lit/localize";

import { weStyles } from "../shared-styles";
import { weStoreContext } from "../context";
import { WeStore } from "../we-store";

/**
 * @element create-group-dialog
 */
@localized()
export class CreateGroupDialog extends ScopedElementsMixin(LitElement) {
  /** Dependencies */
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  async open() {
    this._name = "";
    this._logoSrc = "";
    this._dialog.show();
  }

  /** Private properties */
  @query("#dialog")
  _dialog!: MdDialog;
  @query("#name-field")
  _nameField!: HTMLInputElement;
  @query("#select-avatar")
  _avatarField!: SelectAvatar;

  @state()
  _name: string | undefined;
  @state()
  _logoSrc: string | undefined;

  private async handleOk(e: any) {
    // if statement is required to prevent ENTER key to close the dialog while the button is disabled
    if (this._name && this._logoSrc) {
      const groupDnaHash = await this._weStore.createGroup(
        this._name!,
        this._logoSrc!
      );

      this.dispatchEvent(
        new CustomEvent("group-created", {
          detail: { groupDnaHash },
          bubbles: true,
          composed: true,
        })
      );
      this._dialog.close();
      this._nameField.value = "";
      this._avatarField.clear();
    }
  }

  render() {
    return html`
      <md-dialog id="dialog">
        <span slot="headline"> ${msg("Create Group")}</span>
        <div class="row" style="margin-top: 16px">
          <select-avatar
            id="select-avatar"
            @avatar-selected=${(e) => (this._logoSrc = e.detail.avatar)}
          ></select-avatar>

          <md-outlined-text-field
            @input=${(e) => (this._name = e.target.value)}
            style="margin-left: 16px"
            id="name-field"
            .label=${msg("Group name")}
            required
          ></md-outlined-text-field>
        </div>

        <md-outlined-button
          slot="footer"
          dialogAction="cancel"
          .label=${msg("Cancel")}
        >
        </md-outlined-button>
        <md-filled-button
          id="primary-action-button"
          slot="footer"
          .disabled=${!this._name || !this._logoSrc}
          @click=${this.handleOk}
          .label=${msg("Create Group")}
        >
        </md-filled-button>
      </md-dialog>
    `;
  }
  static get scopedElements() {
    return {
      "select-avatar": SelectAvatar,
      "md-filled-button": MdFilledButton,
      "md-outlined-button": MdOutlinedButton,
      "md-dialog": MdDialog,
      "md-outlined-text-field": MdOutlinedTextField,
    };
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
