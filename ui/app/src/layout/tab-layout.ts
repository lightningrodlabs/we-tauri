import { decodeHashFromBase64 } from "@holochain/client";
import { localized } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  GoldenLayoutRegister,
  GoldenLayoutRoot,
  GoldenLayout as GoldenLayoutEl,
} from "@scoped-elements/golden-layout";
import { GoldenLayout, LayoutConfig } from "golden-layout";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { JoinGroups } from "../elements/join-groups.js";

import { GroupContext } from "../groups/elements/group-context.js";
import { GroupPeersStatus } from "../groups/elements/group-peers-status.js";
import { InstallableApplets } from "../groups/elements/installable-applets.js";
import { weStyles } from "../shared-styles.js";
import { WelcomeView } from "./views/welcome-view.js";
import { GroupAppletMain } from "./views/group-applet-main.js";

@localized()
export class TabLayout extends ScopedElementsMixin(LitElement) {
  @property()
  layoutConfig!: LayoutConfig;

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
      .scopedElements=${{
        "welcome-view": WelcomeView,
        "join-groups": JoinGroups,
        "group-peers-status": GroupPeersStatus,
        "group-context": GroupContext,
        "group-applet-main": GroupAppletMain,
        "installable-applets": InstallableApplets,
      }}
      style="flex: 1; display: flex;"
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
        }) => html` <group-context
          .groupDnaHash=${decodeHashFromBase64(groupDnaHash)}
        >
          <group-applet-main
            .appletInstanceHash=${decodeHashFromBase64(appletInstanceHash)}
            style="flex: 1"
          ></group-applet-main
        ></group-context>`}
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

  static get scopedElements() {
    return {
      "golden-layout": GoldenLayoutEl,
      "golden-layout-root": GoldenLayoutRoot,
      "golden-layout-register": GoldenLayoutRegister,
    };
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
