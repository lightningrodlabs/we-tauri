// import "@webcomponents/scoped-custom-element-registry";
import { provide } from "@lit-labs/context";
import { state, query, customElement } from "lit/decorators.js";
import {
  AppAgentWebsocket,
  DnaHash,
  EntryHash,
  encodeHashToBase64,
  decodeHashFromBase64,
} from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css, render } from "lit";
import { sharedStyles } from "@holochain-open-dev/elements";
import {
  GoldenLayout as GoldenLayoutEl,
  GoldenLayoutRegister,
  GoldenLayoutRoot,
} from "@scoped-elements/golden-layout";
import { LayoutConfig, GoldenLayout } from "golden-layout";
import { CircularProgress } from "@scoped-elements/material-web";
import { Hrl } from "@lightningrodlabs/we-applet";

import { weStyles } from "./shared-styles.js";
import { weStoreContext } from "./context.js";
import { WeStore } from "./we-store.js";
import { NavigationSidebar } from "./elements/navigation-sidebar.js";
import { WelcomeView } from "./views/welcome-view.js";
import { GroupPeersStatus } from "./groups/elements/group-peers-status.js";
import { GroupContext } from "./groups/elements/group-context.js";

export type OpenViewParameters =
  | {
      view: "group-peers-status";
      groupDnaHash: DnaHash;
    }
  | {
      view: "group-applet-main";
      groupDnaHash: DnaHash;
    }
  | {
      view: "group-applet-block";
      groupDnaHash: DnaHash;
      appletInstanceHash: EntryHash;
      blockName: string;
    }
  | {
      view: "entry";
      hrl: Hrl;
      context: any;
    };

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

  openGroupHomeTab(groupDnaHash: DnaHash) {
    this.openTab({
      view: "group-peers-status",
      groupDnaHash,
    });
  }

  openBlock(openView: OpenViewParameters) {}

  openTab(openView: OpenViewParameters) {
    this.openAtLocation(openView, {
      typeId: 2, // FirstStack
    });
  }

  openAtLocation(openView: OpenViewParameters, locationSelector: any) {
    switch (openView.view) {
      case "group-peers-status":
        this.goldenLayout.addItemAtLocation(
          {
            type: "component",
            componentType: "group-peers-status",
            componentState: {
              groupDnaHash: encodeHashToBase64(openView.groupDnaHash),
            },
          },
          [locationSelector]
        );
      default:
        break;
    }
  }

  renderContent() {
    return html` <golden-layout
      id="golden-layout"
      .layoutConfig=${this.layoutConfig}
      .scopedElements=${{
        "welcome-view": WelcomeView,
        "group-peers-status": GroupPeersStatus,
        "group-context": GroupContext,
      }}
      style="flex: 1; display: flex;"
    >
      <golden-layout-register component-type="welcome">
        <template>
          <welcome-view></welcome-view>
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
        component-type="group-peers-status"
        .template=${({ groupDnaHash }) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <group-peers-status></group-peers-status
          ></group-context>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-group-applet-main"
        .template=${({ appletHash }) => html` <cross-group-applet-main
          .appletHash=${appletHash}
        ></cross-group-applet-main>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-group-applet-block"
        .template=${({
          appletHash,
          blockName,
        }) => html` <cross-group-applet-block
          .appletHash=${appletHash}
          .blockName=${blockName}
        ></cross-group-applet-block>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="entry"
        .template=${({ hrl, context }) => html` <entry-view
          .hrl=${hrl}
          .context=${context}
        ></entry-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-applet-main"
        .template=${({
          groupDnaHash,
          appletInstanceHash,
        }) => html` <group-applet-main
          .groupDnaHash=${groupDnaHash}
          .appletInstanceHash=${appletInstanceHash}
        ></group-applet-main>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-applet-block"
        .template=${({
          groupDnaHash,
          appletInstanceHash,
          blockName,
        }) => html` <group-applet-block
          .groupDnaHash=${groupDnaHash}
          .appletInstanceHash=${appletInstanceHash}
          .blockName=${blockName}
        ></group-applet-block>`}
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
        <navigation-sidebar
          style="flex: 0"
          @group-selected=${(e: CustomEvent) =>
            this.openGroupHomeTab(e.detail.groupDnaHash)}
          @group-created=${(e: CustomEvent) =>
            this.openGroupHomeTab(e.detail.groupDnaHash)}
        ></navigation-sidebar>
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
