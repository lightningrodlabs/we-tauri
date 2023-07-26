import { consume } from "@lit-labs/context";
import { state, customElement, query } from "lit/decorators.js";
import { encodeHashToBase64, DnaHash, AnyDhtHash, EntryHash } from "@holochain/client";
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
import "./group-applets-sidebar.js";
import "./join-group-dialog.js";
import "../layout/dynamic-layout.js";
import "../layout/views/applet-main.js";
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

  @state(hashState())
  selectedAppletHash: EntryHash | undefined;

  @state()
  dashboardMode: "groupView" | "browserView" = "browserView";

  @state()
  hoverBrowser: boolean = false;

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

  renderDashboard() {
    switch (this.dashboardMode) {
      case "browserView":
        return html``

      case "groupView":
        return this.selectedAppletHash
         ? html`
              <applet-main
                .appletHash=${this.selectedAppletHash}
                style="flex: 1;"
              ></applet-main>
          `

        : html`
          <group-context .groupDnaHash=${this.selectedGroupDnaHash}>
            <group-home
              style="flex: 1"
              @group-left=${() => {
                this.selectedGroupDnaHash = undefined;
              }}
              @applet-selected=${(e: CustomEvent) => {
                // this.openViews.openAppletMain(e.detail.appletHash);
                this.selectedAppletHash = e.detail.appletHash;
              }}
              @applet-selected-open-tab=${(e: CustomEvent) => {
                this.dashboardMode = "browserView";
                this.selectedGroupDnaHash = undefined;
                this.dynamicLayout.openViews.openAppletMain(e.detail.appletHash);
              }}
              @custom-view-selected=${(e) => {
                this.dashboardMode = "browserView";
                this.dynamicLayout.openTab({
                  id: `custom-view-${this.selectedGroupDnaHash}-${encodeHashToBase64(
                    e.detail.customViewHash
                  )}`,
                  type: "component",
                  componentType: "custom-view",
                  componentState: {
                    groupDnaHash: this.selectedGroupDnaHash,
                    customViewHash: encodeHashToBase64(e.detail.customViewHash),
                  },
                });
              }}
              @custom-view-created=${(e) => {
                this.dashboardMode = "browserView";
                this.dynamicLayout.openTab({
                  id: `custom-view-${this.selectedGroupDnaHash}-${encodeHashToBase64(
                    e.detail.customViewHash
                  )}`,
                  type: "component",
                  componentType: "custom-view",
                  componentState: {
                    groupDnaHash: this.selectedGroupDnaHash,
                    customViewHash: encodeHashToBase64(e.detail.customViewHash),
                  },
                });
              }}
            ></group-home>
          </group-context>
          `
    }
  }

  openTab(arg0: { id: string; type: string; componentType: string; componentState: { groupDnaHash: any; customViewHash: string; }; }) {
    throw new Error("Method not implemented.");
  }

  render() {
    return html`
      <join-group-dialog
        @group-joined=${(e) => this.openGroup(e.detail.groupDnaHash)}
      ></join-group-dialog>

      <create-group-dialog id="create-group-dialog"></create-group-dialog>


      <!-- dashboard -->
      <!-- golden-layout (display: none if not in browserView) -->
      <div class="row hover-browser" style="${this.dashboardMode === "browserView" ? "" : "display: none;"}"></div>
      <div style="${this.dashboardMode === "browserView" ? "" : "display: none"}; position: fixed; top: 24px; left: 74px; bottom: 0px; right: 0px;">
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

      ${
        this.dashboardMode === "groupView"
          ? html`
            <div style="display: flex; flex: 1; position: fixed; top: 74px; left: 74px; bottom: 0; right: 0;">
              ${this.renderDashboard()}
            </div>
            `
          : html``
      }

      <!-- left sidebar -->
      <div class="column" style="position: fixed; left: 0; top: 0; bottom: 0; ${this.dashboardMode === "browserView" || this.hoverBrowser ? "background: var(--sl-color-primary-900);" : "background: var(--sl-color-primary-600);"}">
        <div
          class="column top-left-corner ${this.selectedGroupDnaHash ? "" : "selected"}"
          @mouseenter=${() => { this.hoverBrowser = true } }
          @mouseleave=${() => { this.hoverBrowser = false } }
        >
          <sidebar-button
            style="--size: 58px; --border-radius: 25%; --hover-color: transparent;"
            .selected=${this.selectedGroupDnaHash === undefined}
            .logoSrc=${weLogoIcon}
            .tooltipText=${msg("Browser View")}
            placement="bottom"
            @click=${() => {
              this.hoverBrowser = false;
              this.dashboardMode = "browserView";
              this.selectedAppletHash = undefined;
              this.selectedGroupDnaHash = undefined;
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
          style="display: flex; flex: 1; overflow-y: scroll; overflow-x: hidden;"
          .selectedGroupDnaHash=${this.selectedGroupDnaHash}
          @home-selected=${() => {
            this.dynamicLayout.openTab({
              type: "component",
              componentType: "welcome",
            });
          }}
          @group-selected=${(e: CustomEvent) => {
            this.selectedAppletHash = undefined;
            this.selectedGroupDnaHash = e.detail.groupDnaHash;
            this.dashboardMode = "groupView";
          }}
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
      <div class="top-bar row" style="${this.selectedGroupDnaHash ? "" : "display: none;"} flex: 1; position: fixed; left: 74px; top: 0; right: 0;">
        ${
          this.selectedGroupDnaHash
            ? html`
              <group-context .groupDnaHash=${this.selectedGroupDnaHash}>
                <group-applets-sidebar
                  .selectedAppletHash=${this.selectedAppletHash}
                  @applet-selected=${(e: CustomEvent) => {
                    this.dashboardMode = "groupView";
                    // this.dashboardMode = "browserView";
                    this.selectedAppletHash = e.detail.appletHash;
                    // this.dynamicLayout.openViews.openAppletMain(
                    //   e.detail.appletHash
                    // );
                  }}
                  @applet-selected-open-tab=${(e: CustomEvent) => {
                    this.selectedGroupDnaHash = undefined;
                    this.dashboardMode = "browserView";
                    this.dynamicLayout.openViews.openAppletMain(e.detail.appletHash);
                  }}
                  style="margin-left: 12px; flex: 1; overflow-x: sroll;"
                ></group-applets-sidebar>
              </group-context>

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
            `
            : html``
        }
      </div>

      <div class="row hover-browser" style="${this.hoverBrowser && this.dashboardMode !== 'browserView' ? "" : "display: none;"} align-items: center; font-size: 20px; padding-left: 20px; font-weight: 500;">
        <span>Switch to browser view...</span>
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

        .top-left-corner {
          align-items: center;
          justify-content: center;
          background: var(--sl-color-primary-900);
          height: 74px;
          border-radius: 12px 12px 0 0;
        }

        .top-left-corner:hover {
          border-radius: 12px 0 0 12px;
          background: var(--sl-color-primary-200);
        }

        .hover-browser {
          flex: 1;
          position: fixed;
          left: 74px;
          top: 0;
          right: 0;
          background: var(--sl-color-primary-200);
          height: 74px;
        }

        .selected {
          border-radius: 12px 0 0 12px;
          background: var(--sl-color-primary-200);
        }

        .open-tab-btn {
          background: var(--sl-color-primary-900);
          font-weight: 600;
          color: white;
          height: 40px;
          align-items: center;
          padding: 0 8px;
          border-radius: 4px;
          cursor: pointer;
        }

        .open-tab-btn:hover {
          background: var(--sl-color-primary-600);
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
