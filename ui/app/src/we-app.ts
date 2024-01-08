import { provide } from "@lit/context";
import { state, query, customElement } from "lit/decorators.js";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css } from "lit";

import { sharedStyles } from "./sharedStyles";
import { MatrixStore } from "./matrix-store";
import { matrixContext } from "./context";
import { MainDashboard } from "./main-dashboard";
import { getAdminWebsocket, getAppWebsocket, getCellId } from "./utils";

@customElement('we-app')
export class WeApp extends ScopedRegistryHost(LitElement) {
  @provide({context: matrixContext})
  private _matrixStore!: MatrixStore;

  @state()
  loading = true;

  async firstUpdated() {
    const adminWebsocket = await getAdminWebsocket();
    const appWebsocket = await getAppWebsocket();
    const weAppInfo = await appWebsocket.appInfo( { installed_app_id: "we"} );

    // authorize signing credentials for all cells
    for (const roleName in weAppInfo.cell_info) {
      for (const cellInfo of weAppInfo.cell_info[roleName]) {
        await adminWebsocket.authorizeSigningCredentials(getCellId(cellInfo)!);
      }
    }

    this._matrixStore = await MatrixStore.connect(appWebsocket, adminWebsocket, weAppInfo);


    // TODO: add code to prefetch groups and register applets here.

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
