import { ContextProvider } from "@lit-labs/context";
import { state, query } from "lit/decorators.js";
import { AppWebsocket, AdminWebsocket, InstalledCell } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { HolochainClient } from "@holochain-open-dev/cell-client";

import { sharedStyles } from "./sharedStyles";
import { MatrixStore } from "./matrix-store";
import { matrixContext } from "./context";
import { MainDashboard } from "./main-dashboard";

export class WeApp extends ScopedElementsMixin(LitElement) {
  private _matrixStore!: MatrixStore;

  @state()
  loading = true;

  async firstUpdated() {
    const adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:${process.env.ADMIN_PORT}`
    );

    const appWebsocket = await AppWebsocket.connect(
      `ws://localhost:${process.env.HC_PORT}`,
    );

    const holochainClient = new HolochainClient(appWebsocket);

    const weAppInfo = await appWebsocket.appInfo( { installed_app_id: "we"} );
    this._matrixStore = new MatrixStore(holochainClient, adminWebsocket, weAppInfo);
    new ContextProvider(this, matrixContext, this._matrixStore);

    this.loading = false;
  }

  render() {
    if (this.loading)
      return html`<div class="row center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html` <main-dashboard style="flex: 1;"></main-dashboard> `;
  }

  static get scopedElements() {
    return {
      "main-dashboard": MainDashboard,
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
