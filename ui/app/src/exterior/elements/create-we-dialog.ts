import { html, css, LitElement, PropertyValueMap } from "lit";
import { state, query, property } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Dialog, TextField, Button } from "@scoped-elements/material-web";
import { SelectAvatar } from "@holochain-open-dev/utils";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { sharedStyles } from "../../sharedStyles";

/**
 * @element we-game
 */
export class CreateWeDialog extends ScopedElementsMixin(LitElement) {
  /** Dependencies */
  @contextProvided({ context: wesContext })
  _store!: WesStore;

  async open() {
    this._name = "";
    this._logoSrc = "";
    this._dialog.show();
    this._nameField.value = "";
    // this._avatarField.clear(); // to be uncommented once utils is updated
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
    await this._store.createWe(this._name!, this._logoSrc!);

    this.dispatchEvent(
      new CustomEvent("we-added", {
        detail: this._name,
        bubbles: true,
        composed: true,
      })
    );
    this._dialog.close();
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
      console.log("I am a new instance of a create-we-dialog");
  }

  render() {
    return html`
      <mwc-dialog id="dialog" heading="Create We">
        <select-avatar
        id="select-avatar"
          @avatar-selected=${(e) => (this._logoSrc = e.detail.avatar)}
        ></select-avatar>

        <mwc-textfield
          @input=${(e) => (this._name = e.target.value)}
          id="name-field"
          label="Name"
          autoValidate
          required
          outlined
        ></mwc-textfield>

        <mwc-button
          id="primary-action-button"
          slot="primaryAction"
          .disabled=${!this._name || !this._logoSrc}
          @click=${this.handleOk}
          >ok</mwc-button
        >
        <mwc-button slot="secondaryAction" dialogAction="cancel"
          >cancel</mwc-button
        >
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
      sharedStyles,
      css`
        mwc-textfield {
          margin-top: 10px;
        }
      `,
    ];
  }
}
