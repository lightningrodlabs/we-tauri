import { decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { localized } from "@lit/localize";
import "@scoped-elements/golden-layout";
import { GoldenLayout as GoldenLayoutEl } from "@scoped-elements/golden-layout";
import {
  ComponentItemConfig,
  GoldenLayout,
  LayoutConfig,
  RootItemConfig,
} from "golden-layout";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { provide } from "@lit-labs/context";

import "../groups/elements/group-context.js";
import "../groups/elements/group-home.js";
import "./views/welcome-view.js";
import "./views/group-applet-block.js";
import "./views/group-applet-main.js";
import "./views/entry-view.js";
import { openViewsContext } from "./context.js";
import { AppOpenViews } from "./types.js";
import { weStyles } from "../shared-styles.js";
import { Hrl } from "../../../libs/we-applet/dist/index.js";

@localized()
@customElement("dynamic-layout")
export class DynamicLayout extends LitElement {
  @property()
  rootItemConfig!: RootItemConfig;

  get layoutConfig(): LayoutConfig {
    return {
      root: this.rootItemConfig,
      header: {
        popout: false,
      },
    };
  }

  @provide({ context: openViewsContext })
  openViews: AppOpenViews = {
    openGroupBlock: () => {},
    openCrossGroupBlock: () => {},
    openHrl: (hrl: Hrl, context: any) => {
      this.goldenLayout.addItemAtLocation(
        {
          title: "Entry Views",
          type: "component",
          componentType: "entry",
          componentState: {
            hrl: [encodeHashToBase64(hrl[0]), encodeHashToBase64(hrl[1])],
            context,
          },
        },
        [
          {
            typeId: 3,
          },
        ]
      );
    },
  };

  openTab(itemConfig: ComponentItemConfig) {
    this.goldenLayout.addItemAtLocation(itemConfig, [
      {
        typeId: 2,
      },
    ]);
  }

  get goldenLayout(): GoldenLayout {
    const el = this.shadowRoot?.getElementById(
      "golden-layout"
    ) as GoldenLayoutEl;
    return el.goldenLayout;
  }

  render() {
    return html` <golden-layout
      id="golden-layout"
      .layoutConfig=${this.layoutConfig}
      style="flex: 1; display: flex; min-width: 0"
    >
      <golden-layout-register component-type="welcome">
        <template>
          <welcome-view style="margin: 24px"></welcome-view>
        </template>
      </golden-layout-register>
      <golden-layout-register
        component-type="group-home"
        .template=${({ groupDnaHash }) => html`
          <div
            style="flex: 1; display: flex; align-items: center; justify-content: center;"
          >
            <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
              <group-home></group-home>
            </group-context>
          </div>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-group-applet-block"
        .template=${({ appletHash, block }) => html` <cross-group-applet-block
          .appletHash=${appletHash}
          .blockName=${block}
          style="flex: 1"
        ></cross-group-applet-block>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="entry"
        .template=${({ hrl, context }) => html` <entry-view
          .hrl=${[decodeHashFromBase64(hrl[0]), decodeHashFromBase64(hrl[1])]}
          .context=${context}
          style="flex: 1"
        ></entry-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-applet-block"
        .template=${({ groupDnaHash, appletInstanceHash, block }) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <group-applet-block
              .appletInstanceHash=${decodeHashFromBase64(appletInstanceHash)}
              .block=${block}
              style="flex: 1"
            ></group-applet-block>
          </group-context>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-applet-main"
        .template=${({ groupDnaHash, appletInstanceHash }) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <group-applet-main
              .appletInstanceHash=${decodeHashFromBase64(appletInstanceHash)}
              style="flex: 1"
            ></group-applet-main>
          </group-context>
        `}
      >
      </golden-layout-register>
      <golden-layout-root style="flex: 1"> </golden-layout-root>
    </golden-layout>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
    `,
    weStyles,
  ];
}
