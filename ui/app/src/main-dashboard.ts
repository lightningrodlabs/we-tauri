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
  WeGroupData,
  WeGroupInfo,
} from "./matrix-store";
import { sharedStyles } from "./sharedStyles";
import { HomeScreen } from "./elements/home-screen";
import { get } from "svelte/store";
import { SlTooltip } from "@scoped-elements/shoelace";
import { DashboardMode, NavigationMode, RenderingMode } from "./types";
import { SidebarButton } from "./elements/sidebar-button";
import { CreateWeGroupDialog } from "./elements/create-we-group-dialog";
import { DnaHashMap } from "./holo-hash-map-temp";
import { WeGroupContext } from "./elements/we-group-context";
import { AppletClassHome } from "./elements/applet-class-home";
import { WeGroupHome } from "./elements/we-group-home";
import { AppletClassRenderer } from "./elements/applet-class-renderer";

export class MainDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext })
  @state()
  _matrixStore!: MatrixStore;

  _matrix = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchMatrix(),
    () => [this._matrixStore]
  );

  _allWeGroupInfos = new StoreSubscriber(this, () =>
    this._matrixStore.weGroupInfos()
  );

  _allAppletClasses = new StoreSubscriber(this, () =>
    this._matrixStore.installedAppletClasses()
  );

  _newAppletInstances = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchNewAppletInstances(),
    () => [this._selectedWeGroupId]
  );

  /**
   * Defines the content of the dashboard
   */
  @state()
  private _dashboardMode: DashboardMode = DashboardMode.MainHome;

  /**
   * Defines the content of the navigation panels (left sidebar (primary) and top bar (secondary))
   */
  @state()
  private _navigationMode: NavigationMode = NavigationMode.Agnostic;

  /**
   * Distinguishes between rendering modes, not explicitly required at the moment
   */
  @state()
  private _renderingMode: RenderingMode = RenderingMode.Agnostic;

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

  renderPrimaryNavigation() {
    // show all we groups in weGroup mode
    if (this._navigationMode === NavigationMode.GroupCentric) {
      return this.renderWeGroupIconsPrimary(
        this._allWeGroupInfos.value.values()
      );
      // show all applet classes in appletClass mode
    } else if (this._navigationMode === NavigationMode.AppletCentric) {
      return this.renderAppletClassList(this._allAppletClasses.value.values());
      // show all we groups in mainHome mode
    } else {
      return this.renderWeGroupIconsPrimary(
        this._allWeGroupInfos.value.values()
      );
    }
  }

  renderSecondaryNavigation() {
    // show all applet instances of the selected group in weGroup mode
    if (this._navigationMode === NavigationMode.GroupCentric) {
      return html`
        <sl-tooltip
          hoist
          placement="right"
          .content="${this._matrixStore.getWeGroupInfo(this._selectedWeGroupId!)
            .name} Home"
        >
          <mwc-fab
            icon="home"
            class="home-button"
            @click=${() => {
              this._selectedAppletInstanceId = undefined;
              this._dashboardMode = DashboardMode.WeGroupHome;
            }}
          ></mwc-fab>
        </sl-tooltip>

        ${this.renderAppletInstanceList(
          get(
            this._matrixStore.getAppletInstanceInfosForGroup(
              this._selectedWeGroupId!
            )
          )
        )}
        ${this._newAppletInstances.render({
          complete: (allNewAppletInstances) =>
            this.renderNewAppletInstanceIcons(allNewAppletInstances),
          pending: () => html``,
        })}
      `;

      // show all groups that have the currently selected applet class installed in NavigationMode.AppletCentric
      // and show the special modes of the chosen applet class
    } else if (this._navigationMode === NavigationMode.AppletCentric) {
      return html`
        ${this.renderWeGroupIconsSecondary(
          get(
            this._matrixStore.getInstanceInfosForAppletClass(
              this._selectedAppletClassId!
            )
          )
        )}
        ${this.renderSpecialAppletModeIcons()}
      `;
      // show all applet classes in NavigationMode.Agnostic
    } else {
      this.renderAppletClassList(this._allAppletClasses.value.values());
    }
  }

  renderDashboardContent() {
    if (this._dashboardMode === DashboardMode.MainHome) {
      return html`
        <home-screen style="display: flex; flex: 1;"></home-screen>
      `;
    } else if (this._dashboardMode === DashboardMode.WeGroupHome) {
      return html`
        <we-group-context .weGroupId=${this._selectedWeGroupId}>
          <we-group-home
            style="display: flex; flex: 1;"
            .weGroupId=${this._selectedWeGroupId}
            @applet-installed=${(e: CustomEvent) => {
              this._selectedAppletInstanceId = e.detail.appletEntryHash;
            }}
          ></we-group-home>
        </we-group-context>
      `;
    } else if (
      this._dashboardMode === DashboardMode.AppletGroupInstanceRendering
    ) {
      return html`
        <we-group-context .weGroupId=${this._selectedWeGroupId}>
          ${this.renderAppletInstanceContent()}
        </we-group-context>
      `;
    } else if (this._dashboardMode === DashboardMode.AppletClassRendering) {
      return html`
        <applet-class-renderer
          .appletClassId=${this._selectedAppletClassId}
        ></applet-class-renderer>
      `;
    } else if (this._dashboardMode === DashboardMode.AppletClassHome) {
      return html`
        <applet-class-home
          .appletClassId=${this._selectedAppletClassId}
        ></applet-class-home>
      `;
    }
  }

  renderAppletInstanceContent() {
    // 1. check whether the selected applet instance is already installed
    return this._matrixStore.isInstalled(this._selectedAppletInstanceId!)
      ? html`
          <applet-not-installed
            style="display: flex; flex: 1;"
            .appletInstanceId=${this._selectedAppletInstanceId}
          >
          </applet-not-installed>
        `
      : html`
          <applet-instance-renderer
            style="display: flex; flex: 1;"
            .appletInstanceId=${this._selectedAppletInstanceId}
          >
          </applet-instance-renderer>
        `;
  }

  renderAppletClassDashboard() {
    if (this._specialAppletMode) {
      return html`
        <applet-class-renderer
          style="display:flex; flex: 1"
          .appletClassId=${this._selectedAppletClassId}
        ></applet-class-renderer>
      `;
    } else {
      return html`
        <applet-instance-renderer
          style="display: flex; flex: 1"
          .appletInstanceId=${this._selectedAppletInstanceId}
        ></applet-instance-renderer>
      `;
    }
  }

  handleWeGroupIconPrimaryClick(weGroupId: DnaHash) {
    this._selectedWeGroupId = weGroupId;
    if (
      this._dashboardMode !== DashboardMode.WeGroupHome &&
      this._dashboardMode !== DashboardMode.AppletGroupInstanceRendering
    ) {
      this._dashboardMode = DashboardMode.WeGroupHome;
    }
  }

  handleWeGroupIconSecondaryClick(weGroupId: DnaHash, appletId: EntryHash) {
    this._selectedWeGroupId = weGroupId;
    this._selectedAppletInstanceId = appletId;
    this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
  }

  handleNewAppletInstanceIconClick(appletId: EntryHash) {
    this._selectedAppletInstanceId = appletId;
    this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
  }

  handleBirdsEyeViewClick() {
    this._dashboardMode = DashboardMode.AppletClassRendering;
  }

  handleNavigationSwitch() {
    if (this._navigationMode === NavigationMode.AppletCentric) {
      this._navigationMode = NavigationMode.GroupCentric;
      if (this._dashboardMode === DashboardMode.AppletClassHome) {
        this._dashboardMode = DashboardMode.WeGroupHome;
      }
    } else if (this._navigationMode === NavigationMode.GroupCentric) {
      this._navigationMode = NavigationMode.AppletCentric;
      if (this._dashboardMode === DashboardMode.WeGroupHome) {
        this._dashboardMode = DashboardMode.AppletClassHome;
      }
    }
  }

  /**
   * Renders the We Group Icons if they are to be shown in the primary navigational panel
   * @param weGroups
   * @returns
   */
  renderWeGroupIconsPrimary(weGroups: WeGroupInfo[]) {
    console.log("RENDERING WE GROUP ICONS PRIMARY");
    return html`
      ${weGroups.map(
        (weGroupInfo) =>
          html`
            <sidebar-button
              .logoSrc=${weGroupInfo.info.logo_src}
              .tooltipText=${weGroupInfo.info.name}
              @click=${() => {
                this.handleWeGroupIconPrimaryClick(weGroupInfo.dna_hash);
                this.requestUpdate();
              }}
              class=${classMap({
                highlighted: weGroupInfo.dna_hash === this._selectedWeGroupId,
                weLogoHover: weGroupInfo.dna_hash != this._selectedWeGroupId,
              })}
            ></sidebar-button>
          `
      )}

      <sl-tooltip placement="right" content="Add Group" hoist>
        <mwc-fab
          icon="group_add"
          @click=${() => this._createWeGroupDialog.open()}
          style="margin-top: 4px; --mdc-theme-secondary: #9ca5e3;"
        ></mwc-fab>
      </sl-tooltip>
    `;
  }

  /**
   * Renders the We Group Icons if they are to be shown in the secondary navigational panel
   * @param weGroups
   * @returns
   */
  renderWeGroupIconsSecondary(info: [WeGroupInfo, AppletInstanceInfo][]) {
    return html`
      ${info.map(
        ([weGroupInfo, appletInstanceInfo]) =>
          html`
            <sidebar-button
              .logoSrc=${weGroupInfo.info.logo_src}
              .tooltipText=${weGroupInfo.info.name +
              " - " +
              appletInstanceInfo.installedAppInfo.installed_app_id}
              @click=${() => {
                this.handleWeGroupIconSecondaryClick(
                  weGroupInfo.dna_hash,
                  appletInstanceInfo.appletId
                );
                this.requestUpdate();
              }}
              class=${classMap({
                highlighted: weGroupInfo.dna_hash === this._selectedWeGroupId,
                weLogoHover: weGroupInfo.dna_hash != this._selectedWeGroupId,
              })}
            ></sidebar-button>
          `
      )}
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
              this._selectedAppletClassId =
                appletClassInfo.devhubHappReleaseHash;
              this.requestUpdate();
            }}
            class=${classMap({
              highlighted:
                appletClassInfo.devhubHappReleaseHash ===
                this._selectedAppletClassId,
              weLogoHover:
                appletClassInfo.devhubHappReleaseHash !=
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
            .logoSrc=${appletInstanceInfo.applet.logoSrc}
            .tooltipText=${appletInstanceInfo.applet.name}
            @click=${() => {
              this._selectedAppletInstanceId = appletInstanceInfo.appletId;
              this._selectedAppletClassId =
                appletInstanceInfo.applet.devhubHappReleaseHash;
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

  /**
   * Renders Icons of Applets that have been newly installed to the given
   * we group by someone else but which are not yet installed on the
   * agents own conductor.
   *
   * @param allNewAppletInstances
   * @returns
   */
  renderNewAppletInstanceIcons(
    allNewAppletInstances: DnaHashMap<NewAppletInstanceInfo[]>
  ) {
    const relevantNewAppletInstances = allNewAppletInstances.get(
      this._selectedWeGroupId!
    );
    return relevantNewAppletInstances.map(
      (newAppletInstanceInfo) =>
        html`
          <sidebar-button
            .logoSrc=${newAppletInstanceInfo.applet.logoSrc}
            .tooltipText=${newAppletInstanceInfo.applet.name}
            @click=${() => {
              this.handleNewAppletInstanceIconClick(
                newAppletInstanceInfo.appletId
              );
              this.requestUpdate();
            }}
            class=${classMap({
              highlighted:
                newAppletInstanceInfo.appletId ===
                this._selectedAppletInstanceId,
              weLogoHover:
                newAppletInstanceInfo.appletId !=
                this._selectedAppletInstanceId,
            })}
          >
          </sidebar-button>
        `
    );
  }

  /**
   * Renders the icons of special modes of an applet *class*.
   * Currently only the "Birds Eye View" which renders the applet across
   * all we groups that have one or more applet instances of this class
   * installed.
   *
   * @returns
   */
  renderSpecialAppletModeIcons() {
    return html`
      <sidebar-button
        logoSrc="merge_view_icon"
        tooltipText="Birds Eye View"
        @click=${() => {
          this.handleBirdsEyeViewClick();
          this.requestUpdate();
        }}
        class=${classMap({
          highlighted: this._specialAppletMode,
          weLogoHover: !this._specialAppletMode,
        })}
      ></sidebar-button>
    `;
  }

  render() {
    return html`
      <create-we-group-dialog
        id="create-we-group-dialog"
      ></create-we-group-dialog>

      <div class="row" style="flex: 1">
        <div class="column left-sidebar">
          <div class="column" style="flex: 1; align-items: center; margin: 8px">
            <sidebar-button
              logoSrc="https://lightningrodlabs.org/projects/we.svg"
              tooltipText="Home"
              @click=${() => {
                this._selectedWeGroupId = undefined;
                this._selectedAppletClassId = undefined;
                this._selectedAppletInstanceId = undefined;
                this._dashboardMode = DashboardMode.MainHome;
              }}
              class=${classMap({
                highlighted: this._dashboardMode === DashboardMode.MainHome,
                weLogoHover: this._dashboardMode !== DashboardMode.MainHome,
              })}
            ></sidebar-button>

            ${this.renderPrimaryNavigation()}

            <span style="flex: 1"></span>

            <holo-identicon
              .hash=${this._matrixStore.myAgentPubKey}
              style="margin-top: 30px;"
            ></holo-identicon>
          </div>
        </div>

        <div class="column" style="flex: 1;">
          <div class="row top-bar">${this.renderSecondaryNavigation()}</div>
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
      "we-group-context": WeGroupContext,
      "applet-class-home": AppletClassHome,
      "we-group-home": WeGroupHome,
      "applet-class-renderer": AppletClassRenderer,
      "applet-instance-renderer": AppletInstanceRenderer,
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

        .top-bar {
          background-color: #303f9f;
          overflow-x: auto;
          z-index: 1;
          min-height: 70px;
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
