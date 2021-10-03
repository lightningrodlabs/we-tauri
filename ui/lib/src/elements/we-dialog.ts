import { html, css, LitElement } from "lit";
import { state, query, property } from "lit/decorators.js";

import { sharedStyles } from "../sharedStyles";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { WeStore } from "../we.store";
import { weContext, GameEntry, Dictionary } from "../types";
import { Dialog, TextField, Button, } from "@scoped-elements/material-web";

import { EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash } from '@holochain-open-dev/core-types';

/**
 * @element we-game
 */
export class WeDialog extends ScopedElementsMixin(LitElement) {

  @property()
  weId: string = ""

  /** Dependencies */
  @contextProvided({ context: weContext })
  _store!: WeStore;

  async open() {
    this._nameField.value = "";
    this._logoUrlField.value = "";
    this._dialog.open = true
  }

  /** Private properties */
  @query('#dialog')
  _dialog!: Dialog;
  @query('#name-field')
  _nameField!: TextField;
  @query('#logo-url-field')
  _logoUrlField!: TextField;


  private async handleOk(e: any) {
    const valid = this._logoUrlField.validity.valid  && this._nameField.validity.valid
    if (!this._nameField.validity.valid) {
      this._nameField.reportValidity()
    }
    if (!this._logoUrlField.validity.valid) {
      this._logoUrlField.reportValidity()
    }
    if (!valid) return

    await this._store.newWe(this._nameField.value,   this._logoUrlField.value)

    this.dispatchEvent(new CustomEvent('we-added', { detail:  this._nameField.value, bubbles: true, composed: true }));
    this._dialog.close()
  }

  private async handleDialog(e: any) {
  }

  render() {
    return html`
<mwc-dialog  id="dialog" heading="hApp" @closing=${this.handleDialog}>
  <mwc-textfield @input=${() => this._nameField.reportValidity()} id="name-field" label="Name" autoValidate=true required outlined></mwc-textfield>
  <mwc-textfield @input=${() => this._logoUrlField.reportValidity()} id="logo-url-field" label="Logo Image URL" autoValidate=true required outlined></mwc-textfield>

  <mwc-button id="primary-action-button" slot="primaryAction" @click=${this.handleOk}>ok</mwc-button>
  <mwc-button slot="secondaryAction"  dialogAction="cancel">cancel</mwc-button>
</mwc-dialog>
`
  }
  static get scopedElements() {
    return {
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
