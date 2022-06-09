import { HeaderHashB64, AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { ProfileDetail, AgentAvatar } from "@holochain-open-dev/profiles";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { WeContext } from "./we-context";


export class MyInvitations extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext })
  wesStore!: WesStore;

  _myInvitations = new TaskSubscriber(this, () =>
    this.wesStore.membraneInvitationsStore.fetchMyInvitations()
  );

  async join(
    invitationHeaderHash: HeaderHashB64,
    invitation: JoinMembraneInvitation
  ) {
    const properties = decode(invitation.cloneDnaRecipe.properties) as any;
    await this.wesStore.joinWe(
      invitationHeaderHash,
      properties.name,
      properties.logo_src,
      properties.timestamp
    );
  }

  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).name;
  }

  inviter(invitation: JoinMembraneInvitation) {
    return invitation.inviter;
  }

  renderInvitations(
    invitations: Record<HeaderHashB64, JoinMembraneInvitation>
  ) {
    return html`
    <div class="content-pane">
      <h3>Pending invitations to join a We</h3>
      <mwc-list>
        ${Object.entries(invitations).map(
          ([headerHash, invitation]) =>
            html`
              <div class="row">
                <mwc-list-item>
                ${this.weName(invitation)}
                </mwc-list-item>
                <mwc-button raised
                  label="JOIN"
                  @click=${() => this.join(headerHash, invitation)}
                ></mwc-button>
              </div>
            `
        )}
      </mwc-list>
    </div>
    `;
  }

  render() {
    return this._myInvitations.render({
      complete: (i) => this.renderInvitations(i),
    });
  }


  static get scopedElements() {
    return {
      "we-context": WeContext,
      "profile-detail": ProfileDetail,
      "agent-avatar": AgentAvatar,
    };
  }

  static get styles() {
    return css`
      .content-pane {
        padding: 30px;
        font-family: Arial, Helvetica, sans-serif;
      }

    `
  }
}
