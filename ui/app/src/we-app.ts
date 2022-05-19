import { ContextProvider } from "@lit-labs/context";
import { state, query } from "lit/decorators.js";
import { AppWebsocket, AdminWebsocket, InstalledCell } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { HolochainClient } from "@holochain-open-dev/cell-client";

import { sharedStyles } from "./sharedStyles";
import { WesStore } from "./exterior/wes-store";
import { wesContext } from "./exterior/context";
import { WesDashboard } from "./exterior/elements/wes-dashboard";

export class WeApp extends ScopedElementsMixin(LitElement) {
  private _store!: WesStore;

  @state()
  loading = true;

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

    this.loading = false;
  }

  render() {
    if (this.loading)
      return html`<div class="row center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html` <wes-dashboard style="flex: 1"></wes-dashboard> `;
  }

  static get scopedElements() {
    return {
      "wes-dashboard": WesDashboard,
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
      `,
    ];
  }
}
