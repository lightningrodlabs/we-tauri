import "@webcomponents/scoped-custom-element-registry";
import { ContextProvider, provide } from "@lit-labs/context";
import { state, query, customElement } from "lit/decorators.js";
import {
  AppWebsocket,
  AdminWebsocket,
  InstalledCell,
  AppAgentWebsocket,
  DnaHash,
  ActionHash,
  EntryHash,
} from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css, render } from "lit";
import { sharedStyles } from "@holochain-open-dev/elements";
import {
  GoldenLayout as GoldenLayoutEl,
  GoldenLayoutRegister,
  GoldenLayoutRoot,
} from "@scoped-elements/golden-layout";
import { LayoutConfig, GoldenLayout, LayoutManager } from "golden-layout";
import { CircularProgress } from "@scoped-elements/material-web";

import { weStyles } from "./shared-styles";
import { weStoreContext } from "./context";
import { WeStore } from "./we-store";
import { NavigationSidebar } from "./elements/navigation-sidebar";
import { WelcomeScreen } from "./elements/welcome-screen";

@customElement("we-app")
export class WeApp extends ScopedElementsMixin(LitElement) {
  @provide({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @state()
  loading = true;

  layoutConfig: LayoutConfig = {
    root: {
      type: "stack",
      content: [
        {
          type: "component",
          componentType: "welcome",
        },
      ],
    },
    header: {
      popout: false,
    },
  };

  async firstUpdated() {
    const appAgentWebsocket = await AppAgentWebsocket.connect("", "we");

    this._weStore = new WeStore(appAgentWebsocket);

    this.loading = false;
  }

  get goldenLayout(): GoldenLayout {
    const el = this.shadowRoot?.getElementById(
      "golden-layout"
    ) as GoldenLayoutEl;
    return el.goldenLayout;
  }

  openBlock() {}

  openTab(hrl: Hrl) {
    this.goldenLayout.addItemAtLocation(
      {
        type: "component",
        componentType: "welcome",
        componentState: {},
      },
      [{ typeId: LayoutManager.LocationSelector.TypeId.FirstStack }]
    );
  }

  renderContent() {
    return html` <golden-layout
      id="golden-layout"
      .layoutConfig=${this.layoutConfig}
      .scopedElements=${{}}
    >
      <golden-layout-register component-type="welcome">
        <template>
          <span>dddasdf</span>
          <welcome-screen></welcome-screen>
        </template>
      </golden-layout-register>
      <golden-layout-register component-type="group-settings">
        <template>
          <group-settings></group-settings>
        </template>
      </golden-layout-register>
      <golden-layout-register
        component-type="agent-centric-main"
        .template=${({ appletHash }) => html` <agent-centric-main-view
          .appletHash=${appletHash}
        ></agent-centric-main-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="agent-centric-block"
        .template=${({
          appletHash,
          blockName,
        }) => html` <agent-centric-block-view
          .appletHash=${appletHash}
          .blockName=${blockName}
        ></agent-centric-block-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-centric-entry"
        .template=${({ groupDnaHash, hrl }) => html` <group-centric-entry-view
          .groupDnaHash=${groupDnaHash}
          .hrl=${hrl}
        ></group-centric-entry-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-centric-main"
        .template=${({ groupDnaHash }) => html` <group-centric-main-view
          .groupDnaHash=${groupDnaHash}
        ></group-centric-main-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-centric-block"
        .template=${({
          blockName,
          groupDnaHash,
        }) => html` <group-centric-block-view
          .groupDnaHash=${groupDnaHash}
          .blockName=${blockName}
        ></group-centric-block-view>`}
      >
      </golden-layout-register>
      <golden-layout-root> </golden-layout-root>
    </golden-layout>`;
  }

  render() {
    if (this.loading)
      return html`<div class="row center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <div style="flex: 1;" class="row">
        <navigation-sidebar></navigation-sidebar>
        ${this.renderContent()}
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      "navigation-sidebar": NavigationSidebar,
      "golden-layout": GoldenLayoutEl,
      "golden-layout-root": GoldenLayoutRoot,
      "golden-layout-register": GoldenLayoutRegister,
    };
  }

  static get styles() {
    return [
      weStyles,
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
