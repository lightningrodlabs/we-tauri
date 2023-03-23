import { provide } from "@lit-labs/context";
import { state, customElement } from "lit/decorators.js";
import {
  AppAgentWebsocket,
  AdminWebsocket,
  encodeHashToBase64,
} from "@holochain/client";
import { LitElement, html, css } from "lit";

import "@holochain-open-dev/elements/elements/display-error.js";

import { weStyles } from "./shared-styles.js";
import { weStoreContext } from "./context.js";
import { WeStore } from "./we-store.js";
import "./elements/navigation-sidebar.js";
import { DynamicLayout } from "./layout/dynamic-layout.js";
import "./layout/dynamic-layout.js";
import {
  getConductorInfo,
  isKeystoreInitialized,
  isLaunched,
} from "./tauri.js";
import "./password/enter-password.js";
import "./password/create-password.js";
import { initAppClient } from "./utils.js";
import { DEVHUB_APP_ID } from "./processes/devhub/app-id.js";

type View =
  | { view: "loading" }
  | { view: "password"; initialized: boolean }
  | { view: "main" };

@customElement("we-app")
export class WeApp extends LitElement {
  @state()
  view: View = { view: "loading" };

  @provide({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  async firstUpdated() {
    const launched = await isLaunched();

    if (launched) {
      await this.connect();
    } else {
      const initialized = await isKeystoreInitialized();
      this.view = { view: "password", initialized };
    }
  }

  async connect() {
    this.view = { view: "loading" };
    const info = await getConductorInfo();

    window["__HC_LAUNCHER_ENV__"] = {
      APP_INTERFACE_PORT: info.app_port,
      ADMIN_INTERFACE_PORT: info.admin_port,
      INSTALLED_APP_ID: info.we_app_id,
    };

    console.log(`
    APP_INTERFACE_PORT: ${info.app_port},
    ADMIN_INTERFACE_PORT: ${info.admin_port},
    INSTALLED_APP_ID: ${info.we_app_id},
    `);

    const adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:${info.admin_port}`
    );
    const appAgentWebsocket = await AppAgentWebsocket.connect(
      `ws://localhost:${info.app_port}`,
      info.we_app_id
    );

    const devhubClient = await initAppClient(DEVHUB_APP_ID, 300000);

    this._weStore = new WeStore(
      adminWebsocket,
      appAgentWebsocket,
      devhubClient
    );
    this.view = { view: "main" };
  }

  get dynamicLayout() {
    return this.shadowRoot?.getElementById("dynamic-layout") as DynamicLayout;
  }

  renderContent() {
    return html`
      <div style="width: 100vw" class="row">
        <navigation-sidebar
          style="flex: 0"
          @group-selected=${(e: CustomEvent) =>
            this.dynamicLayout.openGroupHomeTab(e.detail.groupDnaHash)}
          @group-created=${(e: CustomEvent) =>
            this.dynamicLayout.openGroupHomeTab(e.detail.groupDnaHash)}
          @applet-instance-selected=${(e: CustomEvent) => {
            this.dynamicLayout.openTab("Applet", {
              type: "row",
              content: [
                {
                  type: "component",
                  componentType: "group-applet-block",
                  componentState: {
                    groupDnaHash: encodeHashToBase64(e.detail.groupDnaHash),
                    appletInstanceHash: encodeHashToBase64(
                      e.detail.appletInstanceHash
                    ),
                    block: "main",
                  },
                },
              ],
            });
          }}
        ></navigation-sidebar>
        <dynamic-layout
          id="dynamic-layout"
          style="flex: 1; min-width: 0;"
        ></dynamic-layout>
      </div>
    `;
  }

  render() {
    switch (this.view.view) {
      case "loading":
        return html`<div class="row center-content" style="flex: 1;">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "password":
        if (this.view.initialized) {
          return html`
            <div class="column center-content" style="flex: 1">
              <enter-password
                @password-entered=${() => this.connect()}
              ></enter-password>
            </div>
          `;
        } else {
          return html`
            <div class="column center-content" style="flex: 1">
              <create-password
                @password-created=${() => this.connect()}
              ></create-password>
            </div>
          `;
        }
      case "main":
        return this.renderContent();
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
