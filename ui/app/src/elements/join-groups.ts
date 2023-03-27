import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { consume } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { html, LitElement, css } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { HoloHashMap } from "@holochain-open-dev/utils";
import { ActionHash, encodeHashToBase64 } from "@holochain/client";
import { localized, msg } from "@lit/localize";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import {
  notify,
  notifyError,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { mdiEmail, mdiKey } from "@mdi/js";
import { writeText } from "@tauri-apps/api/clipboard";

import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@holochain-open-dev/elements/elements/holo-identicon.js";
import "@holochain-open-dev/elements/elements/display-error.js";
import "@holochain-open-dev/profiles/elements/profile-list-item-skeleton.js";

import { weStyles } from "../shared-styles.js";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";

@localized()
@customElement("join-groups")
export class JoinGroups extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  @state()
  joining: ActionHash | undefined = undefined;

  _myInvitations = new StoreSubscriber(
    this,
    () => this._weStore.membraneInvitationsStore.myInvitations
  );

  async joinGroup(
    invitationActionHash: ActionHash,
    invitation: JoinMembraneInvitation
  ) {
    this.joining = invitationActionHash;
    const properties = decode(invitation.clone_dna_recipe.properties) as any;
    try {
      await this._weStore.joinGroup(
        invitationActionHash,
        properties.name,
        properties.logo_src,
        invitation.clone_dna_recipe.network_seed as string
      );
      this.dispatchEvent(
        new CustomEvent("group-joined", {
          detail: {
            groupDnaHash: invitation.clone_dna_recipe.resulting_dna_hash,
          },
          bubbles: true,
          composed: true,
        })
      );
      this.joining = undefined;
    } catch (e) {
      if (e.data.data) {
        if (e.data.data.includes("AppAlreadyInstalled")) {
          // TODO: fix this
          notifyError(msg("You are already part of this group"));
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
    return (decode(invitation.clone_dna_recipe.properties) as any).logo_src;
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

  renderInvitations(
    invitations: HoloHashMap<ActionHash, JoinMembraneInvitation>
  ) {
    if (Array.from(invitations.entries()).length == 0) {
      return html` <div>${msg("You have no open invitations")}</div> `;
    } else {
      return html`
        ${Array.from(invitations.entries())
          .sort(([hash_a, a], [hash_b, b]) => b.timestamp - a.timestamp)
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
                <sl-card style="max-width: 800px;">
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
                      <sl-button
                        @click=${() => this.removeInvitation(actionHash)}
                      >
                        ${msg("Reject")}
                      </sl-button>
                      <sl-button
                        style="margin-left: 4px"
                        variant="primary"
                        .loading=${this.joining?.toString() ===
                        actionHash.toString()}
                        @click=${() => this.joinGroup(actionHash, invitation)}
                      >
                        ${msg("Join")}
                      </sl-button>
                    </div>
                  </div>
                </sl-card>
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
        return html`<div class="column center-content">
          <profile-list-item-skeleton></profile-list-item-skeleton
          ><profile-list-item-skeleton></profile-list-item-skeleton
          ><profile-list-item-skeleton></profile-list-item-skeleton>
        </div>`;
      case "complete":
        return html`
          <div class="row title center-content" style="margin-top: 48px;">
            <sl-icon .src=${wrapPathInSvg(mdiEmail)}></sl-icon
            ><span style="margin-left: 10px;">${msg("your invitations:")}</span>
          </div>
          <div
            class="column center-content"
            style="justify-content: space-between; margin-top: 16px; margin-bottom: 32px"
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
      <sl-card>
        <span slot="header">${msg("Joining A Group")}</span>
        <div class="center-content">
          <div style="text-align: left; font-size: 1.15em; line-height: 150%;">
            ${msg(
              "To join a group, send your public key to a member of the group you would like to join and ask them to invite you."
            )}
          </div>

          <div class="column center-content">
            <div class="row title center-content" style="margin-top: 48px;">
              <sl-icon .src=${wrapPathInSvg(mdiKey)}></sl-icon
              ><span style="margin-left: 10px;">${msg("your public key")}</span>
            </div>
            <div style="margin-top: 15px;">
              <sl-tooltip placement="right" .content=${"copy"}>
                <div
                  class="pubkey-field default-font"
                  @click=${() => {
                    writeText(
                      encodeHashToBase64(
                        this._weStore.appAgentWebsocket.myPubKey
                      )
                    );
                    notify("Copied your public key to the clipboard!");
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
      </sl-card>
    `;
  }

  static styles = [
    css`
      .title {
        align-items: center;
        font-family: Roboto, "Open Sans", "Helvetica Neue", sans-serif;
        font-size: 1.2em;
        text-align: center;
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
