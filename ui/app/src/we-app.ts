import { provide } from "@lit-labs/context";
import { state, customElement } from "lit/decorators.js";
import { AdminWebsocket, AppWebsocket, encodeHashToBase64 } from "@holochain/client";
import { LitElement, html, css } from "lit";
import { invoke } from "@tauri-apps/api";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "./password/enter-password.js";
import "./password/create-password.js";
import "./password/factory-reset.js";
import "./elements/main-dashboard.js";


import { listen } from "@tauri-apps/api/event";
import { weStyles } from "./shared-styles.js";
import { weStoreContext } from "./context.js";
import { WeStore } from "./we-store.js";
import {
  getConductorInfo,
  isKeystoreInitialized,
  isLaunched,
} from "./tauri.js";
import { getCellNetworkSeed, getProvisionedCells, initAppClient } from "./utils.js";
import { AppletBundlesStore } from "./applet-bundles/applet-bundles-store.js";

type State =
  | { state: "loading" }
  | { state: "password"; initialized: boolean }
  | { state: "running" }
  | { state: "factoryReset" };

@customElement("we-app")
export class WeApp extends LitElement {
  @state()
  state: State = { state: "loading" };

  @state()
  previousState: State = { state: "loading" };

  @provide({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  async firstUpdated() {

    await listen("clear-systray-notification-state", async () => {
      await invoke('clear_systray_notification_state', {});
    })

    await listen("request-factory-reset", () => {
      console.log("Received factory reset event.");
      this.previousState = this.state;
      this.state = { state: "factoryReset" }
    });

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
      new URL(`ws://localhost:${info.admin_port}`)
    );

    const appWebsocket = await AppWebsocket.connect(
      new URL(`ws://localhost:${info.app_port}`)
    );

    const appStoreClient = await initAppClient(info.appstore_app_id);

    this._weStore = new WeStore(
      adminWebsocket,
      appWebsocket,
      info,
      new AppletBundlesStore(appStoreClient, adminWebsocket, info)
    );

    const appStoreAppInfo = await appWebsocket.appInfo({"installed_app_id": "AppStore-0.6.x"});
    const devhubAppInfo = await appWebsocket.appInfo({"installed_app_id": "DevHub-0.6.x"});
    // console.log("MY DEVHUB PUBLIC KEY: ", encodeHashToBase64(devhubAppInfo.agent_pub_key));

    getProvisionedCells(appStoreAppInfo).map(([roleName, cellInfo]) => console.log(`Appstore network seed: ${getCellNetworkSeed(cellInfo)}`));
    if (devhubAppInfo) getProvisionedCells(devhubAppInfo).map(([roleName, cellInfo]) => console.log(`Appstore network seed: ${getCellNetworkSeed(cellInfo)}`));

    const allApps = await adminWebsocket.listApps({});
    console.log("ALL APPS: ", allApps);
    this.state = { state: "running" };

    console.log("Fetching available UI updates");
    try {
      await this._weStore.fetchAvailableUiUpdates();
    } catch (e) {
      console.error("Failed to fetch available applet updates: ", e);
    }
  }

  render() {
    switch (this.state.state) {
      case "loading":
        return html`<div class="column center-content" style="flex: 1;">
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
      case "factoryReset":
        return html`
          <div class="column center-content" style="flex: 1">
            <factory-reset @cancel-factory-reset=${() => { this.state = this.previousState; }}></factory-reset>
          </div>
        `;
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
