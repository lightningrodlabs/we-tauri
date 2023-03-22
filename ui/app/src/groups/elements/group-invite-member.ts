import { css, html, LitElement } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  MdOutlinedButton,
  MdOutlinedTextField,
  Snackbar,
  Card,
} from "@scoped-elements/material-web";
import { consume } from "@lit-labs/context";
import { query, state } from "lit/decorators.js";

import { weStyles } from "../../shared-styles";
import {
  DnaHash,
  AgentPubKeyB64,
  decodeHashFromBase64,
} from "@holochain/client";
import { weStoreContext } from "../../context";
import { WeStore } from "../../we-store";
import { groupStoreContext } from "../context";
import { GenericGroupStore } from "../group-store";

export class GroupInviteMember extends ScopedElementsMixin(LitElement) {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GenericGroupStore<any>;


  @state()
  _inviteePubKey: AgentPubKeyB64 | undefined;

  @query("#snackbar-success")
  _snackbarSuccess!: Snackbar;

  @query("#snackbar-error")
  _snackbarError!: Snackbar;

  @query("#pubkey-field")
  _pubkeyField!: MdOutlinedTextField;

  async inviteToJoin(agentPubKey: AgentPubKeyB64) {
    this._weStore
      .inviteToJoinGroup(this._groupStore.groupDnaHash, decodeHashFromBase64(agentPubKey))
      .then((r) => {
        this._pubkeyField.value = "";
        this._inviteePubKey = undefined;
        this._snackbarSuccess.show();
      })
      .catch((e) => {
        this._snackbarError.show();
        console.log(e);
      });
  }

  render() {
    return html`
      <mwc-snackbar
        id="snackbar-success"
        timeoutMs="4000"
        labelText="Invitation sent."
      ></mwc-snackbar>
      <mwc-snackbar
        id="snackbar-error"
        timeoutMs="4000"
        labelText="Error. Public key may be invalid."
      ></mwc-snackbar>
      <mwc-card style="width: 440px;">
        <div style="margin: 20px;">
          <div class="row">
            <span class="title">Invite New Member</span>
          </div>
          <div class="row" style="align-items: center; margin-top: 20px;">
            <md-outlined-text-field
              label="Public Key"
              id="pubkey-field"
              autoValidate
              @input=${(e) => (this._inviteePubKey = e.target.value)}
              outlined
            ></md-outlined-text-field>
            <md-outlined-button
              style="margin: 10px;"
              raised
              icon="send"
              label="INVITE"
              @click=${() => this.inviteToJoin(this._inviteePubKey!)}
              .disabled=${!this._inviteePubKey}
            ></md-outlined-button>
          </div>
          <div
            class="default-font"
            style="margin-top: 3px; font-size: 0.8em; color: gray; text-align: left;"
          >
            ask a friend to send you their public key
          </div>
        </div>
      </mwc-card>
    `;
  }

  static get scopedElements() {
    return {
      "md-outlined-button": MdOutlinedButton,
      "md-outlined-text-field": MdOutlinedTextField,
      "mwc-card": Card,
      "mwc-snackbar": Snackbar,
    };
  }

  static get styles() {
    const localStyles = css`
      .help-icon {
        margin-left: 10px;
        cursor: pointer;
        color: #454545;
      }
      .help-icon:hover {
        color: #8a8a8a;
      }
      .copy-icon:hover {
        color: black;
      }
    `;

    return [weStyles, localStyles];
  }
}