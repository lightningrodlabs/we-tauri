import { DnaHash, encodeHashToBase64 } from "@holochain/client";
import { localized } from "@lit/localize";
import { customElement, query } from "lit/decorators.js";
import { GoldenLayout as GoldenLayoutEl } from "@scoped-elements/golden-layout";
import { GoldenLayout, RootItemConfig } from "golden-layout";
import { css, html, LitElement } from "lit";
import { LayoutConfig } from "golden-layout";

import { weStyles } from "../shared-styles.js";
import "./tab-layout.js";
import { consume } from "@lit-labs/context";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import "../groups/elements/create-profile.js";
import { CreateProfileInGroup } from "../groups/elements/create-profile.js";
import { toPromise } from "../utils.js";

@localized()
@customElement("dynamic-layout")
export class DynamicLayout extends LitElement {
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

  @query("create-profile-in-group")
  createProfileInGroup!: CreateProfileInGroup;

  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  async openGroup(groupDnaHash: DnaHash) {
    const groupStore = await toPromise(this._weStore.groups.get(groupDnaHash));

    const myProfile = await toPromise(groupStore.profilesStore.myProfile);
    if (myProfile) {
      this.openGroupHomeTab(groupDnaHash);
    } else {
      this.createProfileInGroup.groupDnaHash = groupDnaHash;
      this.createProfileInGroup.show();
    }
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
        {
          type: "component",
          componentType: "group-invite-member",
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
    return html` <create-profile-in-group
        @profile-created=${() => {
          this.openGroupHomeTab(this.createProfileInGroup.groupDnaHash);
          this.createProfileInGroup.hide();
        }}
      ></create-profile-in-group>
      <golden-layout
        id="golden-layout"
        .layoutConfig=${this.layoutConfig}
        style="flex: 1; display: flex; min-width: 0;"
      >
        <golden-layout-register
          component-type="tab-layout"
          .template=${(rootItemConfig: RootItemConfig) => html`
            <tab-layout
              .layoutConfig=${{ root: rootItemConfig }}
              style="flex: 1; min-width: 0"
            ></tab-layout>
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
