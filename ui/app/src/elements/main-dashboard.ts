import { consume } from "@lit-labs/context";
import { state, customElement, query } from "lit/decorators.js";
import { encodeHashToBase64, DnaHash, AnyDhtHash } from "@holochain/client";
import { LitElement, html, css } from "lit";
import { listen } from "@tauri-apps/api/event";
import {
  asyncDeriveStore,
  joinAsyncMap,
  toPromise,
} from "@holochain-open-dev/stores";
import { mapValues } from "@holochain-open-dev/utils";
import { hashState, notifyError } from "@holochain-open-dev/elements";
import { decodeHashFromBase64 } from "@holochain/client";
import { msg } from "@lit/localize";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";

import "./groups-sidebar.js";
import "./applets-sidebar.js";
import "./join-group-dialog.js";
import "../layout/dynamic-layout.js";
import { DynamicLayout } from "../layout/dynamic-layout.js";

import { weStyles } from "../shared-styles.js";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { JoinGroupDialog } from "./join-group-dialog.js";
import { weLogoIcon } from "../icons/we-logo-icon.js";

@customElement("main-dashboard")
export class MainDashboard extends LitElement {
  @consume({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @query("join-group-dialog")
  joinGroupDialog!: JoinGroupDialog;

  @state(hashState())
  selectedGroupDnaHash: DnaHash | undefined;

  async handleOpenGroup(originalDnaHashForLink: DnaHash, networkSeed: string) {
    const originalDnaHash = await toPromise(this._weStore.originalGroupDnaHash);

    if (originalDnaHash.toString() !== originalDnaHashForLink.toString()) {
      notifyError(
        msg(
          "This version of We can't handle joining this group; check if there is a new We version and upgrade to that."
        )
      );
      return;
    }

    const groups = await toPromise(
      asyncDeriveStore(this._weStore.allGroups, (groups) =>
        joinAsyncMap(mapValues(groups, (groupStore) => groupStore.networkSeed))
      )
    );

    const alreadyJoinedGroup = Array.from(groups.entries()).find(
      ([_, groupNetworkSeed]) => groupNetworkSeed === networkSeed
    );

    if (alreadyJoinedGroup) {
      this.openGroup(alreadyJoinedGroup[0]);
    } else {
      this.joinGroupDialog.open(networkSeed);
    }
  }

  async handleOpenHrl(dnaHash: DnaHash, hash: AnyDhtHash) {
    this.dynamicLayout.openViews.openHrl([dnaHash, hash], {});
  }

  async firstUpdated() {
    const unlisten = await listen("deep-link-received", async (e) => {
      const deepLink = e.payload as string;
      try {
        const split = deepLink.split("://");
        const split2 = split[1].split("/");

        if (split2[0] === "hrl") {
          await this.handleOpenHrl(
            decodeHashFromBase64(split2[1]),
            decodeHashFromBase64(split2[2])
          );
        } else if (split2[0] === "group") {
          await this.handleOpenGroup(
            decodeHashFromBase64(split2[1]),
            split2[2]
          );
        }
      } catch (e) {
        console.error(e);
        notifyError(msg("Error opening the link."));
      }
    });
  }

  get dynamicLayout() {
    return this.shadowRoot?.getElementById("dynamic-layout") as DynamicLayout;
  }

  async openGroup(groupDnaHash: DnaHash) {
    this.selectedGroupDnaHash = groupDnaHash;
    this.dynamicLayout.openTab({
      type: "component",
      componentType: "group-home",
      componentState: {
        groupDnaHash: encodeHashToBase64(groupDnaHash),
      },
    });
  }

  render() {
    return html`
      <join-group-dialog
        @group-joined=${(e) => this.openGroup(e.detail.groupDnaHash)}
      ></join-group-dialog>

      <div class="row" style="flex: 1">
        <div class="column">
          <div class="top-left-corner-bg"></div>
          <div class="column top-left-corner">
            <sidebar-button
              style="border-radius: 50%;"
              .logoSrc=${weLogoIcon}
              .tooltipText=${msg("Welcome")}
              @click=${() => {
                this.dynamicLayout.openTab({
                  type: "component",
                  componentType: "welcome",
                  title: msg("Welcome"),
                });
              }}
            ></sidebar-button>
          </div>

          <groups-sidebar
            class="left-sidebar"
            style="flex: 1; margin-top: 4px"
            .selectedGroupDnaHash=${this.selectedGroupDnaHash}
            @home-selected=${() => {
              this.dynamicLayout.openTab({
                type: "component",
                componentType: "welcome",
              });
            }}
            @group-selected=${(e: CustomEvent) =>
              this.openGroup(e.detail.groupDnaHash)}
            @group-created=${(e: CustomEvent) => {
              this.openGroup(e.detail.groupDnaHash);
            }}
          ></groups-sidebar>
        </div>

        <div class="column" style="flex: 1">
          <applets-sidebar
            class="top-bar"
            @applet-selected=${(e: CustomEvent) => {
              this.dynamicLayout.openTab({
                type: "component",
                componentType: "cross-applet-main",
                componentState: {
                  appletBundleHash: encodeHashToBase64(
                    e.detail.appletBundleHash
                  ),
                },
              });
            }}
            style="margin-left: 4px"
          ></applets-sidebar>

          <dynamic-layout
            id="dynamic-layout"
            .rootItemConfig=${{
              type: "row",
              content: [
                {
                  type: "component",
                  title: "Welcome",
                  componentType: "welcome",
                },
              ],
            }}
            style="flex: 1; min-width: 0;"
            @applet-selected=${(e: CustomEvent) => {
              this.dynamicLayout.openTab({
                type: "component",
                componentType: "applet-main",
                componentState: {
                  appletHash: encodeHashToBase64(e.detail.appletHash),
                },
              });
            }}
          ></dynamic-layout>
        </div>
      </div>
    `;
  }

  static get styles() {
    return [
      weStyles,
      css`
        :host {
          flex: 1;
          display: flex;
        }

        .top-left-corner-bg {
          border-style: solid;
          border-width: 72px 0 0 72px;
          position: absolute;
          z-index: 0;
          border-color: var(--sl-color-primary-600) var(--sl-color-primary-600)
            var(--sl-color-primary-600) var(--sl-color-primary-900);
        }

        .top-left-corner {
          z-index: 1;
          align-items: center;
          justify-content: center;
          background-color: transparent;
          height: 64px;
        }

        .left-sidebar {
          overflow-y: auto;
        }

        .top-bar {
          overflow-x: auto;
          min-height: 64px;
          align-items: center;
        }

        groups-sidebar {
          background-color: var(--sl-color-primary-900);
          width: 64px;
        }

        applets-sidebar {
          z-index: 0;
          background-color: var(--sl-color-primary-600);
        }
      `,
    ];
  }
}
