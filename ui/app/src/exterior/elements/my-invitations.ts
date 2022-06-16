import { HeaderHashB64, AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { Button, List, ListItem, Card, Snackbar } from "@scoped-elements/material-web";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { sharedStyles } from "../../sharedStyles";
import { query } from "lit/decorators.js";


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
    )
    .then()
    .catch((e) => {
      if (e.data.data) {
        if (e.data.data.includes("AppAlreadyInstalled")) {
          (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
        }
      }
    });
  }

  async removeInvitation(invitationHeaderHash: HeaderHashB64) {
    await this.wesStore.removeInvitation(invitationHeaderHash);
  }

  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).name;
  }

  weImg(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).logo_src;
  }

  inviter(invitation: JoinMembraneInvitation) {
    return invitation.inviter;
  }

  renderErrorSnackbar() {
    return html`
      <mwc-snackbar style="text-align: center;" id="error-snackbar" labelText="You are already part of this We!">
      </mwc-snackbar>
    `;
  }


  renderInvitations(
    invitations: Record<HeaderHashB64, JoinMembraneInvitation>
  ) {
    return html`
    <div class="content-pane">
      ${this.renderErrorSnackbar()}
      <h2>Pending invitations to join a We:</h2>
      <div class="column" style="justify-content: space-between;">
        ${Object.entries(invitations).map(
      ([headerHash, invitation]) => {
        return html`
              <mwc-card style="width: 700px; margin: 5px;">
                  <div class="row" style="align-items: center; padding: 5px; padding-left: 15px; font-size: 1.2em" >
                  <img class="we-image" src=${this.weImg(invitation)}>
                  <div style="font-weight: bold; margin-left: 10px;">${this.weName(invitation)}</div>
                    <div class="row" style="margin-left: auto;">
                      <mwc-button
                        class="accept-invitation"
                        raised
                        label="JOIN"
                        icon="check"
                        @click=${() => this.join(headerHash, invitation)}
                      ></mwc-button>
                      <mwc-button
                        class="delete-invitation"
                        raised
                        label="DELETE"
                        icon="delete"
                        @click=${() => this.removeInvitation(headerHash)}>
                      </mwc-button>
                    </div>
                  </div>
              </mwc-card>
          `
      }
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
      "mwc-snackbar": Snackbar,
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

      .accept-invitation {
        --mdc-theme-primary: #17c200;
      }

      .delete-invitation {
        --mdc-theme-primary: #cf0000;
        margin-left: 5px;
      }

      .we-image {
        height: 30px;
        width: 30px;
        border-radius: 50%;
      }

    `

    return [sharedStyles, localStyles];
  }
}
