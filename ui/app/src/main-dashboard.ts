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
  WeGroupInfo,
} from "./matrix-store";
import { sharedStyles } from "./sharedStyles";
import { HomeScreen } from "./elements/home-screen";
import { get } from "svelte/store";
import { SlTooltip } from "@scoped-elements/shoelace";
import { DashboardMode } from "./types";
import { SidebarButton } from "./elements/sidebar-button";
import { CreateWeGroupDialog } from "./elements/create-we-group-dialog";

export class MainDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext })
  @state()
  _matrixStore!: MatrixStore;

  _allWeGroupInfos = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchAllWeGroupInfos(),
    () => [this._matrixStore]
  );

  _allAppletClasses = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchAllAppletClasses(),
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

  @query("#create-we-group-dialog")
  _createWeGroupDialog!: CreateWeGroupDialog;



  renderLeftSidebar() {
    // show all we groups in weGroup mode
    if (this._dashboardMode === "weGroup") {
      this.renderWeGroupList(get(this._allWeGroupInfos));
      // show all applet classes in appletClass mode
    } else if (this._dashboardMode === "appletClass") {
      this.renderAppletClassList(this._allAppletClasses);
      // show all we groups in mainHome mode
    } else {
      this.renderWeGroupList(get(this._allWeGroupInfos));
    }
  }

  renderTopSidebar() {
    // show all applet instances of the selected group in weGroup mode
    if (this._dashboardMode === "weGroup") {
      this.renderAppletInstanceList(
        get(
          this._matrixStore.getAppletInstanceInfosForGroup(
            this._selectedWeGroupId!
          )
        )
      );
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
      this.renderAppletClassList(get(this._allAppletClasses));
    }
  }

  renderWeGroupDashboard() {
    if (!this._selectedAppletInstanceId) {
      return html`
        <we-group-home .weGroupId=${this._selectedWeGroupId}></we-group-home>
      `;
    } else {
      return html` <applet-instance-renderer
        style="flex: 1"
        .appletInstanceId=${this._selectedAppletInstanceId}
      ></applet-instance-renderer>`;
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
              this._selectedAppletClassId = appletClassInfo.devHubReleaseHash;
              this.requestUpdate();
            }}
            class=${classMap({
              highlighted:
                appletClassInfo.devHubReleaseHash ===
                this._selectedAppletClassId,
              weLogoHover:
                appletClassInfo.devHubReleaseHash !=
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
            .tooltipText=${appletInstanceInfo.installedAppId}
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
      return html` <home-screen></home-screen> `;
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
