import { serializeHash } from "@holochain-open-dev/utils";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import {
  Button,
  List,
  ListItem,
  Card,
  Snackbar,
  Icon,
  Dialog,
} from "@scoped-elements/material-web";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { query } from "lit/decorators.js";
import { HoloHashMap } from "@holochain-open-dev/utils";
import { HoloIdenticon } from "@holochain-open-dev/elements";
import { CreateWeGroupDialog } from "../dialogs/create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { ActionHash } from "@holochain/client";

export class JoinGroupCard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  _myInvitations = new TaskSubscriber(
    this,
    () => this.matrixStore.membraneInvitationsStore.fetchMyInvitations(),
    () => [this.matrixStore],
  );

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;

  async joinGroup(
    invitationActionHash: ActionHash,
    invitation: JoinMembraneInvitation
  ) {
    const properties = decode(invitation.cloneDnaRecipe.properties) as any;
    await this.matrixStore
      .joinWeGroup(
        invitationActionHash,
        properties.name,
        properties.logoSrc,
        properties.timestamp
      )
      .then((weGroupId) => {
        this.dispatchEvent(
          new CustomEvent("we-group-joined", {
            detail: weGroupId,
            bubbles: true,
            composed: true,
          })
        );
      })
      .catch((e) => {
        if (e.data.data) {
          if (e.data.data.includes("AppAlreadyInstalled")) {
            (
              this.shadowRoot?.getElementById("error-snackbar") as Snackbar
            ).show();
          }
        }
      });
  }

  async removeInvitation(invitationActionHash: ActionHash) {
    await this.matrixStore.removeInvitation(invitationActionHash);
  }

  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).name;
  }

  weImg(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).logoSrc;
  }

  inviter(invitation: JoinMembraneInvitation) {
    return invitation.inviter;
  }

  getDate(invitation: JoinMembraneInvitation) {
    const delta_ms = Date.now() - invitation.timestamp / 1000;
    const delta = delta_ms / 1000;
    if (delta < 0) {
      return "-";
    } else if (delta < 60) {
      return "seconds ago";
    } else if (delta < 120) {
      return `${Math.floor(delta / 60)} minute ago`;
    } else if (delta < 3600) {
      return `${Math.floor(delta / 60)} minutes ago`;
    } else if (delta < 7200) {
      return `${Math.floor(delta / 3600)} hour ago`;
    } else if (delta < 86400) {
      return `${Math.floor(delta / 3600)} hours ago`;
    } else if (delta < 172800) {
      return `${Math.floor(delta / 86400)} day ago`;
    } else if (delta < 2592000) {
      return `${Math.floor(delta / 86400)} days ago`;
    } else if (delta < 5184000) {
      return `${Math.floor(delta / 2592000)} month ago`;
    } else if (delta < 31104000) {
      return `${Math.floor(delta / 2592000)} months ago`;
    } else if (delta < 62208000) {
      return `${Math.floor(delta / 31104000)} year ago`;
    } else {
      return `${Math.floor(delta / 31104000)} years ago`;
    }
  }

  renderErrorSnackbar() {
    return html`
      <mwc-snackbar
        style="text-align: center;"
        id="error-snackbar"
        labelText="You are already part of this Group!"
      >
      </mwc-snackbar>
    `;
  }

  renderInvitations(
    invitations: HoloHashMap<ActionHash, JoinMembraneInvitation>
  ) {
    if (invitations.entries().length == 0) {
      return html`
        <div>You have no open invitations...</div>
        <mwc-button
          style="margin-top: 20px;"
          @click=${() => this._myInvitations.run()}
          icon="refresh"
          >Refresh</mwc-button
        >
      `;
    } else {
      return html`
        ${invitations.entries()
          .sort(([hash_a, a], [hash_b, b]) => b.timestamp - a.timestamp)
          .map(([actionHash, invitation]) => {
            return html`
              <div class="column" style="align-items: right; width: 100%;">
                <mwc-card style="max-width: 800px; margin: 5px;">
                  <div
                    class="row"
                    style="align-items: center; padding: 5px; padding-left: 15px; font-size: 1.2em"
                  >
                    <holo-identicon
                      .hash=${this.inviter(invitation)}
                    ></holo-identicon>
                    <span style="margin-left: 10px;">invited you to join</span>
                    <img
                      style="margin-left: 10px;"
                      class="we-image"
                      src=${this.weImg(invitation)}
                    />
                    <div style="font-weight: bold; margin-left: 10px;">
                      ${this.weName(invitation)}
                    </div>
                    <div class="row" style="margin-left: auto;">
                      <mwc-button
                        class="accept-invitation"
                        raised
                        label="JOIN"
                        icon="check"
                        @click=${() => this.joinGroup(actionHash, invitation)}
                      ></mwc-button>
                      <mwc-button
                        class="delete-invitation"
                        raised
                        label="REJECT"
                        icon="close"
                        @click=${() => this.removeInvitation(actionHash)}
                      >
                      </mwc-button>
                    </div>
                  </div>
                </mwc-card>
                <div
                  style="font-size: 0.7em; color: gray; text-align: right; margin-top: -4px;"
                >
                  ${this.getDate(invitation)}
                </div>
              </div>
            `;
          })}
        <mwc-button
          style="margin-top: 20px;"
          @click=${() => this._myInvitations.run()}
          icon="refresh"
          >Refresh</mwc-button
        >
      `;
    }
  }

  renderInvitationsBlock(
    invitations: HoloHashMap<ActionHash, JoinMembraneInvitation>
  ) {
    return html`
      ${this.renderErrorSnackbar()}
      <div class="row title center-content" style="margin-top: 70px;">
        <mwc-icon>mail</mwc-icon
        ><span style="margin-left: 10px;">your invitations:</span>
      </div>
      <div
        class="column center-content"
        style="justify-content: space-between; margin-top: 30px;"
      >
        ${this.renderInvitations(invitations)}
      </div>
    `;
  }

  render() {
    return html`
      <mwc-snackbar
        id="copied-snackbar"
        timeoutMs="4000"
        labelText="Copied!"
      ></mwc-snackbar>

      <mwc-card>

        <div class="column content-pane">

          <div style="font-size: 1.7em;">
            Joining A Group
          </div>
          <div class="center-content">
            <div style="text-align: left; margin-top: 40px; font-size: 1.15em; line-height: 150%;">
              To join a group, send your public key to a member of the group you would like to join and ask them to invite you.
            </div>

            <div class="column center-content">
              <div class="row title center-content" style="margin-top: 50px;"><mwc-icon>key</mwc-icon><span style="margin-left: 10px;">your public key</span></div>
              <div style="margin-top: 15px;">
                <sl-tooltip placement="right" .content=${"copy"}>
                  <div class="pubkey-field default-font"
                    @click=${() => {
                      navigator.clipboard.writeText(
                        serializeHash(this.matrixStore.myAgentPubKey)
                      );
                      this._copiedSnackbar.show()
                    }}>
                    ${serializeHash(this.matrixStore.myAgentPubKey)}
                  </div>
                </sl-tooltip>
                <div style="margin-top: 3px; font-size: 0.8em; color: gray; text-align: center">
                send your public key to your friends if they want to invite you to their group
                </div>
              </div>
            </div>

            ${this._myInvitations.render({
              complete: (i) => this.renderInvitationsBlock(i),
            })
            }

          </div>

        </div>
      </mwc-card>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-list": List,
      "mwc-list-item": ListItem,
      "mwc-card": Card,
      "mwc-icon": Icon,
      "mwc-snackbar": Snackbar,
      "holo-identicon": HoloIdenticon,
      "create-we-group-dialog": CreateWeGroupDialog,
      "sl-tooltip": SlTooltip,
      "mwc-dialog": Dialog,
    };
  }

  static get styles() {
    let localStyles = css`
      .content-pane {
        padding: 30px;
        font-family: Arial, sans-serif;
      }

      .default-font {
        font-family: Roboto, "Open Sans", "Helvetica Neue", sans-serif;
      }

      .title {
        align-items: center;
        font-family: Roboto, "Open Sans", "Helvetica Neue", sans-serif;
        font-size: 1.2em;
        text-align: center;
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

      .pubkey-field {
        color: black;
        background: #f4f0fa;
        border-radius: 4px;
        overflow-x: auto;
        padding: 10px;
        white-space: nowrap;
        cursor: pointer;
      }
    `;

    return [sharedStyles, localStyles];
  }
}
