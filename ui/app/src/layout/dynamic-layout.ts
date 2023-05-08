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
import "../applets/elements/applet-title.js";
import "../applet-bundles/elements/applet-bundle-title.js";
import "./views/cross-applet-main.js";
import "./views/cross-applet-block.js";
import "./views/welcome-view.js";
import "./views/applet-block.js";
import "./views/applet-main.js";
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
  @property()
  openViews: AppOpenViews = {
    openAppletBlock: (appletHash, block, context) => {
      this.goldenLayout.addItemAtLocation(
        {
          type: "component",
          componentType: "applet-block",
          componentState: {
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
    openCrossAppletBlock: (appletBundleHash, block, context) => {
      this.goldenLayout.addItemAtLocation(
        {
          type: "component",
          componentType: "cross-applet-block",
          componentState: {
            appletBundleHash: encodeHashToBase64(appletBundleHash),
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
              <span style="margin-left: 4px">${msg("Home")}</span>
            </group-context>
          `}
        .template=${({ groupDnaHash }, container) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <group-home
              style="flex: 1"
              @group-left=${() => {
                container.close();
              }}
            ></group-home>
          </group-context>
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
        component-type="applet-main"
        .titleRenderer=${({ appletHash }) =>
          html`
            <applet-title
              .appletHash=${decodeHashFromBase64(appletHash)}
            ></applet-title>
          `}
        .template=${({ appletHash }) => html`
          <applet-main
            .appletHash=${decodeHashFromBase64(appletHash)}
            style="flex: 1"
          ></applet-main>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="applet-block"
        .titleRenderer=${({ appletHash, block }) =>
          html`
            <applet-title
              .appletHash=${decodeHashFromBase64(appletHash)}
            ></applet-title>
            <span>: ${block}</span>
          `}
        .template=${({ appletHash, block, context }) => html`
          <applet-block
            .appletHash=${decodeHashFromBase64(appletHash)}
            .block=${block}
            .context=${context}
            style="flex: 1"
          ></applet-block>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-applet-main"
        .titleRenderer=${({ appletBundleHash }) =>
          html`<applet-bundle-title
            .appletBundleHash=${decodeHashFromBase64(appletBundleHash)}
          ></applet-bundle-title>`}
        .template=${({ appletBundleHash }) => html` <cross-applet-main
          .appletBundleHash=${decodeHashFromBase64(appletBundleHash)}
          style="flex: 1"
        ></cross-applet-main>`}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="cross-applet-block"
        .titleRenderer=${({ appletBundleHash, block }) =>
          html`<applet-bundle-title
              .appletBundleHash=${encodeHashToBase64(appletBundleHash)}
            ></applet-bundle-title>
            <span>: ${block}</span> `}
        .template=${({
          appletBundleHash,
          block,
          context,
        }) => html` <cross-applet-block
          .appletBundleHash=${decodeHashFromBase64(appletBundleHash)}
          .block=${block}
          .context=${context}
          style="flex: 1"
        ></cross-applet-block>`}
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
