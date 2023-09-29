import { css, CSSResult, html } from "lit";
import {
  TextField,
  Snackbar,
} from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { query, state } from "lit/decorators.js";

import { MatrixStore } from "../../matrix-store";
import { matrixContext, weGroupContext } from "../../context";
import { DnaHash, AgentPubKeyB64, decodeHashFromBase64 } from "@holochain/client";
import { NHButton, NHCard, NHComponentShoelace } from "@neighbourhoods/design-system-components";
import { SlInput } from "@scoped-elements/shoelace";
import { b64images } from "@neighbourhoods/design-system-styles";

export class InvitationsBlock extends NHComponentShoelace {
  // TODO: add Yup schema for hash validation
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
      .inviteToJoinGroup(this.weGroupId, decodeHashFromBase64(agentPubKey))
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

      <nh-card .theme=${"dark"} .heading=${"Invite new neighbour"} .textSize=${"sm"}>
        <div class="content">
          <div class="input-pub-key">
            <div class="field-set">
              <sl-input
                help-text="Ask a friend to send you their public key"
                id="pubkey-field"
                name="pubkey-field"
                type="text"
                size="small"
                placeholder="Public Key"
                required
                @sl-input=${(e) => (this._inviteePubKey = e.target.value)}
              ></sl-input>
            </div>
            <nh-button label="Invite" .variant=${"primary"} .iconImageB64=${b64images.icons.forwardArrow} .clickHandler=${() => this.inviteToJoin(this._inviteePubKey!)} .size=${"md"} .disabled=${!this._inviteePubKey}></nh-button>
          </div>
        </div>
      </nh-card>
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-button": NHButton,
      "sl-input": SlInput,
      "mwc-snackbar": Snackbar,
      "nh-card": NHCard,
    };
  }

  static get styles() {
    return [
      super.styles as CSSResult,
      css`
      sl-input::part(input) {
        --sl-input-spacing-small: calc(1px * var(--nh-spacing-sm));
      }
      sl-input::part(base) {
        height: 3rem !important;
        margin-bottom: 4px;
      }
        .input-pub-key {
          align-items: flex-start;
          justify-content: space-between;
        }

        .content {
          max-width: 20rem;
          margin: 0 auto;
        }

        .content, .field-set {
          flex-direction: column;
        }

        .content, .input-pub-key, .input-pub-key > *, .field-set {
          display: flex;
        }

        .content, .field-set, .input-pub-key {
          gap: calc(1px * var(--nh-spacing-sm));
        }
    `];
  }
}
