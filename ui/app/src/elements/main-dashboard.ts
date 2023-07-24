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
import "@lightningrodlabs/we-applet/dist/elements/we-services-context.js";
import "@lightningrodlabs/we-applet/dist/elements/search-entry.js";

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
import { buildHeadlessWeServices } from "../applets/applet-host.js";
import { CreateGroupDialog } from "./create-group-dialog.js";

@customElement("main-dashboard")
export class MainDashboard extends LitElement {
  @consume({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @query("join-group-dialog")
  joinGroupDialog!: JoinGroupDialog;

  @state(hashState())
  selectedGroupDnaHash: DnaHash | undefined;

  async handleOpenGroup(networkSeed: string) {
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
          await this.handleOpenGroup(split2[1]);
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
      id: `group-home-${encodeHashToBase64(groupDnaHash)}`,
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

      <create-group-dialog id="create-group-dialog"></create-group-dialog>

      <!-- golden-layout -->
      <div style="display: flex; flex: 1; position: fixed; top: 74px; left: 74px; z-index: auto;">
        <div style="position: fixed; top: 74px; left: 74px; bottom: 0px; right: 0px; height: calc(100% - 74px);">
          <dynamic-layout
            id="dynamic-layout"
            .rootItemConfig=${{
              type: "row",
              content: [
                {
                  id: "welcome",
                  type: "component",
                  title: "Welcome",
                  isClosable: false,
                  componentType: "welcome",
                },
              ],
            }}
            style="flex: 1; min-width: 0; height: 100%;"
            @open-group=${(e) => this.handleOpenGroup(e.detail.networkSeed)}
          ></dynamic-layout>
      </div>

      <!-- left sidebar -->
      <div class="column" style="position: fixed; left: 0; top: 0; bottom: 0;">
        <div class="top-left-corner-bg"></div>
        <div class="column top-left-corner">
          <sidebar-button
            style="--size: 58px; --border-radius: 25%; margin-top: 8px;"
            .logoSrc=${weLogoIcon}
            .tooltipText=${msg("Welcome")}
            placement="bottom"
            @click=${() => {
              this.dynamicLayout.openTab({
                id: "welcome",
                type: "component",
                componentType: "welcome",
                title: msg("Welcome"),
              });
            }}
          ></sidebar-button>
        </div>

        <groups-sidebar
          class="left-sidebar"
          style="display: flex; flex: 1; margin-top: 4px; overflow-y: scroll; overflow-x: hidden;"
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
          @request-create-group=${() =>
            (this.shadowRoot?.getElementById(
                "create-group-dialog"
              ) as CreateGroupDialog
            ).open()
            }
        ></groups-sidebar>
      </div>


      <!-- top bar -->
      <div class="top-bar row" style="flex: 1; position: fixed; left: 74px; top: 0; right: 0;">
        <applets-sidebar
          @applet-selected=${(e: CustomEvent) => {
            this.dynamicLayout.openViews.openCrossAppletMain(
              e.detail.appletBundleHash
            );
          }}
          style="margin-left: 4px; flex: 1; overflow-x: sroll;"
        ></applets-sidebar>
        <we-services-context
          .services=${buildHeadlessWeServices(this._weStore)}
        >
          <search-entry
            field-label=""
            style="margin-right: 8px"
            @entry-selected=${(e) => {
              this.dynamicLayout.openViews.openHrl(
                e.detail.hrlWithContext.hrl,
                e.detail.hrlWithContext.context
              );
              e.target.reset();
            }}
          ></search-entry>
        </we-services-context>
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
          border-width: 74px 0 0 74px;
          position: absolute;
          z-index: 0;
          border-color: var(--sl-color-primary-600) var(--sl-color-primary-600)
            var(--sl-color-primary-600) var(--sl-color-primary-900);
          box-shadow: -6px 4px 10px 2px var(--sl-color-primary-900);
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
          background-color: var(--sl-color-primary-600);
          min-height: 74px;
          align-items: center;
        }

        groups-sidebar {
          background-color: var(--sl-color-primary-900);
          width: 74px;
        }
      `,
    ];
  }
}
