import { html, css, LitElement, PropertyValueMap } from "lit";
import { state, query, property } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Dialog, TextField, Button } from "@scoped-elements/material-web";
import { SelectAvatar } from "@holochain-open-dev/elements";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { weStyles } from "../../sharedStyles";

/**
 * @element we-applet
 */
export class CreateWeGroupDialog extends ScopedElementsMixin(LitElement) {
  /** Dependencies */
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  async open() {
    this._name = "";
    this._logoSrc = "";
    this._dialog.show();
  }

  /** Private properties */
  @query("#dialog")
  _dialog!: Dialog;
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
      this._dialog.close();
      this.dispatchEvent(new CustomEvent("creating-we", {})); // required to display loading screen in the dashboard
      const weId = await this._matrixStore.createWeGroup(
        this._name!,
        this._logoSrc!
      );

      this.dispatchEvent(
        new CustomEvent("we-added", {
          detail: weId,
          bubbles: true,
          composed: true,
        })
      );
      this._nameField.value = "";
      this._avatarField.clear();
    }
  }

  render() {
    return html`
      <mwc-dialog id="dialog" heading="Create Group">
        <div class="row" style="margin-top: 16px">
          <select-avatar
            id="select-avatar"
            @avatar-selected=${(e) => (this._logoSrc = e.detail.avatar)}
          ></select-avatar>

          <mwc-textfield
            @input=${(e) => (this._name = e.target.value)}
            style="margin-left: 16px"
            id="name-field"
            label="Group name"
            autoValidate
            required
            outlined
          ></mwc-textfield>
        </div>

        <mwc-button slot="secondaryAction" dialogAction="cancel">
          cancel
        </mwc-button>
        <mwc-button
          id="primary-action-button"
          slot="primaryAction"
          .disabled=${!this._name || !this._logoSrc}
          @click=${this.handleOk}
        >
          ok
        </mwc-button>
      </mwc-dialog>
    `;
  }
  static get scopedElements() {
    return {
      "select-avatar": SelectAvatar,
      "mwc-button": Button,
      "mwc-dialog": Dialog,
      "mwc-textfield": TextField,
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
