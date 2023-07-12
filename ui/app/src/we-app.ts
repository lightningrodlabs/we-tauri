import { ContextProvider } from "@lit-labs/context";
import { state, query, customElement } from "lit/decorators.js";
import { AppWebsocket, AdminWebsocket, InstalledCell, ProvisionedCell } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";

import { sharedStyles } from "./sharedStyles";
import { MatrixStore } from "./matrix-store";
import { matrixContext } from "./context";
import { MainDashboard } from "./main-dashboard";

@customElement('we-app')
export class WeApp extends ScopedElementsMixin(LitElement) {
  private _matrixStore!: MatrixStore;

  @state()
  loading = true;

  async firstUpdated() {
    const adminWebsocket = await AdminWebsocket.connect(`ws://localhost:9000`);
    const appWebsocket = await AppWebsocket.connect(`ws://localhost:9001`);
    console.log("Hello World!");
    const weAppInfo = await appWebsocket.appInfo( { installed_app_id: "we"} );
    const cellId = (weAppInfo.cell_info["lobby"][0] as { provisioned: ProvisionedCell }).provisioned.cell_id;
    await adminWebsocket.authorizeSigningCredentials(cellId);
    this._matrixStore = await MatrixStore.connect(appWebsocket, adminWebsocket, weAppInfo);
    new ContextProvider(this, matrixContext, this._matrixStore);

    this.loading = false;
  }

  render() {
    if (this.loading)
      return html`<div class="row center-content" style="flex: 1;">
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
