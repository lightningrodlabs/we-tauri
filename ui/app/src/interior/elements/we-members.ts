import { html, LitElement } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListProfiles } from "@holochain-open-dev/profiles";
import { Button, TextField } from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { query, state } from "lit/decorators.js";

import { sharedStyles } from "../../sharedStyles";
import { WeStore } from "../we-store";
import { weContext } from "../context";

export class WeMembers extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  @state()
  _pubKey: AgentPubKeyB64 | undefined;

  async inviteToJoin(agentPubKey: AgentPubKeyB64) {
    await this._store.inviteToJoin(agentPubKey);
  }

  render() {
    return html`
      <div>
        <list-profiles></list-profiles>
        <mwc-textfield
          label="Agent Pub Key"
          id="pubkey-field"
          autoValidate
          @input=${(e) => (this._pubKey = e.target.value)}
          outlined
        ></mwc-textfield>
        <mwc-button
          label="INVITE"
          @click=${() => this.inviteToJoin(this._pubKey!)}
          .disabled=${!this._pubKey}
        ></mwc-button>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "list-profiles": ListProfiles,
      "mwc-button": Button,
      "mwc-textfield": TextField,
    };
  }

  static styles = [sharedStyles];
}
