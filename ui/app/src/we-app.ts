import { ContextProvider, provide } from "@holochain-open-dev/context";
import { state, query } from "lit/decorators.js";
import { AppWebsocket, AdminWebsocket, InstalledCell } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";

import { weContext } from "./we/context";
import { CreateWeDialog } from "./wes/create-we-dialog";
import { sharedStyles } from "./sharedStyles";
import { WesStore } from "./wes/wes-store";
import { wesContext } from "./wes/context";

export class WeApp extends ScopedElementsMixin(LitElement) {
  @state()
  loaded = false;

  private _store!: WesStore;

  _wes = new StoreSubscriber(this, () => this._store?.wes);

  @state()
  _selectedWeId: string | undefined;

  _selectedWe = new StoreSubscriber(this, () =>
    this._selectedWeId ? this._store?.weStore(this._selectedWeId) : undefined
  );

  @query("#we-dialog")
  _weDialog!: CreateWeDialog;

  async firstUpdated() {
    const adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:${process.env.ADMIN_PORT}`
    );

    const appWebsocket = await AppWebsocket.connect(
      `ws://localhost:${process.env.HC_PORT}`
    );

    this._store = new WesStore(appWebsocket, adminWebsocket);
    await this._store.fetchWes();

    new ContextProvider(this, wesContext, this._store);

    this.loaded = true;
  }

  renderWeList() {
    return html`<div class="wes">
      ${Object.keys(this._wes.value).map(
        (weId) =>
          html`
            <we-logo .highlighted=${weId === this._selectedWeId}></we-logo>
          `
      )}
    </div> `;
  }

  render() {
    if (!this.loaded)
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

      ${this._selectedWe.value
        ? html`<we-detail
            ${provide(weContext, this._selectedWe.value)}
          ></we-detail>`
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
      `,
    ];
  }
}
