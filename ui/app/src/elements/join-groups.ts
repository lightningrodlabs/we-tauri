import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { consume } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import {
  MdOutlinedButton,
  MdFilledButton,
  Card,
  Snackbar,
  MdIcon,
} from "@scoped-elements/material-web";
import { query } from "lit/decorators.js";
import { HoloHashMap } from "@holochain-open-dev/utils";
import { DisplayError, HoloIdenticon } from "@holochain-open-dev/elements";
import { SlTooltip } from "@scoped-elements/shoelace";
import { ActionHash, encodeHashToBase64 } from "@holochain/client";
import { localized, msg } from "@lit/localize";
import { StoreSubscriber } from "@holochain-open-dev/stores";

import { weStyles } from "../shared-styles.js";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { ProfileListItemSkeleton } from "@holochain-open-dev/profiles";

@localized()
export class JoinGroups extends ScopedElementsMixin(LitElement) {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  _myInvitations = new StoreSubscriber(
    this,
    () => this._weStore.membraneInvitationsStore.myInvitations
  );

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;

  async joinGroup(
    invitationActionHash: ActionHash,
    invitation: JoinMembraneInvitation
  ) {
    const properties = decode(invitation.clone_dna_recipe.properties) as any;
    try {
      await this._weStore.joinGroup(
        invitationActionHash,
        properties.name,
        properties.logoSrc,
        invitation.clone_dna_recipe.network_seed as string
      );
      this.dispatchEvent(
        new CustomEvent("we-group-joined", {
          detail: {
            groupDnaHash: invitation.clone_dna_recipe.resulting_dna_hash,
          },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e) {
      if (e.data.data) {
        if (e.data.data.includes("AppAlreadyInstalled")) {
          (
            this.shadowRoot?.getElementById("error-snackbar") as Snackbar
          ).show();
        }
      }
    }
  }

  async removeInvitation(invitationActionHash: ActionHash) {
    await this._weStore.membraneInvitationsStore.client.removeInvitation(
      invitationActionHash
    );
  }

  groupName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).name;
  }

  groupLogoSrc(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).logoSrc;
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
    if (Array.from(invitations.entries()).length == 0) {
      return html` <div>${msg("You have no open invitations")}</div> `;
    } else {
      return html`
        ${Array.from(invitations.entries())
          .sort(([_hash_a, a], [_hash_b, b]) => b.timestamp - a.timestamp)
          .filter((obj, idx, arr) => {
            return (
              arr
                .map((mapObj) =>
                  JSON.stringify(mapObj[1].clone_dna_recipe.resulting_dna_hash)
                )
                .indexOf(
                  JSON.stringify(obj[1].clone_dna_recipe.resulting_dna_hash)
                ) === idx
            );
          })
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
                    <span style="margin-left: 10px;"
                      >${msg("invited you to join")}</span
                    >
                    <img
                      style="margin-left: 10px;"
                      class="group-image"
                      src=${this.groupLogoSrc(invitation)}
                    />
                    <div style="font-weight: bold; margin-left: 10px;">
                      ${this.groupName(invitation)}
                    </div>
                    <div class="row" style="margin-left: auto;">
                      <md-outlined-button
                        class="delete-invitation"
                        .label=${msg("REJECT")}
                        icon="close"
                        @click=${() => this.removeInvitation(actionHash)}
                      >
                      </md-outlined-button>
                      <md-filled-button
                        class="accept-invitation"
                        .label=${msg("JOIN")}
                        icon="check"
                        @click=${() => this.joinGroup(actionHash, invitation)}
                      ></md-filled-button>
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
      `;
    }
  }

  renderInvitationsBlock() {
    switch (this._myInvitations.value.status) {
      case "pending":
        return html`<div class="column">
          <profile-list-item-skeleton></profile-list-item-skeleton
          ><profile-list-item-skeleton></profile-list-item-skeleton
          ><profile-list-item-skeleton></profile-list-item-skeleton>
        </div>`;
      case "complete":
        return html`
          ${this.renderErrorSnackbar()}
          <div class="row title center-content" style="margin-top: 70px;">
            <md-icon>mail</md-icon
            ><span style="margin-left: 10px;">${msg("your invitations:")}</span>
          </div>
          <div
            class="column center-content"
            style="justify-content: space-between; margin-top: 30px;"
          >
            ${this.renderInvitations(this._myInvitations.value.value)}
          </div>
        `;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching your invitations")}
          .error=${this._myInvitations.value.error}
        ></display-error>`;
    }
  }

  render() {
    return html`
      <mwc-snackbar
        id="copied-snackbar"
        timeoutMs="4000"
        .labelText=${msg("Copied!")}
      ></mwc-snackbar>

      <mwc-card>
        <div class="column content-pane">
          <div style="font-size: 1.7em;">${msg("Joining A Group")}</div>
          <div class="center-content">
            <div
              style="text-align: left; margin-top: 40px; font-size: 1.15em; line-height: 150%;"
            >
              ${msg(
                "To join a group, send your public key to a member of the group you would like to join and ask them to invite you."
              )}
            </div>

            <div class="column center-content">
              <div class="row title center-content" style="margin-top: 50px;">
                <md-icon>key</md-icon
                ><span style="margin-left: 10px;"
                  >${msg("your public key")}</span
                >
              </div>
              <div style="margin-top: 15px;">
                <sl-tooltip placement="right" .content=${"copy"}>
                  <div
                    class="pubkey-field default-font"
                    @click=${() => {
                      navigator.clipboard.writeText(
                        encodeHashToBase64(
                          this._weStore.appAgentWebsocket.myPubKey
                        )
                      );
                      this._copiedSnackbar.show();
                    }}
                  >
                    ${encodeHashToBase64(
                      this._weStore.appAgentWebsocket.myPubKey
                    )}
                  </div>
                </sl-tooltip>
                <div
                  style="margin-top: 3px; font-size: 0.8em; color: gray; text-align: center"
                >
                  ${msg(
                    "send your public key to your friends if they want to invite you to their group"
                  )}
                </div>
              </div>
            </div>

            ${this.renderInvitationsBlock()}
          </div>
        </div>
      </mwc-card>
    `;
  }

  static get scopedElements() {
    return {
      "md-filled-button": MdFilledButton,
      "md-outlined-button": MdOutlinedButton,
      "mwc-card": Card,
      "md-icon": MdIcon,
      "mwc-snackbar": Snackbar,
      "holo-identicon": HoloIdenticon,
      "sl-tooltip": SlTooltip,
      "profile-list-item-skeleton": ProfileListItemSkeleton,
      "display-error": DisplayError,
    };
  }

  static styles = [
    css`
      .content-pane {
        padding: 30px;
        font-family: Arial, sans-serif;
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

      .group-image {
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
    `,
    weStyles,
  ];
}
