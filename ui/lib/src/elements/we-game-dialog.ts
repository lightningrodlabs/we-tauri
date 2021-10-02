import { html, css, LitElement } from "lit";
import { state, query, property } from "lit/decorators.js";

import { sharedStyles } from "../sharedStyles";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { WeStore } from "../we.store";
import { weContext, GameEntry, Dictionary } from "../types";
import { Dialog, TextField, Button,   ListItem, Select, } from "@scoped-elements/material-web";

import { EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash } from '@holochain-open-dev/core-types';

/**
 * @element we-game
 */
export class WeGameDialog extends ScopedElementsMixin(LitElement) {

  @property()
  weId: string = ""

  /** Dependencies */
  @contextProvided({ context: weContext })
  _store!: WeStore;

  @state()
  dnas: Dictionary<string> = {}

  async updateAvailableApps() {
    const dnas: Dictionary<string> = {}
    if (this._store.adminWebsocket && this._store.appWebsocket) {
      const active = await this._store.adminWebsocket.listActiveApps();
      const installed : Dictionary<boolean> = {}
      Object.values(this._store.games(this.weId)).map((g)=> installed[g.dna_hash] = true)
      console.log("installed",installed)
      for (const app of active) {
        const appInfo = await this._store.appWebsocket!.appInfo({
          installed_app_id: app,
        });
        const dna_hash = serializeHash(appInfo.cell_data[0].cell_id[0])
        if (!installed[dna_hash]) {
          dnas[app] = dna_hash
        }
      }
      this.dnas = dnas
    }
    else {
      console.log("Admin and/or app websocket not initialized")
    }
  }

  async open() {
    const dialog = this.shadowRoot!.getElementById("game-dialog") as Dialog
    await this.updateAvailableApps()
    if (Object.keys(this.dnas).length == 0) {
      alert("No Dna's available to install, add some via the launcher!")
      return
    }
    dialog.open = true
  }

  /** Private properties */
  @query('#name-field')
  _nameField!: TextField;
  @query('#dna-field')
  _dnaField!: TextField;
  @query('#ui-url-field')
  _uiUrlField!: TextField;
  @query('#logo-url-field')
  _logoUrlField!: TextField;


  private async handleOk(e: any) {
    const valid = this._logoUrlField.validity.valid && this._uiUrlField.validity.valid && this._nameField.validity.valid
    if (!this._nameField.validity.valid) {
      this._nameField.reportValidity()
    }
    if (!this._uiUrlField.validity.valid) {
      this._uiUrlField.reportValidity()
    }
    if (!this._logoUrlField.validity.valid) {
      this._logoUrlField.reportValidity()
    }
    if (!valid) return

    const game: GameEntry = {
      name: this._nameField.value,
      ui_url: this._uiUrlField.value,
      logo_url: this._logoUrlField.value,
      dna_hash: this._dnaField.value,
      meta: {
      },
    };
    const newGame = await this._store.addGame(this.weId, game);
    this.dispatchEvent(new CustomEvent('game-added', { detail: newGame, bubbles: true, composed: true }));
    const dialog = this.shadowRoot!.getElementById(
      "game-dialog"
    ) as Dialog;
    dialog.close()
  }

  private async handleGameDialog(e: any) {
    this._nameField.value = "";
    this._uiUrlField.value = "";
    this._logoUrlField.value = "";
    this._dnaField.value = "";
  }

  handleUrlUpdated(e:Event) {

  }

  render() {
    return html`
<mwc-dialog  id="game-dialog" heading="hApp" @closing=${
this.handleGameDialog
}>
<mwc-select outlined label="DNA"  @input=${() => this._dnaField.reportValidity()} id="dna-field" required>
${Object.entries(this.dnas).map(
([appId, dna]) => html`
<mwc-list-item value="${dna}">
  ${appId}-${dna}
</mwc-list-item>
`
)}
</mwc-select>
<mwc-textfield @input=${() => this._nameField.reportValidity()} id="name-field" label="Name" autoValidate=true required outlined></mwc-textfield>
<mwc-textfield @input=${() => this._uiUrlField.reportValidity()} id="ui-url-field" label="UI zip file URL" autoValidate=true required outlined></mwc-textfield>
<mwc-textfield @input=${() => this._logoUrlField.reportValidity()} id="logo-url-field" label="Logo Image URL" autoValidate=true required outlined></mwc-textfield>

<mwc-button id="primary-action-button" slot="primaryAction" @click=${this.handleOk}>ok</mwc-button>
<mwc-button slot="secondaryAction"  dialogAction="cancel">cancel</mwc-button>
</mwc-dialog>
`
  }
  static get scopedElements() {
    return {
      "mwc-select": Select,
      "mwc-list-item": ListItem,
      "mwc-button": Button,
      "mwc-dialog": Dialog,
      "mwc-textfield": TextField,
    };
  }
  static get styles() {
    return [
      sharedStyles,
      css`
mwc-select {
display: block;
margin-top: 10px;
}
mwc-textfield {
margin-top: 10px;
}
`,
    ];
  }
}
