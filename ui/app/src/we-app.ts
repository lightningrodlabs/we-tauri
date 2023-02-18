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
import { GoldenLayout } from "golden-layout";
import { CircularProgress } from "@scoped-elements/material-web";

import { sharedStyles } from "./sharedStyles";
import { weStoreContext } from "./context";
import { WeStore } from "./we-store";
import { NavigationSidebar } from "./elements/navigation-sidebar";

@customElement("we-app")
export class WeApp extends ScopedElementsMixin(LitElement) {
  @provide({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @state()
  loading = true;

  @state()
  welcome = false;

  goldenLayout!: GoldenLayout;

  async firstUpdated() {
    const appAgentWebsocket = await AppAgentWebsocket.connect("", "we");

    this._weStore = new WeStore(appAgentWebsocket);

    this.loading = false;
    setTimeout(() => {
      this.goldenLayout = new GoldenLayout(
        this.shadowRoot?.getElementById("golden-layout")!
      );
      this.goldenLayout.loadLayout({
        root: {
          type: "row",
          content: [],
        },
      });

      this.goldenLayout.registerComponentFactoryFunction(
        "agent-centric-view",
        (container, state) => {
          render(
            html`<agent-centric-view view="main"></agent-centric-view>`,
            container.element
          );
        }
      );

      this.goldenLayout.registerComponentFactoryFunction(
        "group-centric-main-view",
        (container, state) => {
          const s = state as any;
          render(
            html`<group-centric-main-view
              .view=${s.blockName}
            ></group-centric-main-view>`,
            container.element
          );
        }
      );

      this.goldenLayout.registerComponentFactoryFunction(
        "group-centric-block-view",
        (container, state) => {
          const s = state as any;
          render(
            html`<group-centric-block-view
              .view=${s.blockName}
            ></group-centric-block-view>`,
            container.element
          );
        }
      );

      this.goldenLayout.registerComponentFactoryFunction(
        "group-centric-entry-view",
        (container, state) => {
          const s = state as any;
          render(
            html`<group-centric-entry-view
              .hrl=${s.hrl}
            ></group-centric-entry-view>`,
            container.element
          );
        }
      );
    });
  }

  openTab() {
    this.goldenLayout.rootItem?.contentItems[0].addChild({
      type: "component",
      componentName: "group-centric-block",
      componentState: {},
    });
  }

  renderContent() {
    if (this.welcome) return html`Welcome`;

    return html` <div id="golden-layout"></div> `;
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
