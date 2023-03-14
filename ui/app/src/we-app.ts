// import "@webcomponents/scoped-custom-element-registry";
import { provide } from "@lit-labs/context";
import { state, customElement } from "lit/decorators.js";
import {
  AppAgentWebsocket,
  AdminWebsocket,
  encodeHashToBase64,
} from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { sharedStyles } from "@holochain-open-dev/elements";
import { CircularProgress } from "@scoped-elements/material-web";

import { weStyles } from "./shared-styles.js";
import { weStoreContext } from "./context.js";
import { WeStore } from "./we-store.js";
import { NavigationSidebar } from "./elements/navigation-sidebar.js";
import { DynamicLayout } from "./layout/dynamic-layout.js";
import { initDevhubClient } from "./processes/devhub/app-id.js";
import {
  getConductorInfo,
  isKeystoreInitialized,
  isLaunched,
} from "./tauri.js";
import { EnterPassword } from "./password/enter-password.js";
import { CreatePassword } from "./password/create-password.js";

type View =
  | { view: "loading" }
  | { view: "password"; initialized: boolean }
  | { view: "main" };

@customElement("we-app")
export class WeApp extends ScopedElementsMixin(LitElement) {
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

    const adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:${info.admin_port}`
    );
    const appAgentWebsocket = await AppAgentWebsocket.connect(
      `ws://localhost:${info.app_port}`,
      info.we_app_id
    );

    const devhubClient = await initDevhubClient(adminWebsocket);

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
      <div style="flex: 1;" class="row">
        <navigation-sidebar
          style="flex: 0"
          @group-selected=${(e: CustomEvent) =>
            this.dynamicLayout.openGroupHomeTab(e.detail.groupDnaHash)}
          @group-created=${(e: CustomEvent) =>
            this.dynamicLayout.openGroupHomeTab(e.detail.groupDnaHash)}
          @applet-instance-selected=${(e: CustomEvent) => {
            this.dynamicLayout.openTab("Applet", {
              type: "component",
              componentType: "group-applet-main",
              componentState: {
                groupDnaHash: encodeHashToBase64(e.detail.groupDnaHash),
                appletInstanceHash: encodeHashToBase64(
                  e.detail.appletInstanceHash
                ),
              },
            });
          }}
        ></navigation-sidebar>
        <dynamic-layout id="dynamic-layout" style="flex: 1"></dynamic-layout>
      </div>
    `;
  }

  render() {
    switch (this.view.view) {
      case "loading":
        return html`<div class="row center-content" style="flex: 1;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "password":
        if (this.view.initialized) {
          return html`
            <enter-password
              @password-entered=${() => this.connect()}
            ></enter-password>
          `;
        } else {
          return html`
            <create-password
              @password-created=${() => this.connect()}
            ></create-password>
          `;
        }
      case "main":
        return this.renderContent();
    }
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      "navigation-sidebar": NavigationSidebar,
      "dynamic-layout": DynamicLayout,
      "enter-password": EnterPassword,
      "create-password": CreatePassword,
    };
  }

  static get styles() {
    return [
      weStyles,
      sharedStyles,
      css`
        :host {
          flex: 1;
          display: flex;
        }
      `,
    ];
  }
}
