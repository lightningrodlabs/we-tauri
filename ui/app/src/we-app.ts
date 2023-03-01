// import "@webcomponents/scoped-custom-element-registry";
import { provide } from "@lit-labs/context";
import { state, customElement } from "lit/decorators.js";
import {
  AppAgentWebsocket,
  AdminWebsocket,
  CellType,
  GrantedFunctionsType,
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

@customElement("we-app")
export class WeApp extends ScopedElementsMixin(LitElement) {
  @provide({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @state()
  loading = true;

  async firstUpdated() {
    const adminWebsocket = await AdminWebsocket.connect("");
    const appAgentWebsocket = await AppAgentWebsocket.connect("", "we");

    const devhubClient = await initDevhubClient(adminWebsocket);

    this._weStore = new WeStore(
      adminWebsocket,
      appAgentWebsocket,
      devhubClient
    );

    this.loading = false;
  }

  get dynamicLayout() {
    return this.shadowRoot?.getElementById("dynamic-layout") as DynamicLayout;
  }

  render() {
    if (this.loading)
      return html`<div class="row center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <div style="flex: 1;" class="row">
        <navigation-sidebar
          style="flex: 0"
          @group-selected=${(e: CustomEvent) =>
            this.dynamicLayout.openGroupHomeTab(e.detail.groupDnaHash)}
          @group-created=${(e: CustomEvent) =>
            this.dynamicLayout.openGroupHomeTab(e.detail.groupDnaHash)}
        ></navigation-sidebar>
        <dynamic-layout id="dynamic-layout" style="flex: 1"></dynamic-layout>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      "navigation-sidebar": NavigationSidebar,
      "dynamic-layout": DynamicLayout,
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
