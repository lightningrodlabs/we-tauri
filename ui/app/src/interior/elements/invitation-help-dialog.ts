import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { contextProvided } from "@lit-labs/context";
import { EntryHashB64, serializeHash } from "@holochain-open-dev/core-types";
import {
  TextField,
  Card,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { AgentPubKey } from "@holochain/client";

export class InvitationHelpDialog extends ScopedElementsMixin(LitElement) {

  @query("#invitation-help")
  _invitationHelp!: Dialog;

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;


  @property()
  pubKey!: AgentPubKey;

  public open() {
    this._invitationHelp.show();
  }


  render() {

    return html`
      <mwc-snackbar id="copied-snackbar" timeoutMs=4000 labelText="Copied!" style="text-align: center;"></mwc-snackbar>
      <mwc-dialog hideActions id="invitation-help" style="width: 800px; color: black;">
        <div class="column" style="">
          <div>
            Ask the person you would like to invite to send you his/her public key.<br><br>Your own public key is:
          </div>
          <div class="row" style="align-items: center;">
            <div class="pubkey-field">
              ${serializeHash(this.pubKey)}
            </div>
            <div>
              <mwc-icon
                class="copy-icon"
                style="cursor: pointer; margin-left: 10px;"
                @click=${() => {navigator.clipboard.writeText(serializeHash(this.pubKey)); this._copiedSnackbar.show()}}
                >content_copy</mwc-icon>
            </div>
          </div>
          <div style="margin-top: 20px;">
          You can always copy your own public key by pressing on your profile icon in the bottom left corner of the screen.
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <mwc-button raised dialogAction="close">Ok</mwc-button>
        </div>
      </mwc-dialog>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-dialog": Dialog,
      "mwc-snackbar": Snackbar,
    };
  }

  static get styles() {

    const localStyles = css`

      .pubkey-field {
        color: black;
        height: 35px;
        border: 2px solid #939393;
        border-radius: 4px;
        overflow-x: scroll;
        padding: 10px;
        background: #f3f3f3;
        white-space: nowrap;
      }

    `

    return [sharedStyles, localStyles];
  }
}
