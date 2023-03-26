import { decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import { localized } from "@lit/localize";
import "@scoped-elements/golden-layout";
import { GoldenLayout, LayoutConfig, RootItemConfig } from "golden-layout";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { provide } from "@lit-labs/context";

import "../elements/join-groups.js";
import "../groups/elements/group-context.js";
import "../groups/elements/group-peers-status.js";
import "../groups/elements/installable-applets.js";
import "../groups/elements/group-invite-member.js";
import "./views/welcome-view.js";
import "./views/group-applet-block.js";
import "./views/entry-view.js";
import { openViewsContext } from "./context.js";
import { AppOpenViews } from "./types.js";
import { weStyles } from "../shared-styles.js";
import { Hrl } from "../../../libs/we-applet/dist/index.js";

@localized()
@customElement("tab-layout")
export class TabLayout extends LitElement {
  @property()
  rootItemConfig!: RootItemConfig;

  get layoutConfig(): LayoutConfig {
    return {
      root: this.rootItemConfig,
      header: {},
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

  get goldenLayout(): GoldenLayout {
    const el = this.shadowRoot?.getElementById(
      "golden-layout"
    ) as GoldenLayoutEl;
    return el.goldenLayout;
  }

  // openBlock(openView: OpenViewParameters) {}

  // openAtLocation(openView: OpenViewParameters, locationSelector: any) {
  //   switch (openView.view) {
  //     case "group-peers-status":
  //       this.goldenLayout.addItemAtLocation(
  //         {
  //           type: "component",
  //           componentType: "group-peers-status",
  //           componentState: {
  //             groupDnaHash: encodeHashToBase64(openView.groupDnaHash),
  //           },
  //         },
  //         [locationSelector]
  //       );
  //     default:
  //       break;
  //   }
  // }

  render() {
    return html` <golden-layout
      id="golden-layout"
      .layoutConfig=${this.layoutConfig}
      style="flex: 1; display: flex; min-width: 0"
    >
      <golden-layout-register component-type="welcome">
        <template>
          <welcome-view></welcome-view>
        </template>
      </golden-layout-register>
      <golden-layout-register component-type="join-groups">
        <template>
          <join-groups></join-groups>
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
        component-type="group-installable-applets"
        .template=${({ groupDnaHash }) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <installable-applets></installable-applets>
          </group-context>
        `}
      >
      </golden-layout-register>
      <golden-layout-register
        component-type="group-invite-member"
        .template=${({ groupDnaHash }) => html`
          <group-context .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}>
            <group-invite-member></group-invite-member
          ></group-context>
        `}
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
          .hrl=${[decodeHashFromBase64(hrl[0]), decodeHashFromBase64(hrl[1])]}
          .context=${context}
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
            ></group-applet-block>
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
