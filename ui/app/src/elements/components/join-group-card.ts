import { JoinMembraneInvitation } from '@neighbourhoods/membrane-invitations';
import { consume } from '@lit/context';
import { decode } from '@msgpack/msgpack';
import { html, css, CSSResult } from 'lit';
import { StoreSubscriber } from 'lit-svelte-stores';
import {
  Snackbar,
} from '@scoped-elements/material-web';

import { matrixContext } from '../../context';
import { MatrixStore } from '../../matrix-store';
import { sharedStyles } from '../../sharedStyles';
import { property, query, state } from 'lit/decorators.js';
import { HoloHashMap } from '@holochain-open-dev/utils';
import { AsyncStatus } from '@holochain-open-dev/stores';
import { CreateNeighbourhoodDialog } from '../dialogs/create-nh-dialog';
import { SlTooltip } from '@scoped-elements/shoelace';
import { ActionHash, encodeHashToBase64 } from '@holochain/client';
import { NHButton, NHButtonGroup, NHCard, NHComponent } from '@neighbourhoods/design-system-components';
import { generateHashHTML } from './helpers/functions';
import { b64images } from '@neighbourhoods/design-system-styles';

export class JoinGroupCard extends NHComponent {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;

  _myInvitations = new StoreSubscriber(
    this,
    () => this.matrixStore.membraneInvitationsStore.myInvitations,
    () => [this.matrixStore],
  );

  @query('#copied-snackbar')
  _copiedSnackbar!: Snackbar;

  async joinGroup(invitationActionHash: ActionHash, invitation: JoinMembraneInvitation) {
    const properties = decode(invitation.clone_dna_recipe.properties) as any;
    await this.matrixStore
      .joinWeGroup(
        invitationActionHash,
        properties.name,
        properties.logoSrc,
        properties.networkSeed,
        properties.caPubKey,
      )
      .then(weGroupId => {
        this.dispatchEvent(
          new CustomEvent('we-group-joined', {
            detail: weGroupId,
            bubbles: true,
            composed: true,
          }),
        );
      })
      .catch(e => {
        if (e.data) {
          if (e.data.includes('AppAlreadyInstalled')) {
            (this.shadowRoot?.getElementById('error-snackbar') as Snackbar).show();
          }
        }
      });
  }

  async removeInvitation(invitationActionHash: ActionHash) {
    await this.matrixStore.removeInvitation(invitationActionHash);
  }

  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).name;
  }

  weImg(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).logoSrc;
  }

  inviter(invitation: JoinMembraneInvitation) {
    return invitation.inviter;
  }

  getDate(invitation: JoinMembraneInvitation) {
    const delta_ms = Date.now() - invitation.timestamp / 1000;
    const delta = delta_ms / 1000;
    if (delta < 0) {
      return '-';
    } else if (delta < 60) {
      return 'seconds ago';
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

  async refreshInvitations() {
    this.matrixStore.membraneInvitationsStore.client.getMyInvitations()
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

  renderInvitations(invitations: HoloHashMap<ActionHash, JoinMembraneInvitation>) {
    if ([...invitations.entries()].length == 0) {
      return html`
        <div style="display: flex; justify-content: space-between;">
          <p>You have no open invitations...</p>
          <nh-button
            .variant=${"neutral"}
            @click=${() => this.refreshInvitations()}
            .iconImageB64=${b64images.icons.refresh}
            .size=${"icon-lg"}
          >Refresh</nh-button>
        </div>
      `;
    } else {
      return html`
        ${[...invitations
          .entries()]
          .sort(([hash_a, a], [hash_b, b]) => b.timestamp - a.timestamp)
          .filter((obj, idx, arr) => {
            return (
              arr
                .map(mapObj => JSON.stringify(mapObj[1].clone_dna_recipe.resulting_dna_hash))
                .indexOf(JSON.stringify(obj[1].clone_dna_recipe.resulting_dna_hash)) === idx
            );
          })
          .map(([actionHash, invitation]) => {
            // TODO: refactor this into a component and correct layout at different screen sizes
            return html`
              <div class="column" style="align-items: right; width: 100%;">
                <nh-card .theme=${"dark"} class="nested-card">
                  <nh-button-group .direction=${"horizontal"} >

                    <div slot="button-fixed" style="display: flex; gap: 1rem; align-items: baseline;">
                        <div style="display:flex; overflow: hidden; width: 6rem;">${generateHashHTML(encodeHashToBase64(this.inviter(invitation)))}</div>
                        <span style="text-align:center">invited you to join
                          <img
                            class="identicon"
                            alt="Neighbourhood image"
                            src=${this.weImg(invitation)}
                            style="position: relative; top: 1.25em; padding: 0 8px;"
                          />
                          ${this.weName(invitation)}
                        </span>
                        <div style="font-size: 0.7em; color: gray; text-align: right; margin-top: -4px;">
                          ${this.getDate(invitation)}
                        </div>
                    </div>
                    <div slot="actions">
                      <div slot="buttons" style="display: flex; gap: 4px; padding-top: 24px; margin-left: 8px">
                        <nh-button
                          .size=${"sm"}
                          .variant=${"success"}
                          class="accept-invitation"
                          @click=${() => this.joinGroup(actionHash, invitation)}
                        >Join</nh-button>
                        <nh-button
                          class="delete-invitation"
                          .size=${"sm"}
                          .variant=${"danger"}
                          @click=${() => this.removeInvitation(actionHash)}
                        >Reject</nh-button>
                      </div>
                    </div>
                  </nh-button-group>
                </nh-card>
              </div>
            `;
          })}

        <div class="refresh-button-row">
          <nh-button
            .variant=${"neutral"}
            @click=${() => this.refreshInvitations()}
            .iconImageB64=${b64images.icons.refresh}
            .size=${"icon-lg"}
          >Refresh</nh-button>
        </div>
      `;
    }
  }

  renderInvitationsBlock(invitations: AsyncStatus<HoloHashMap<ActionHash, JoinMembraneInvitation>>) {
    return html`
      ${this.renderErrorSnackbar()}
      <h2>Your invitations:</h2>
      </div>
      <div>
        ${invitations.status === 'complete' ? this.renderInvitations(invitations.value) : html``}
      </div>
    `;
  }

  render() {
    return html`
      <mwc-snackbar id="copied-snackbar" timeoutMs="4000" labelText="Copied!"></mwc-snackbar>

      <nh-card .theme=${"dark"} .heading=${"Joining A Neighbourhood"}>
        <div>
          <p>
            To join a neighbourhood, send your public key to a member of the neighbourhood you
            would like to join and ask them to invite you.
          </p>

          <div>
            <nh-card .theme=${"dark"} .title=${"Your public key:"} class="nested-card">
              <div
                class="pubkey-field"
              >
                <nh-button
                  .variant=${"primary"}
                  .size=${"auto"}
                  .iconImageB64=${b64images.icons.copy}
                  @click=${() => {
                    navigator.clipboard.writeText(
                      encodeHashToBase64(this.matrixStore.myAgentPubKey),
                      );
                      this._copiedSnackbar.show();
                      this.requestUpdate();
                    }}
                  >
                  ${generateHashHTML(encodeHashToBase64(this.matrixStore.myAgentPubKey))}
                </nh-button>
              </div>
            </nh-card>
            <p class="label">
              Click above to copy your public key, ready to send to a prospective neighbour
            </p>
          </div>

          ${this.renderInvitationsBlock(this._myInvitations.value)}
        </div>
      </nh-card>
    `;
  }

  static elementDefinitions = {
      'mwc-snackbar': Snackbar,
      'create-we-group-dialog': CreateNeighbourhoodDialog,
      'nh-card': NHCard,
      'nh-button-group': NHButtonGroup,
      'nh-button': NHButton,
  }

  static styles: CSSResult[] = [
      super.styles as CSSResult,
      css`
        :host {
          --cell-hash-border-radius: calc(1px * var(--nh-radii-sm));
          --cell-hash-padding: calc(1px * var(--nh-spacing-sm));
          --cell-hash-font-size: calc(1px * var(--nh-font-size-sm));
        }

        .identicon {
          height: 3rem;
          border-radius: 100%;
        }

        .refresh-button-row {
          margin: calc(1px * var(--nh-spacing-lg)) 0;
          display: grid;
          place-content: center;
        }

        .pubkey-field button {
          cursor: pointer;
          display: flex;
          gap: calc(1px * var(--nh-spacing-lg));
          align-items: center;
          justify-content: center;
        }

        .pubkey-field nh-button:hover {
          color: var(--nh-theme-accent-default) !important;
        }

        p {
          margin: 0;
          margin-bottom: calc(1px * var(--nh-spacing-lg));
        }

        h2 {
          font-family: var(--nh-font-families-body);
          font-weight: var(--nh-font-weights-body-regular);
          margin: calc(1px * var(--nh-spacing-xl)) 0;
        }

        .label {
          color: var(--nh-theme-fg-muted);
        }
      `
    ];
}
