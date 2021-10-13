import { ContextProvider } from "@lit-labs/context";
import { state } from "lit/decorators.js";
import { WeController, WesStore, wesContext } from "@we/elements";
import {
  AppWebsocket,
  AdminWebsocket,
  InstalledCell,
} from "@holochain/conductor-api";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { get } from "svelte/store";

export class WeApp extends ScopedElementsMixin(LitElement) {
  @state()
  loaded = false;

  private _store!: WesStore;

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

  render() {
    if (!this.loaded) return html`<span>Loading...</span>`;
    return html` <we-controller></we-controller> `;
  }

  static get scopedElements() {
    return {
      "we-controller": WeController,
    };
  }
  static get styles() {
    return [
      css`
        :host {
          margin: 0px;
        }
      `,
    ];
  }
}
