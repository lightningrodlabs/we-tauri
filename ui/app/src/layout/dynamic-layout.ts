import { DnaHash, encodeHashToBase64 } from "@holochain/client";
import { localized } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  GoldenLayoutRegister,
  GoldenLayoutRoot,
  GoldenLayout as GoldenLayoutEl,
} from "@scoped-elements/golden-layout";
import { GoldenLayout, RootItemConfig } from "golden-layout";
import { css, html, LitElement } from "lit";
import { LayoutConfig } from "golden-layout";

import { weStyles } from "../shared-styles.js";
import { TabLayout } from "./tab-layout.js";

@localized()
export class DynamicLayout extends ScopedElementsMixin(LitElement) {
  layoutConfig: LayoutConfig = {
    root: {
      type: "stack",
      content: [
        {
          type: "component",
          componentType: "tab-layout",
          componentState: {
            type: "row",
            content: [
              { type: "component", componentType: "welcome" },
              { type: "component", componentType: "join-groups" },
            ],
          },
        },
      ],
    },
    header: {
      popout: false,
    },
  };

  get goldenLayout(): GoldenLayout {
    const el = this.shadowRoot?.getElementById(
      "golden-layout"
    ) as GoldenLayoutEl;
    return el.goldenLayout;
  }

  openGroupHomeTab(groupDnaHash: DnaHash) {
    this.openTab("Group", {
      type: "row",
      content: [
        {
          type: "component",
          componentType: "group-installable-applets",
          componentState: {
            groupDnaHash: encodeHashToBase64(groupDnaHash),
          },
        },
        {
          type: "component",
          componentType: "group-peers-status",
          componentState: {
            groupDnaHash: encodeHashToBase64(groupDnaHash),
          },
        },
      ],
    });
  }

  openTab(title: string, rootItemConfig: RootItemConfig) {
    this.goldenLayout.addItemAtLocation(
      {
        title,
        type: "component",
        componentType: "tab-layout",
        componentState: rootItemConfig,
      },
      [
        {
          typeId: 2,
        },
      ]
    );
  }

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
        "tab-layout": TabLayout,
      }}
      style="flex: 1; display: flex;"
      @applet-instance-selected=${(e: CustomEvent) => {
        this.openTab("Applet", {
          type: "component",
          componentType: "group-applet-main",
          componentState: {
            groupDnaHash: encodeHashToBase64(e.detail.groupDnaHash),
            appletInstanceHash: encodeHashToBase64(e.detail.appletInstanceHash),
          },
        });
      }}
    >
      <golden-layout-register
        component-type="tab-layout"
        .template=${(rootItemConfig: RootItemConfig) => html`
          <tab-layout
            .layoutConfig=${{ root: rootItemConfig }}
            style="flex: 1"
          ></tab-layout>
        `}
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
