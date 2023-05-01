import { decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { localized, msg } from "@lit/localize";
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
import { consume, provide } from "@lit-labs/context";
import { Hrl } from "@lightningrodlabs/we-applet";

import "../groups/elements/group-context.js";
import "../groups/elements/group-home.js";
import "../groups/elements/group-logo.js";
import "../groups/elements/applet-name.js";
import "../groups/elements/entry-title.js";
import "./views/welcome-view.js";
import "./views/group-applet-block.js";
import "./views/group-applet-main.js";
import "./views/entry-view.js";

import { openViewsContext } from "./context.js";
import { AppOpenViews } from "./types.js";
import { weStyles } from "../shared-styles.js";
import { WeStore } from "../we-store.js";
import { weStoreContext } from "../context.js";

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

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @provide({ context: openViewsContext })
  openViews: AppOpenViews = {
    openGroupBlock: (groupDnaHash, appletHash, block, context) => {
      this.goldenLayout.addItemAtLocation(
        {
          type: "component",
          componentType: "group-block",
          componentState: {
            groupDnaHash: encodeHashToBase64(groupDnaHash),
            appletHash: encodeHashToBase64(appletHash),
            block,
            context,
          },
        },
        [
          {
            typeId: 2,
          },
        ]
      );
    },
    openCrossGroupBlock: (devhubAppReleaseHash, block, context) => {
      this.goldenLayout.addItemAtLocation(
        {
          type: "component",
          componentType: "cross-group-block",
          componentState: {
            devhubAppReleaseHash: encodeHashToBase64(devhubAppReleaseHash),
            block,
            context,
          },
        },
        [
          {
            typeId: 2,
          },
        ]
      );
    },
    openHrl: async (hrl: Hrl, context: any) => {
      this.goldenLayout.addItemAtLocation(
        {
          type: "component",
          componentType: "entry",
          componentState: {
            hrl: [encodeHashToBase64(hrl[0]), encodeHashToBase64(hrl[1])],
            context,
          },
        },
        [
          {
            typeId: 2,
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
        .titleRenderer=${({ groupDnaHash }) =>
          html`
            <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
              <group-logo></group-logo>
              <span>${msg("Home")}</span>
            </group-context>
          `}
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
        component-type="entry"
        .titleRenderer=${({ hrl }) =>
          html`
            <entry-title
              .hrl=${[
                decodeHashFromBase64(hrl[0]),
                decodeHashFromBase64(hrl[1]),
              ]}
            ></entry-title>
          `}
        .template=${({ hrl, context }) => html` <entry-view
          .hrl=${[decodeHashFromBase64(hrl[0]), decodeHashFromBase64(hrl[1])]}
          .context=${context}
          style="flex: 1"
        ></entry-view>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-applet-block"
        .titleRenderer=${({ groupDnaHash, appletHash, block }) =>
          html`
            <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
              <group-logo></group-logo>
              <applet-name
                .appletHash=${decodeHashFromBase64(appletHash)}
              ></applet-name>
              <span>: ${block}</span>
            </group-context>
          `}
        .template=${({ groupDnaHash, appletHash, block, context }) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <group-applet-block
              .appletHash=${decodeHashFromBase64(appletHash)}
              .block=${block}
              .context=${context}
              style="flex: 1"
            ></group-applet-block>
          </group-context>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-applet-main"
        .titleRenderer=${({ groupDnaHash, appletHash }) =>
          html`
            <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
              <group-logo></group-logo>
              <applet-name
                .appletHash=${decodeHashFromBase64(appletHash)}
              ></applet-name>
            </group-context>
          `}
        .template=${({ groupDnaHash, appletHash }) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <group-applet-main
              .appletHash=${decodeHashFromBase64(appletHash)}
              style="flex: 1"
            ></group-applet-main>
          </group-context>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-group-applet-main"
        .template=${({ devhubAppReleaseHash }) => html` <cross-group-applet-main
          .devhubAppReleaseHash=${decodeHashFromBase64(devhubAppReleaseHash)}
          style="flex: 1"
        ></cross-group-applet-main>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-group-applet-block"
        .template=${({
          devhubAppReleaseHash,
          block,
          context,
        }) => html` <cross-group-applet-block
          .devhubAppReleaseHash=${decodeHashFromBase64(devhubAppReleaseHash)}
          .block=${block}
          .context=${context}
          style="flex: 1"
        ></cross-group-applet-block>`}
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
