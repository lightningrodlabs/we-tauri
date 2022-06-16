import { css, html, LitElement } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListProfiles } from "@holochain-open-dev/profiles";
import { Button, TextField, Snackbar, Icon, Dialog } from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { AgentPubKeyB64, serializeHash } from "@holochain-open-dev/core-types";
import { query, state } from "lit/decorators.js";

import { sharedStyles } from "../../sharedStyles";
import { WeStore } from "../we-store";
import { weContext } from "../context";
import { InvitationHelpDialog } from "./invitation-help-dialog";



export class WeMembers extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  @state()
  _pubKey: AgentPubKeyB64 | undefined;

  @query("#snackbar-success")
  _snackbarSuccess!: Snackbar;

  @query("#snackbar-error")
  _snackbarError!: Snackbar;

  @query("#pubkey-field")
  _pubkeyField!: TextField;

  @query("#invitation-help")
  _invitationHelp!: InvitationHelpDialog;

  async inviteToJoin(agentPubKey: AgentPubKeyB64) {

    this._store.inviteToJoin(agentPubKey)
      .then((r) => {
        this._pubkeyField.value = "";
        this._snackbarSuccess.show();
      }).catch((e) => {
        this._snackbarError.show();
        console.log(e);
      });
  }

  showInvitationHelp() {
    this._invitationHelp.open();
  }



  render() {
    return html`
      <div>
        <mwc-snackbar id="snackbar-success" timeoutMs=4000 labelText="Invitation sent." style="text-align: center;"></mwc-snackbar>
        <mwc-snackbar id="snackbar-error" timeoutMs=4000 labelText="Error. Public key may be invalid." style="text-align: center;"></mwc-snackbar>
        <invitation-help-dialog id="invitation-help" .pubKey=${this._store.myAgentPubKey}></invitation-help-dialog>
        <list-profiles></list-profiles>
        <div class="row" style="align-items: center;">
          <h4>invite new member:</h4>
          <mwc-icon class="help-icon" @click=${() => this.showInvitationHelp()}>info</mwc-icon>
        </div>
        <div class="row" style="align-items: center;">
          <mwc-textfield
            label="Agent Public Key"
            id="pubkey-field"
            autoValidate
            @input=${(e) => (this._pubKey = e.target.value)}
            outlined
          ></mwc-textfield>
          <mwc-button
            style="margin: 10px;"
            raised
            label="INVITE"
            @click=${() => this.inviteToJoin(this._pubKey!)}
            .disabled=${!this._pubKey}
          ></mwc-button>
        </div>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "list-profiles": ListProfiles,
      "mwc-button": Button,
      "mwc-textfield": TextField,
      "mwc-snackbar": Snackbar,
      "mwc-icon": Icon,
      "mwc-dialog": Dialog,
      "invitation-help-dialog": InvitationHelpDialog,
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
        color: #8a8a8a
      }

      .copy-icon:hover {
        color: black;
      }
    `

    return [sharedStyles, localStyles];
  }
}
