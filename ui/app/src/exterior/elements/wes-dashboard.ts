import { contextProvided, ContextProvider } from "@lit-labs/context";
import { state, query } from "lit/decorators.js";
import { AppWebsocket, AdminWebsocket, InstalledCell } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import {
  IconButton,
  Button,
  CircularProgress,
} from "@scoped-elements/material-web";
import { classMap } from "lit/directives/class-map.js";
import { DnaHashB64 } from "@holochain-open-dev/core-types";
import { HoloIdenticon } from "@holochain-open-dev/utils";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { CreateWeDialog } from "./create-we-dialog";
import { WeStore } from "../../interior/we-store";
import { WeDashboard } from "../../interior/elements/we-dashboard";
import { WeLogo } from "../../interior/elements/we-logo";
import { WeContext } from "./we-context";
import { sharedStyles } from "../../sharedStyles";
import { MyInvitations } from "./my-invitations";

export class WesDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext })
  @state()
  wesStore!: WesStore;

  _wes = new TaskSubscriber(this, () => this.wesStore.fetchWes());

  @state()
  _selectedWeId: string | undefined;

  @query("#we-dialog")
  _weDialog!: CreateWeDialog;

  renderWeList(wes: Record<DnaHashB64, WeStore>) {
    return html`<div class="wes">
      ${Object.keys(wes).map(
        (weId) =>
          html`
            <we-context .weId=${weId}>
              <we-logo
                class=${classMap({ highlighted: weId === this._selectedWeId })}
                @click=${() => (this._selectedWeId = weId)}
              ></we-logo>
            </we-context>
          `
      )}
    </div> `;
  }

  renderContent(wes: Record<DnaHashB64, WeStore>) {
    return html`
      <div class="row" style="flex: 1">
        <div class="wes-list">
          <mwc-icon-button
            icon="home"
            class="wes-admin"
            @click=${() => (this._selectedWeId = undefined)}
          ></mwc-icon-button>

          ${this.renderWeList(wes)}

          <mwc-button icon="add_circle" @click=${() => this._weDialog.open()}
            >Add We</mwc-button
          >

          <holo-identicon .hash=${this.wesStore.myAgentPubKey}></holo-identicon>
        </div>

        ${this._selectedWeId
          ? html`
              <we-context .weId=${this._selectedWeId}>
                <we-dashboard></we-dashboard>
              </we-context>
            `
          : html`<my-invitations></my-invitations>`}

        <create-we-dialog id="we-dialog"></create-we-dialog>
      </div>
    `;
  }

  render() {
    return this._wes.render({
      complete: (wes) => this.renderContent(wes),
      pending: () => html`<div class="row center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
    });
  }

  static get scopedElements() {
    return {
      "mwc-icon-button": IconButton,
      "mwc-circular-progress": CircularProgress,
      "mwc-button": Button,
      "holo-identicon": HoloIdenticon,
      "create-we-dialog": CreateWeDialog,
      "my-invitations": MyInvitations,
      "we-dashboard": WeDashboard,
      "we-logo": WeLogo,
      "we-context": WeContext,
    };
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
        }
        .wes-list {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: darkgrey;
          padding: 5px;
        }
        .wes-admin {
          height: 50px;
          width: 50px;
          padding-top: 5px;
          flex-grow: 0;
          border-top: solid 1px gray;
        }
        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }
        .highlighted {
          border: black 2px solid;
        }
      `,
    ];
  }
}
