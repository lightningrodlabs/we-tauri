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
import { Hrl } from "../../libs/we-applet/dist";

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
      .scopedElements=${{
        "welcome-screen": WelcomeScreen,
      }}
      style="flex: 1; display: flex;"
    >
      <golden-layout-register component-type="welcome">
        <template>
          <welcome-screen></welcome-screen>
        </template>
      </golden-layout-register>
      <golden-layout-register
        component-type="group-settings"
        .template=${({ groupDnaHash }) => html`
          <group-settings .groupDnaHash=${groupDnaHash}></group-settings>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-group-main"
        .template=${({ appletHash }) => html` <cross-group-main-view
          .appletHash=${appletHash}
        ></cross-group-main-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-group-block"
        .template=${({ appletHash, blockName }) => html` <cross-group-block-view
          .appletHash=${appletHash}
          .blockName=${blockName}
        ></cross-group-block-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-entry"
        .template=${({ groupDnaHash, hrl }) => html` <group-entry-view
          .groupDnaHash=${groupDnaHash}
          .hrl=${hrl}
        ></group-entry-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-main"
        .template=${({ groupDnaHash }) => html` <group-main-view
          .groupDnaHash=${groupDnaHash}
        ></group-main-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-block"
        .template=${({ blockName, groupDnaHash }) => html` <group-block-view
          .groupDnaHash=${groupDnaHash}
          .blockName=${blockName}
        ></group-block-view>`}
      >
      </golden-layout-register>
      <golden-layout-root style="flex: 1"> </golden-layout-root>
    </golden-layout>`;
  }

  render() {
    if (this.loading)
      return html`<div class="row center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <div style="flex: 1;" class="row">
        <navigation-sidebar style="flex: 0"></navigation-sidebar>
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
          flex: 1;
          display: flex;
        }
      `,
    ];
  }
}
