import { css, html, LitElement } from "lit";
import { consume } from "@lit-labs/context";
import { customElement, query, state } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";

import { weStyles } from "../../shared-styles.js";
import { AgentPubKey, decodeHashFromBase64 } from "@holochain/client";
import { weStoreContext } from "../../context";
import { WeStore } from "../../we-store";
import { groupStoreContext } from "../context";
import { GroupStore } from "../group-store";
import { notify, notifyError, onSubmit } from "@holochain-open-dev/elements";
import { msg } from "@lit/localize";

@customElement("group-invite-member")
export class GroupInviteMember extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  @query("#pubkeyform")
  form!: HTMLFormElement;

  async inviteToJoin(agentPubKey: AgentPubKey) {
    try {
      await this._weStore.inviteToJoinGroup(
        this._groupStore.groupDnaHash,
        agentPubKey
      );
      this.form.reset();

      notify("Invitation sent.");
    } catch (e) {
      notifyError(
        "Error sending the invitation. The public key may be invalid."
      );
      console.log(e);
    }
  }

  render() {
    return html`
      <sl-card style="width: 440px;">
        <div style="margin: 20px;">
          <div class="row">
            <span class="title">${msg("Invite New Member")}</span>
          </div>
          <form
            id="pubkeyform"
            class="row"
            style="align-items: center; margin-top: 20px;"
            ${onSubmit((f) =>
              this.inviteToJoin(decodeHashFromBase64(f.pubkey))
            )}
          >
            <sl-input
              name="pubkey"
              .label=${msg("Public Key")}
              id="pubkey-field"
              required
            ></sl-input>
            <sl-button style="margin: 10px;" variant="primary" type="submit">
              ${msg("Invite")}
            </sl-button>
          </form>
          <div
            class="default-font"
            style="margin-top: 3px; font-size: 0.8em; color: gray; text-align: left;"
          >
            ${msg("ask a friend to send you their public key")}
          </div>
        </div>
      </sl-card>
    `;
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
