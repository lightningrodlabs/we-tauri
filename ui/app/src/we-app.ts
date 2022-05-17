import { ContextProvider, provide } from "@holochain-open-dev/context";
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
import { HolochainClient } from "@holochain-open-dev/cell-client";
import { DnaHashB64 } from "@holochain-open-dev/core-types";

import { sharedStyles } from "./sharedStyles";
import { WesStore } from "./exterior/wes-store";
import { CreateWeDialog } from "./exterior/elements/create-we-dialog";
import { wesContext } from "./exterior/context";
import { weContext } from "./interior/context";
import { WeStore } from "./interior/we-store";
import { WeDetail } from "./interior/elements/we-detail";
import { classMap } from "lit/directives/class-map.js";
import { WeLogo } from "./interior/elements/we-logo";
import { WeContext } from "./exterior/elements/we-context";

export class WeApp extends ScopedElementsMixin(LitElement) {
  private _store!: WesStore;

  @state()
  _wes!: TaskSubscriber<Record<DnaHashB64, WeStore>>;

  @state()
  _selectedWeId: string | undefined;

  @query("#we-dialog")
  _weDialog!: CreateWeDialog;

  async firstUpdated() {
    const adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:${process.env.ADMIN_PORT}`
    );

    const holochainClient = await HolochainClient.connect(
      `ws://localhost:${process.env.HC_PORT}`,
      "we"
    );

    this._store = new WesStore(holochainClient, adminWebsocket);
    new ContextProvider(this, wesContext, this._store);

    this._wes = new TaskSubscriber(this, () => this._store.fetchWes());

  }

  renderWeList() {
    return html`<div class="wes">
      ${Object.keys(this._wes.value).map(
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

  render() {
    if (!this._wes || this._wes.loading)
      return html`<div class="row center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <div class="wes-list">
        ${this.renderWeList()}

        <mwc-button icon="add_circle" @click=${() => this._weDialog.open()}
          >Add We</mwc-button
        >
        <mwc-icon-button
          icon="settings"
          class="wes-admin"
          @click=${() => (this._selectedWeId = undefined)}
        ></mwc-icon-button>
      </div>

      ${this._selectedWeId
        ? html`
            <we-context .weId=${this._selectedWeId}>
              <we-detail></we-detail>
            </we-context>
          `
        : html`How to join a we?`}

      <create-we-dialog id="we-dialog"></create-we-dialog>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-icon-button": IconButton,
      "mwc-circular-progress": CircularProgress,
      "mwc-button": Button,
      "create-we-dialog": CreateWeDialog,
      "we-detail": WeDetail,
      "we-logo": WeLogo,
      "we-context": WeContext,
    };
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          margin: 0px;
          height: 100vh;
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
        we-wes {
          flex-grow: 0;
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
