import { provide } from "@lit-labs/context";
import { state, customElement } from "lit/decorators.js";
import { AdminWebsocket } from "@holochain/client";
import { LitElement, html, css } from "lit";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "./password/enter-password.js";
import "./password/create-password.js";
import "./elements/main-dashboard.js";

import { weStyles } from "./shared-styles.js";
import { weStoreContext } from "./context.js";
import { WeStore } from "./we-store.js";
import {
  getConductorInfo,
  isKeystoreInitialized,
  isLaunched,
} from "./tauri.js";
import { initAppClient } from "./utils.js";
import { AppletBundlesStore } from "./applet-bundles/applet-bundles-store.js";

type State =
  | { state: "loading" }
  | { state: "password"; initialized: boolean }
  | { state: "running" };

@customElement("we-app")
export class WeApp extends LitElement {
  @state()
  state: State = { state: "loading" };

  @provide({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  async firstUpdated() {
    const launched = await isLaunched();

    if (launched) {
      await this.connect();
    } else {
      const initialized = await isKeystoreInitialized();
      this.state = { state: "password", initialized };
    }
  }

  async connect() {
    this.state = { state: "loading" };
    const info = await getConductorInfo();

    window["__HC_LAUNCHER_ENV__"] = {
      APP_INTERFACE_PORT: info.app_port,
      ADMIN_INTERFACE_PORT: info.admin_port,
      INSTALLED_APP_ID: "",
    };

    const adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:${info.admin_port}`
    );

    const appStoreClient = await initAppClient(info.appstore_app_id);

    this._weStore = new WeStore(
      adminWebsocket,
      info,
      new AppletBundlesStore(appStoreClient, adminWebsocket, info)
    );

    this.state = { state: "running" };
  }

  render() {
    switch (this.state.state) {
      case "loading":
        return html`<div class="row center-content" style="flex: 1;">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "password":
        return html`
          <div class="column center-content" style="flex: 1">
            ${this.state.initialized
              ? html`
                  <enter-password
                    @password-entered=${() => this.connect()}
                  ></enter-password>
                `
              : html`
                  <create-password
                    @password-created=${() => this.connect()}
                  ></create-password>
                `}
          </div>
        `;
      case "running":
        return html`<main-dashboard></main-dashboard>`;
    }
  }

  static get styles() {
    return [
      weStyles,
      css`
        :host {
          flex: 1;
          display: flex;
        }
      `,
    ];
  }
}
