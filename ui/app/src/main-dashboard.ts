import { contextProvided } from "@lit-labs/context";
import { state, query } from "lit/decorators.js";
import {
  DnaHash,
  EntryHash,
} from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import {
  Fab,
  Icon,
  Snackbar,
} from "@scoped-elements/material-web";
import { classMap } from "lit/directives/class-map.js";
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
import { DnaHashMap } from "@holochain-open-dev/utils";
import { WeGroupContext } from "./elements/we-group-context";
import { AppletClassHome } from "./elements/applet-class-home";
import { WeGroupHome } from "./elements/we-group-home";
import { AppletClassRenderer } from "./elements/applet-class-renderer";
import { AppletInstanceRenderer } from "./elements/applet-instance-renderer";
import { AppletNotInstalled } from "./elements/applet-not-installed";
import { NotificationDot } from "./elements/notification-dot";
import { InactiveOverlay } from "./elements/inactive-overlay";
import { AppletIconBadge } from "./elements/applet-icon-badge";
import { mergeEyeViewIcon } from "./icons/merge-eye-view-icon";
import { weLogoIcon } from "./icons/we-logo-icon";

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
    () => [this._selectedWeGroupId, this._matrixStore]
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
      return this.renderAppletClassListPrimary(this._allAppletClasses.value.values());
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
          placement="bottom"
          .content="${this._matrixStore.getWeGroupInfo(this._selectedWeGroupId!)
            .name} Home"
        >
          <mwc-fab
            style="margin-left: 18px; margin-right: 6px; border-radius: 50%;"
            icon="home"
            class="group-home-button"
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
        <mwc-fab
          style="margin-left: 18px; margin-right: -12px; border-radius: 50%;"
          icon="home"
          class="applet-home-button"
          @click=${() => {
            this._selectedAppletInstanceId = undefined;
            this._selectedWeGroupId = undefined;
            this._dashboardMode = DashboardMode.AppletClassHome;
          }}
        ></mwc-fab>

        ${this.renderWeGroupIconsSecondary(
          get(
            this._matrixStore.getInstanceInfosForAppletClass(
              this._selectedAppletClassId!
            )
          )
        )}

        <span style="flex: 1"></span>

        ${this.renderSpecialAppletModeIcons()}
      `;
      // show all applet classes in NavigationMode.Agnostic
    } else {
      return html`
        ${this.renderAppletClassListSecondary(this._allAppletClasses.value.values())}
      `;
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
          style="display: flex; flex: 1;"
          .appletClassId=${this._selectedAppletClassId}
        ></applet-class-renderer>
      `;
    } else if (this._dashboardMode === DashboardMode.AppletClassHome) {
      return html`
        <applet-class-home
          style="flex: 1;"
          .appletClassId=${this._selectedAppletClassId}
        ></applet-class-home>
      `;
    }
  }

  renderAppletInstanceContent() {
    // 1. check whether the selected applet instance is already installed
    console.log("Is the applet installed?", this._matrixStore.isInstalled(this._selectedAppletInstanceId!));
    return this._matrixStore.isInstalled(this._selectedAppletInstanceId!)
      ? html`
        <applet-instance-renderer
          style="display: flex; flex: 1;"
          .appletInstanceId=${this._selectedAppletInstanceId}
        >
        </applet-instance-renderer>
      `
      : html`
        <applet-not-installed
          @applet-installed=${(e: CustomEvent) => this.handleAppletInstalled(e)}
          style="display: flex; flex: 1;"
          .appletInstanceId=${this._selectedAppletInstanceId}
        >
        </applet-not-installed>
      `;
  }


  handleWeGroupIconPrimaryClick(weGroupId: DnaHash) {
    this._navigationMode = NavigationMode.GroupCentric;
    if (this._selectedWeGroupId !== weGroupId) {
      this._dashboardMode = DashboardMode.WeGroupHome;
      this._selectedAppletInstanceId = undefined;
      this._selectedAppletClassId = undefined;
    }
    this._selectedWeGroupId = weGroupId;
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

  handleAppletClassIconClick(classId: EntryHash) {
    if (this._selectedAppletClassId !== classId) {
      this._selectedAppletClassId = classId;
      this._selectedAppletInstanceId = undefined;
      this._dashboardMode = DashboardMode.AppletClassHome;
    }
  }

  handleMergeEyeViewClick() {
    this._dashboardMode = DashboardMode.AppletClassRendering;
    this._selectedAppletInstanceId = undefined;
  }

  handleNavigationSwitch() {
    if (this._navigationMode === NavigationMode.AppletCentric) {
      if (this._selectedAppletInstanceId == undefined) { // for example when "Merge Eye View" is selected
        // select the first group in the list and show it's Group Home Page and set the selected class Id to undefined
        this._selectedWeGroupId = this._allWeGroupInfos.value.keys()[0];
        this._selectedAppletClassId = undefined;
        this._dashboardMode = DashboardMode.WeGroupHome;
      }

      this._navigationMode = NavigationMode.GroupCentric;
      (this.shadowRoot?.getElementById("applet-centric-snackbar") as Snackbar).close();
      (this.shadowRoot?.getElementById("group-centric-snackbar") as Snackbar).show();
      if (this._dashboardMode === DashboardMode.AppletClassHome) {
        this._dashboardMode = DashboardMode.WeGroupHome;
      }
    } else if (this._navigationMode === NavigationMode.GroupCentric) {
      if (this._selectedAppletClassId == undefined) {
        // choose the first class Id in the list
        this._selectedAppletClassId = this._allAppletClasses.value.keys()[0];
        this._dashboardMode = DashboardMode.AppletClassHome;
      }
      this._navigationMode = NavigationMode.AppletCentric;
      (this.shadowRoot?.getElementById("group-centric-snackbar") as Snackbar).close();
      (this.shadowRoot?.getElementById("applet-centric-snackbar") as Snackbar).show();
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
    return html`
      ${weGroups.map(
        (weGroupInfo) =>
          html`
            <sidebar-button
              style="margin-top: 4px; margin-bottom: 4px; border-radius: 50%;"
              .logoSrc=${weGroupInfo.info.logoSrc}
              .tooltipText=${weGroupInfo.info.name}
              @click=${() => {
                this.handleWeGroupIconPrimaryClick(weGroupInfo.dna_hash);
                this.requestUpdate();
              }}
              class=${classMap({
                highlightedGroupCentric: JSON.stringify(weGroupInfo.dna_hash) === JSON.stringify(this._selectedWeGroupId),
                groupCentricIconHover: JSON.stringify(weGroupInfo.dna_hash) != JSON.stringify(this._selectedWeGroupId),
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
    <span style="width: 18px;"></span>
      ${info.map(
        ([weGroupInfo, appletInstanceInfo]) =>
          html`
            <applet-icon-badge .logoSrc=${appletInstanceInfo.applet.logoSrc}>
              <sidebar-button
                placement="bottom"
                style="margin-left: 4px; margin-right: 4px; border-radius: 50%;"
                .logoSrc=${weGroupInfo.info.logoSrc}
                .tooltipText=${weGroupInfo.info.name +
                " - " +
                appletInstanceInfo.applet.customName}
                @click=${() => {
                  this.handleWeGroupIconSecondaryClick(
                    weGroupInfo.dna_hash,
                    appletInstanceInfo.appletId
                  );
                  this.requestUpdate();
                }}
                class=${classMap({
                  highlightedGroupCentric: JSON.stringify(appletInstanceInfo.appletId) === JSON.stringify(this._selectedAppletInstanceId),
                  groupCentricIconHover: JSON.stringify(appletInstanceInfo.appletId) !== JSON.stringify(this._selectedAppletInstanceId),
                })}
              ></sidebar-button>
            </applet-icon-badge>
          `
      )}
    `;
  }

  renderAppletClassListPrimary(appletClasses: AppletClassInfo[]) {
    // do stuff
    return appletClasses.map(
      (appletClassInfo) =>
        html`
          <sidebar-button
            style="margin-top: 4px; margin-bottom: 4px; margin-left: 3px; margin-right: 3px; border-radius: 50%;"
            .logoSrc=${appletClassInfo.logoSrc}
            .tooltipText=${appletClassInfo.title}
            @click=${() => {
              this.handleAppletClassIconClick(appletClassInfo.devhubHappReleaseHash)
            }}
            class=${classMap({
              highlightedAppletCentric:
                JSON.stringify(appletClassInfo.devhubHappReleaseHash) ===
                JSON.stringify(this._selectedAppletClassId),
              appletCentricIconHover:
                appletClassInfo.devhubHappReleaseHash !=
                this._selectedAppletClassId,
            })}
          >
          </sidebar-button>
        `
      // add special modes here
    );
  }


  renderAppletClassListSecondary(appletClasses: AppletClassInfo[]) {
    // do stuff
    return html`
      <span style="width: 18px;"></span>

      ${appletClasses.map(
        (appletClassInfo) =>
          html`
            <sidebar-button
              placement="bottom"
              style="margin-left: 4px; margin-right: 4px; border-radius: 50%;"
              .logoSrc=${appletClassInfo.logoSrc}
              .tooltipText=${appletClassInfo.title}
              @click=${() => {
                this._selectedAppletClassId =
                  appletClassInfo.devhubHappReleaseHash;
                this._navigationMode = NavigationMode.AppletCentric;
                this._dashboardMode = DashboardMode.AppletClassHome;
                this.requestUpdate();
              }}
              class=${classMap({
                highlightedAppletCentric:
                  JSON.stringify(appletClassInfo.devhubHappReleaseHash) ===
                  JSON.stringify(this._selectedAppletClassId),
                appletCentricIconHover:
                  appletClassInfo.devhubHappReleaseHash !=
                  this._selectedAppletClassId,
              })}
            >
            </sidebar-button>
        `
      // add special modes here
    )}
  `;
  }

  renderAppletInstanceList(appletInstances: AppletInstanceInfo[]) {
    // do stuff
    return appletInstances.map(
      (appletInstanceInfo) =>
        html`
          <sidebar-button
            placement="bottom"
            style="margin-left: 4px; margin-right: 4px; border-radius: 50%;"
            .logoSrc=${appletInstanceInfo.applet.logoSrc}
            .tooltipText=${appletInstanceInfo.applet.customName}
            @click=${() => {
              this._selectedAppletInstanceId = appletInstanceInfo.appletId;
              this._selectedAppletClassId =
                appletInstanceInfo.applet.devhubHappReleaseHash;
              this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
              this.requestUpdate();
            }}
            class=${classMap({
              highlightedAppletCentric:
              JSON.stringify(appletInstanceInfo.appletId) === JSON.stringify(this._selectedAppletInstanceId),
              appletCentricIconHover:
              JSON.stringify(appletInstanceInfo.appletId) != JSON.stringify(this._selectedAppletInstanceId),
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

    if (relevantNewAppletInstances) {
      return relevantNewAppletInstances.map(
        (newAppletInstanceInfo) =>
          html`
            <notification-dot>
              <sidebar-button
                notificationDot
                placement="bottom"
                style="margin-left: 4px; margin-right: 4px; border-radius: 50%;"
                .logoSrc=${newAppletInstanceInfo.applet.logoSrc}
                .tooltipText=${newAppletInstanceInfo.applet.customName}
                @click=${() => {
                  this.handleNewAppletInstanceIconClick(
                    newAppletInstanceInfo.appletId
                  );
                  this.requestUpdate();
                }}
                class=${classMap({
                  highlightedAppletCentric:
                  JSON.stringify(newAppletInstanceInfo.appletId) ===
                    JSON.stringify(this._selectedAppletInstanceId),
                  appletCentricIconHover:
                  JSON.stringify(newAppletInstanceInfo.appletId) !=
                    JSON.stringify(this._selectedAppletInstanceId),
                })}
              >
              </sidebar-button>
            </notification-dot>
          `
      );
    }
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
        placement="bottom"
        style="margin-left: 4px; margin-right: 4px; border-radius: 50%;"
        logoSrc="${mergeEyeViewIcon}"
        tooltipText="Merge Eye View"
        @click=${() => {
          this.handleMergeEyeViewClick();
          this.requestUpdate();
        }}
        class=${classMap({
          highlightedGroupCentric: this._dashboardMode == DashboardMode.AppletClassRendering,
          secondaryIconHover: !this._specialAppletMode,
        })}
      ></sidebar-button>
      <span style="width: 8px;"></span>
    `;
  }


  handleWeGroupAdded(e: CustomEvent) {
    this._selectedWeGroupId = e.detail;
    this._selectedAppletInstanceId = undefined;
    this._selectedAppletClassId = undefined;
    this._dashboardMode = DashboardMode.WeGroupHome;
    this._navigationMode = NavigationMode.GroupCentric;
  }


  handleAppletInstalled(e: CustomEvent) {
    this._selectedAppletInstanceId = e.detail.appletEntryHash;
    this._selectedAppletClassId = this._matrixStore.getAppletInstanceInfo(e.detail.appletEntryHash)?.applet.devhubHappReleaseHash;
    this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
    this._navigationMode = NavigationMode.GroupCentric;
    this._newAppletInstances.run();
    this.requestUpdate();
  }

  render() {
    return html`
      <create-we-group-dialog
        @we-added=${(e) => this.handleWeGroupAdded(e)}
        id="create-we-group-dialog"
      ></create-we-group-dialog>

      <mwc-snackbar id="applet-centric-snackbar" labelText="Applet-Centric Navigation" style="text-align: center;"></mwc-snackbar>
      <mwc-snackbar id="group-centric-snackbar" labelText="Group-Centric Navigation" style="text-align: center;"></mwc-snackbar>

      <div class="navigation-switch-container ${classMap({
          invisible: this._dashboardMode == DashboardMode.MainHome })}
      ">
        <sl-tooltip placement="right" content="Switch Navigation Mode" hoist>
          <mwc-icon class="navigation-switch" @click=${this.handleNavigationSwitch}>open_in_full</mwc-icon>
        </sl-tooltip>
      </div>

      <div class="row" style="flex: 1" @we-group-joined=${(e) => this.handleWeGroupAdded(e)}>
        <div class="column">
          <div class="top-left-corner-bg ${classMap({
                  tlcbgGroupCentric: this._navigationMode === NavigationMode.GroupCentric || this._navigationMode == NavigationMode.Agnostic,
                  tlcbgAppletCentric: this._navigationMode === NavigationMode.AppletCentric,
                })}">
          </div>
          <div class="column top-left-corner">
              <sidebar-button
                style="border-radius: 50%;"
                logoSrc="${weLogoIcon}"
                tooltipText="Home"
                @click=${() => {
                  this._selectedWeGroupId = undefined;
                  this._selectedAppletClassId = undefined;
                  this._selectedAppletInstanceId = undefined;
                  this._dashboardMode = DashboardMode.MainHome;
                  this._navigationMode = NavigationMode.Agnostic;
                }}
                class=${classMap({
                  highlightedHome: this._dashboardMode === DashboardMode.MainHome,
                  homeIconHover: this._dashboardMode !== DashboardMode.MainHome,
                })}
              ></sidebar-button>
          </div>

          <div class="
            column
            left-sidebar
            ${classMap({
              navBarGroupCentric: this._navigationMode === NavigationMode.GroupCentric || this._navigationMode == NavigationMode.Agnostic,
              navBarAppletCentric: this._navigationMode === NavigationMode.AppletCentric,
            })}"
            style="flex: 1; align-items: center;"
          >

            ${this.renderPrimaryNavigation()}

            <span style="flex: 1"></span>

            <holo-identicon
              .hash=${this._matrixStore.myAgentPubKey}
              style="margin-top: 30px;"
            ></holo-identicon>
          </div>
        </div>

        <div class="column" style="flex: 1;">
          <div class="
            row
            top-bar
            ${classMap({
              navBarAppletCentric: this._navigationMode === NavigationMode.GroupCentric || this._navigationMode == NavigationMode.Agnostic,
              navBarGroupCentric: this._navigationMode === NavigationMode.AppletCentric,
            })}"
          >
          ${this.renderSecondaryNavigation()}
          </div>
          <div
            class="dashboard-content"
            style="flex: 1; width: 100%; display: flex;"
            @applet-installed=${(e: CustomEvent) => this.handleAppletInstalled(e)}
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
      "mwc-icon": Icon,
      "mwc-snackbar": Snackbar,
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
      "applet-not-installed": AppletNotInstalled,
      "notification-dot": NotificationDot,
      "inactive-overlay": InactiveOverlay,
      "applet-icon-badge": AppletIconBadge,
    };
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
        }

        .top-left-corner {
          align-items: center;
          background-color: transparent;
          margin: 11px 8px 11px 8px;
          height: 54 px;
          z-index: 1;
        }

        .top-left-corner-bg {
          border-style: solid;
          border-width: 72px 0 0 72px;
          position: absolute;
          z-index: 0;
        }

        .tlcbgGroupCentric {
          border-color: #9ca5e3 #9ca5e3 #9ca5e3 #303f9f;
        }

        .tlcbgAppletCentric {
          border-color: #303f9f #303f9f #303f9f #9ca5e3;
        }

        .left-sidebar {
          overflow-y: auto;
          width: 72px;
          padding-top: 16px;
          z-index: 1;
        }

        .top-bar {
          overflow-x: auto;
          z-index: 0.5;
          min-height: 72px;
          align-items: center;
        }

        .navBarGroupCentric {
          background-color: #303f9f;
        }

        .navBarAppletCentric {
          background-color: #9ca5e3;
        }

        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }

        .invisible {
          display: none;
        }


        .highlightedAppletCentric {
          outline: #303f9f 4px solid;
        }

        .highlightedGroupCentric {
          outline: #9ca5e3 4px solid;
        }

        .highlightedHome {
          outline: white 4px solid;
        }

        .homeIconHover:hover {
          outline: white 4px solid;
        }

        .groupCentricIconHover:hover {
          /* box-shadow: 0 0 7px #ffffff; */
          outline: #9ca5e3 4px solid;
        }

        .appletCentricIconHover:hover {
          /* box-shadow: 0 0 7px #ffffff; */
          outline: #303f9f 4px solid;
        }


        .navigation-switch {
          color: white;
          cursor: pointer;
          position: absolute;
          top: 46px;
          left: 46px;
          z-index: 2;
          --mdc-icon-size: 36px;
        }

        .navigation-switch:hover {
          --mdc-icon-size: 44px;
          top: 42px;
          left: 42px;
        }

        .group-home-button {
          margin-bottom: 4px;
          --mdc-theme-secondary: #303f9f;
          --mdc-fab-focus-outline-color: white;
          --mdc-fab-focus-outline-width: 4px;
        }

        .applet-home-button {
          margin-bottom: 4px;
          --mdc-theme-secondary: #9ca5e3;
          --mdc-fab-focus-outline-color: white;
          --mdc-fab-focus-outline-width: 4px;
        }
      `,
    ];
  }
}
