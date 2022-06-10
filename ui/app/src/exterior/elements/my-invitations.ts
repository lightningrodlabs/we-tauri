import { HeaderHashB64, AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { Button, List, ListItem, Card } from "@scoped-elements/material-web";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { sharedStyles } from "../../sharedStyles";


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
      <h2>Pending invitations to join a We</h2>
      <div class="column" style="justify-content: space-between;">
        ${Object.entries(invitations).map(
          ([headerHash, invitation]) =>
            html`
              <mwc-card style="width: 500px; margin: 5px;">
                  <div class="row" style="align-items: center; padding: 5px;" >
                    <div>${this.weName(invitation)}</div>
                    <div class="row" style="margin-left: auto;">
                        <mwc-button raised
                          label="JOIN"
                          @click=${() => this.join(headerHash, invitation)}
                      ></mwc-button>
                    </div>
                  </div>
              </mwc-card>
          `
        )}
      </div>
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
      "mwc-button": Button,
      "mwc-list": List,
      "mwc-list-item": ListItem,
      "mwc-card": Card,
    };
  }

  static get styles() {
    let localStyles = css`
      .content-pane {
        padding: 30px;
        font-family: Arial, sans-serif,
      }

      h2 {
        font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
      }

    `

    return [sharedStyles, localStyles];
  }
}
