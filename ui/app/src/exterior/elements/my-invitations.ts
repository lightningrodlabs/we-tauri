import { HeaderHashB64 } from "@holochain-open-dev/core-types";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";

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

  renderInvitations(
    invitations: Record<HeaderHashB64, JoinMembraneInvitation>
  ) {
    return html`
      <h3>Invitations to join a We</h3>
      <mwc-list>
        ${Object.entries(invitations).map(
          ([headerHash, invitation]) =>
            html`
              <div class="row">
                <mwc-list-item>${this.weName(invitation)}</mwc-list-item>
                <mwc-button
                  label="JOIN"
                  @click=${() => this.join(headerHash, invitation)}
                ></mwc-button>
              </div>
            `
        )}
      </mwc-list>
    `;
  }

  render() {
    return this._myInvitations.render({
      complete: (i) => this.renderInvitations(i),
    });
  }
}
