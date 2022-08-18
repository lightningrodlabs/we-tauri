import { css, html, LitElement } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  Button,
  TextField,
  Snackbar,
  Icon,
  Dialog,
  Card,
} from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { property, query, state } from "lit/decorators.js";

import { sharedStyles } from "../sharedStyles";
import { MatrixStore } from "../matrix-store";
import { matrixContext, weGroupContext } from "../context";
import { DnaHash } from "@holochain/client";
import { deserializeHash } from "@holochain-open-dev/utils";

export class InvitationsBlock extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @state()
  _inviteePubKey: AgentPubKeyB64 | undefined;

  @query("#snackbar-success")
  _snackbarSuccess!: Snackbar;

  @query("#snackbar-error")
  _snackbarError!: Snackbar;

  @query("#pubkey-field")
  _pubkeyField!: TextField;

  async inviteToJoin(agentPubKey: AgentPubKeyB64) {
    this._matrixStore
      .inviteToJoinGroup(this.weGroupId, deserializeHash(agentPubKey))
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

      <mwc-card style="max-width: 480px;">
        <div style="margin: 20px;">
          <div class="row">
            <span class="title"
              >Invite new member</span
            >
          </div>
          <div class="row" style="align-items: center; margin-top: 20px;">
            <mwc-textfield
              label="Public Key"
              id="pubkey-field"
              autoValidate
              @input=${(e) => (this._inviteePubKey = e.target.value)}
              outlined
            ></mwc-textfield>
            <mwc-button
              style="margin: 10px;"
              raised
              icon="send"
              label="INVITE"
              @click=${() => this.inviteToJoin(this._inviteePubKey!)}
              .disabled=${!this._inviteePubKey}
            ></mwc-button>
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
      "mwc-button": Button,
      "mwc-textfield": TextField,
      "mwc-snackbar": Snackbar,
      "mwc-icon": Icon,
      "mwc-dialog": Dialog,
      "mwc-card": Card,
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

    return [sharedStyles, localStyles];
  }
}
