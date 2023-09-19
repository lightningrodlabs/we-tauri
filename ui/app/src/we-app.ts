import { ContextProvider } from "@lit-labs/context";
import { state, query, customElement } from "lit/decorators.js";
import { AppWebsocket, AdminWebsocket, InstalledCell, ProvisionedCell } from "@holochain/client";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css } from "lit";

import { sharedStyles } from "./sharedStyles";
import { MatrixStore } from "./matrix-store";
import { matrixContext } from "./context";
import { MainDashboard } from "./main-dashboard";
import { getCellId } from "./utils";

@customElement('we-app')
export class WeApp extends ScopedElementsMixin(LitElement) {
  private _matrixStore!: MatrixStore;

  @state()
  loading = true;

  async firstUpdated() {
    const hcPort = import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_HC_PORT_2 : import.meta.env.VITE_HC_PORT;
    const adminPort = import.meta.env.VITE_AGENT === "2" ? import.meta.env.VITE_ADMIN_PORT_2 : import.meta.env.VITE_ADMIN_PORT;
    const adminWebsocket = await AdminWebsocket.connect(`ws://localhost:${adminPort}`);
    const appWebsocket = await AppWebsocket.connect(`ws://localhost:${hcPort}`);
    console.log("Hello World!", hcPort, adminPort);
    const weAppInfo = await appWebsocket.appInfo( { installed_app_id: "we"} );

    // authorize signing credentials for all cells

    for (const roleName in weAppInfo.cell_info) {
      for (const cellInfo of weAppInfo.cell_info[roleName]) {
        await adminWebsocket.authorizeSigningCredentials(getCellId(cellInfo)!);
      }
    }

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

  static get elementDefinitions() {
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
