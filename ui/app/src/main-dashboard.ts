import { contextProvided, ContextProvider } from "@lit-labs/context";
import { state, query } from "lit/decorators.js";
import {
  AppWebsocket,
  AdminWebsocket,
  InstalledCell,
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import {
  IconButton,
  Button,
  CircularProgress,
  Fab,
} from "@scoped-elements/material-web";
import { classMap } from "lit/directives/class-map.js";
import { DnaHashB64 } from "@holochain-open-dev/core-types";
import { HoloIdenticon } from "@holochain-open-dev/utils";

import { matrixContext } from "./context";
import {
  AppletClassInfo,
  AppletInstanceInfo,
  MatrixStore,
  NewAppletInstanceInfo,
  WeGroupInfo,
} from "./matrix-store";
import { sharedStyles } from "./sharedStyles";
import { HomeScreen } from "./elements/home-screen";
import { get } from "svelte/store";
import { SlTooltip } from "@scoped-elements/shoelace";
import { DashboardMode } from "./types";
import { SidebarButton } from "./elements/sidebar-button";
import { CreateWeGroupDialog } from "./elements/create-we-group-dialog";
import { DnaHashMap } from "./holo-hash-map-temp";

export class MainDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext })
  @state()
  _matrixStore!: MatrixStore;

  _allWeGroupInfos = new StoreSubscriber(
    this,
    () => this._matrixStore.weGroupInfos(),
  );

  _allAppletClasses = new StoreSubscriber(
    this,
    () => this._matrixStore.appletClasses(),
  );

  _allNewAppletInstances = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchNewAppletInstances(),
    () => [this._matrixStore]
  );



  _matrix = new StoreSubscriber(this, () => this._matrixStore.matrix());

  @state()
  private _dashboardMode: DashboardMode = "mainHome";

  @state()
  private _selectedWeGroupId: DnaHash | undefined; // DNA hash of the selected we group

  @state()
  private _selectedAppletClassId: EntryHash | undefined; // devhub hApp release hash of the selected Applet class

  @state()
  private _selectedAppletInstanceId: EntryHash | undefined; // hash of the Applet's entry in group's we dna of the selected Applet instance

  @state()
  private _specialAppletMode: boolean = false;

  @state()
  private _showAppletDescription: boolean = false;

  @query("#create-we-group-dialog")
  _createWeGroupDialog!: CreateWeGroupDialog;


  private toggleAppletDescription() {
    this._showAppletDescription = !this._showAppletDescription;
  }

  private weGroupStore(weGroupId) {
    return get(this._matrixStore.matrix()).get(this._selectedWeGroupId!)[0].store
  }


  renderLeftSidebar() {
    // show all we groups in weGroup mode
    if (this._dashboardMode === "weGroup") {
      this.renderWeGroupList(this._allWeGroupInfos.value.values());
      // show all applet classes in appletClass mode
    } else if (this._dashboardMode === "appletClass") {
      this.renderAppletClassList(this._allAppletClasses.value.values());
      // show all we groups in mainHome mode
    } else {
      this.renderWeGroupList(this._allWeGroupInfos.value.values());
    }
  }

  renderTopSidebar() {
    // show all applet instances of the selected group in weGroup mode
    if (this._dashboardMode === "weGroup") {
      return html`
        ${this.renderAppletInstanceList(
          get(
            this._matrixStore.getAppletInstanceInfosForGroup(
              this._selectedWeGroupId!
            )
          )
        )}

        ${this._allNewAppletInstances.render({
            complete: (allNewAppletInstances) => this.renderNewAppletInstanceList(allNewAppletInstances),
            pending: () => html``,
          }
        )}
      `


      // show all groups that have the currently selected applet class installed in appletClass mode
      // and show the special modes of the chosen applet class
    } else if (this._dashboardMode === "appletClass") {
      return html`
        ${this.renderWeGroupList(
          get(
            this._matrixStore.getGroupInfosForAppletClass(
              this._selectedAppletClassId!
            )
          )
        )}

        ${this.renderSpecialAppletModes()}
      `;
      // show all applet classes in mainHome mode
    } else {
      this.renderAppletClassList(this._allAppletClasses.value.values());
    }
  }

  renderWeGroupDashboard() {
    if (!this._selectedAppletInstanceId) {
      return html`
        <we-group-home .weGroupId=${this._selectedWeGroupId}></we-group-home>
      `;
    } else if (this.weGroupStore(this._selectedWeGroupId).isInstalled(this._selectedAppletInstanceId)) {
      return html` <applet-instance-renderer
        style="flex: 1"
        .appletInstanceId=${this._selectedAppletInstanceId}
      ></applet-instance-renderer>`;
    } else {
      const applet = this.weGroupStore(this._selectedWeGroupId).getAppletInfo(this._selectedAppletInstanceId)!;
      return html`
        <div class="flex-scrollable-parent">
          <div class="flex-scrollable-container">
            <div class="flex-scrollable-y">
              <div
                class="column center-content"
                style="flex: 1; margin-top: 50px;"
              >
                ${!applet.logoSrc
                  ? html`<div
                      class="logo-placeholder-large"
                      style="width: 100px; height: 100px;"
                    >
                      ${applet.name[0]}
                    </div>`
                  : html`<img class="logo-large" src=${applet.logoSrc!} />`}
                <div class="row center-content" style="margin-top: 20px;">
                  <div
                    style="font-size: 1.4em; margin-left: 50px; margin-right: 5px;"
                  >
                    ${applet.name}
                  </div>
                  <mwc-icon-button-toggle
                    onIcon="expand_less"
                    offIcon="expand_more"
                    @click=${this.toggleAppletDescription}
                  ></mwc-icon-button-toggle>
                </div>
                ${this._showAppletDescription
                  ? html`<div
                      style="margin-top: 10px; font-size: 1em; max-width: 800px; color: #656565;"
                    >
                      ${applet.description}
                    </div>`
                  : html``}
                <div
                  style="margin-top: 70px; font-size: 1.2em; text-align: center;"
                >
                  This applet has been added by someone else from your group.
                </div>
                <div
                  style="margin-top: 10px; font-size: 1.2em; text-align: center;"
                >
                  You haven't installed it yet.
                </div>
                <mwc-button
                  style="margin-top: 50px;"
                  raised
                  @click=${() => this.weGroupStore(this._selectedWeGroupId).joinApplet(this._selectedAppletInstanceId!)}
                  >INSTALL</mwc-button
                >
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  renderAppletClassDashboard() {
    if (this._specialAppletMode) {
      return html`
        <applet-class-renderer
          style="flex: 1"
          .appletClassId=${this._selectedAppletClassId}
        ></applet-class-renderer>
      `;
    } else {
      return html`
        <applet-instance-renderer
          style="flex: 1"
          .appletInstanceId=${this._selectedAppletInstanceId}
        ></applet-instance-renderer>
      `;
    }
  }

  renderWeGroupList(weGroups: WeGroupInfo[]) {
    return html`
      ${weGroups.map(
        (weGroupInfo) =>
          html`
            <sidebar-button
              .logoSrc=${weGroupInfo.info.logo_src}
              .tooltipText=${weGroupInfo.info.name}
              @click=${() => {
                this._selectedWeGroupId = weGroupInfo.dna_hash;
                this._specialAppletMode = false;
                this.requestUpdate();
              }}
              class=${classMap({
                highlighted: weGroupInfo.dna_hash === this._selectedWeGroupId,
                weLogoHover: weGroupInfo.dna_hash != this._selectedWeGroupId,
              })}
            ></sidebar-button>
          `
      )}

      ${this._dashboardMode === "weGroup"
        ? html`
          <sl-tooltip placement="right" content="Add Group" hoist>
            <mwc-fab
              icon="group_add"
              @click=${() => this._createWeGroupDialog.open()}
              style="margin-top: 4px; --mdc-theme-secondary: #9ca5e3;"
            ></mwc-fab>
          </sl-tooltip>
          `
        : html``
      }
    `;
  }


  renderAppletClassList(appletClasses: AppletClassInfo[]) {
    // do stuff
    return appletClasses.map(
      (appletClassInfo) =>
        html`
          <sidebar-button
            .logoSrc=${appletClassInfo.logoSrc}
            .tooltipText=${appletClassInfo.name}
            @click=${() => {
              this._selectedAppletClassId = appletClassInfo.devHubHappReleaseHash;
              this.requestUpdate();
            }}
            class=${classMap({
              highlighted:
                appletClassInfo.devHubHappReleaseHash ===
                this._selectedAppletClassId,
              weLogoHover:
                appletClassInfo.devHubHappReleaseHash !=
                this._selectedAppletClassId,
            })}
          >
          </sidebar-button>
        `
      // add special modes here
    );
  }

  renderAppletInstanceList(appletInstances: AppletInstanceInfo[]) {
    // do stuff
    return appletInstances.map(
      (appletInstanceInfo) =>
        html`
          <sidebar-button
            .logoSrc=${appletInstanceInfo.logoSrc}
            .tooltipText=${appletInstanceInfo.name}
            @click=${() => {
              this._selectedAppletInstanceId = appletInstanceInfo.appletId;
              this._specialAppletMode = false;
              this.requestUpdate();
            }}
            class=${classMap({
              highlighted:
                appletInstanceInfo.appletId === this._selectedAppletInstanceId,
              weLogoHover:
                appletInstanceInfo.appletId != this._selectedAppletInstanceId,
            })}
          >
          </sidebar-button>
        `
    );
  }


  renderNewAppletInstanceList(allNewAppletInstances: DnaHashMap<NewAppletInstanceInfo[]>) {
    const relevantNeAppletInstances = allNewAppletInstances.get(this._selectedWeGroupId!);
    return relevantNeAppletInstances.map(
      (newAppletInstanceInfo) =>
        html`
          <sidebar-button
            .logoSrc=${newAppletInstanceInfo.logoSrc}
            .tooltipText=${newAppletInstanceInfo.name}
            @click=${() => {
              this._selectedAppletInstanceId = newAppletInstanceInfo.appletId;
              this._specialAppletMode = false;
              this.requestUpdate();
            }}
            class=${classMap({
              highlighted:
                newAppletInstanceInfo.appletId === this._selectedAppletInstanceId,
              weLogoHover:
                newAppletInstanceInfo.appletId != this._selectedAppletInstanceId,
            })}
          >
          </sidebar-button>
        `
    )
  }


  renderSpecialAppletModes() {
    return html`
      <sidebar-button
        logoSrc="merge_view_icon"
        tooltipText="Birds Eye View"
        @click=${() => {
          this._specialAppletMode = true;
          this.requestUpdate();
        }}
        class=${classMap({
          highlighted: this._specialAppletMode,
          weLogoHover: !this._specialAppletMode,
        })}
      ></sidebar-button>
    `;
  }

  renderDashboardContent() {
    if (this._dashboardMode === "mainHome") {
      return html`
        <home-screen
          @we-added=${(e: CustomEvent) => {
            this._selectedWeGroupId = e.detail;
          }}>
        </home-screen> `;
    } else if (this._dashboardMode === "weGroup") {
      this.renderWeGroupDashboard();
    } else if (this._dashboardMode === "appletClass") {
      this.renderAppletClassDashboard();
    } else {
      return html`You found the sweet spot.`;
    }
  }

  render() {
    return html`

      <create-we-group-dialog id="create-we-group-dialog"></create-we-group-dialog>

      <div class="row" style="flex: 1">
        <div class="column left-sidebar"></div>
          <sidebar-button
            logoSrc="https://lightningrodlabs.org/projects/we.svg"
            tooltipText="Home"
            @click=${() => {
                this._selectedWeGroupId = undefined;
                this._selectedAppletClassId = undefined;
                this._selectedAppletInstanceId = undefined;
                this._specialAppletMode = false;
                this._dashboardMode = "mainHome";
              }}
            class=${classMap({
              highlighted: this._dashboardMode === "mainHome",
              weLogoHover: this._dashboardMode !== "mainHome",
            })}
          ></sidebar-button>

          ${this.renderLeftSidebar()}

            <span style="flex: 1"></span>

            <holo-identicon
              .hash=${this._matrixStore.myAgentPubKey}
              style="margin-top: 30px;"
            ></holo-identicon>

        <div class="column">
          <div class="row top-sidebar">
            ${this.renderTopSidebar()}
          </div>
          <div
            class="dashboard-content"
            style="flex: 1; width: 100%; display: flex;"
          >
            ${this.renderDashboardContent()}
          </div>
        </div>
      </div>
    `;
  }


  static get scopedElements() {
    return {
      "mwc-fab": Fab,
      "sidebar-button": SidebarButton,
      "holo-identicon": HoloIdenticon,
      "create-we-group-dialog": CreateWeGroupDialog,
      "home-screen": HomeScreen,
      "sl-tooltip": SlTooltip,
    };
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
        }

        .left-sidebar {
          background-color: #303f9f;
          overflow-y: auto;
          z-index: 1;
        }

        .top-sidebar {
          background-color: #303f9f;
          overflow-y: auto;
          z-index: 1;
        }

        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }

        .highlighted {
          outline: #9ca5e3 4px solid;
        }

        .weLogoHover:hover {
          /* box-shadow: 0 0 7px #ffffff; */
          outline: #9ca5e3 4px solid;
        }

        .home-button {
          margin-bottom: 4px;
          --mdc-theme-secondary: #9ca5e3;
          --mdc-fab-focus-outline-color: white;
          --mdc-fab-focus-outline-width: 4px;
        }
      `,
    ];
  }
}
