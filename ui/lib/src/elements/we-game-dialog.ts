import { html, css, LitElement } from "lit";
import { state, query } from "lit/decorators.js";

import { sharedStyles } from "../sharedStyles";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { WeStore } from "../we.store";
import { weContext, GameEntry } from "../types";
import { Dialog, TextField, Button } from "@scoped-elements/material-web";

/**
 * @element we-game
 */
export class WeGameDialog extends ScopedElementsMixin(LitElement) {

  /** Dependencies */
  @contextProvided({ context: weContext })
  _store!: WeStore;

  open() {
    const dialog = this.shadowRoot!.getElementById("game-dialog") as Dialog
    dialog.open = true
  }

  /** Private properties */
  @query('#name-field')
  _nameField!: TextField;
  @query('#dna-hash-field')
  _dnaHashField!: TextField;
  @query('#url-field')
  _urlField!: TextField;


  private async handleOk(e: any) {
    const valid = this._urlField.validity.valid && this._nameField.validity.valid
    if (!this._nameField.validity.valid) {
      this._nameField.reportValidity()
    }
    if (!this._urlField.validity.valid) {
      this._urlField.reportValidity()
    }
    if (!valid) return

    const game: GameEntry = {
      name: this._nameField.value,
      ui_url: this._urlField.value,
      dna_hash: this._dnaHashField.value,
      meta: {
      },
    };
    const newGame = await this._store.addGame(game);
    this.dispatchEvent(new CustomEvent('game-added', { detail: newGame, bubbles: true, composed: true }));
    const dialog = this.shadowRoot!.getElementById(
      "game-dialog"
    ) as Dialog;
    dialog.close()
  }

  private async handleGameDialog(e: any) {
    this._nameField.value = "";
    this._urlField.value = "";
    this._dnaHashField.value = "";
  }

  handleUrlUpdated(e:Event) {

  }

  render() {
    return html`
<mwc-dialog  id="game-dialog" heading="Game" @closing=${
this.handleGameDialog
}>
<mwc-textfield @input=${() => (this.shadowRoot!.getElementById("name-field") as TextField).reportValidity()} id="name-field" label="Name" autoValidate=true required></mwc-textfield>
<mwc-textfield @input=${this.handleUrlUpdated} id="url-field" label="Image URL" autoValidate=true required></mwc-textfield>
<mwc-textfield @input=${() => (this.shadowRoot!.getElementById("dna-hash-field") as TextField).reportValidity()} id="dna-hash-field" label="DNA Hash" autoValidate=true required></mwc-textfield>

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
`,
    ];
  }
}
