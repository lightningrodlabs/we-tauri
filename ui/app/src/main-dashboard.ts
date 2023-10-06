import { contextProvided, contextProvider } from '@lit-labs/context';
import { state, query, property, queryAsync } from 'lit/decorators.js';
import { DnaHash, EntryHash, encodeHashToBase64 } from '@holochain/client';
import { html, css, CSSResult } from 'lit';
import { StoreSubscriber, TaskSubscriber } from 'lit-svelte-stores';
import { CircularProgress, Fab, Icon, Snackbar } from '@scoped-elements/material-web';
import { classMap } from 'lit/directives/class-map.js';
import { HoloIdenticon } from '@holochain-open-dev/elements';

import { matrixContext } from './context';
import {
  AppletClassInfo,
  AppletInstanceInfo,
  MatrixStore,
  NewAppletInstanceInfo,
  WeGroupInfo,
} from './matrix-store';
import { sharedStyles } from './sharedStyles';
import { HomeScreen } from './elements/dashboard/home-screen';
import { get } from 'svelte/store';
import { SlTooltip } from '@scoped-elements/shoelace';
import { DashboardMode, NavigationMode, RenderingMode } from './types';
import { SidebarButton } from './elements/components/sidebar-button';
import { CreateNeighbourhoodDialog } from './elements/dialogs/create-nh-dialog';
import { DnaHashMap } from '@holochain-open-dev/utils';
import { WeGroupContext } from './elements/we-group-context';
import { AppletClassHome } from './elements/dashboard/applet-class-home';
import { NeighbourhoodHome } from './elements/dashboard/neighbourhood-home';
import { AppletClassRenderer } from './elements/dashboard/applet-class-renderer';
import { SensemakerDashboard } from './elements/dashboard/sensemaker-dashboard';
import { AppletInstanceRenderer } from './elements/dashboard/applet-instance-renderer';
import { AppletNotInstalled } from './elements/dashboard/applet-not-installed';
import { NotificationDot } from './elements/components/notification-dot';
import { InactiveOverlay } from './elements/components/inactive-overlay';
import { AppletIconBadge } from './elements/components/applet-icon-badge';
import { mergeEyeViewIcon } from './icons/merge-eye-view-icon';
import { nhLogoIcon } from './icons/nh-logo-icon';
import { getStatus } from './utils';
import { AppletNotRunning } from './elements/dashboard/applet-not-running';
import { IconDot } from './elements/components/icon-dot';
import { NHComponentShoelace, NHDialog, NHProfileCard } from '@neighbourhoods/design-system-components';
import { NHSensemakerSettings } from './elements/dashboard/nh-sensemaker-settings';
import { WithProfile } from './elements/components/profile/with-profile';

export class MainDashboard extends NHComponentShoelace {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  _matrix = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchMatrix(),
    () => [this._matrixStore],
  );

  _allWeGroupInfos = new StoreSubscriber(this, () => this._matrixStore.weGroupInfos());

  _allAppletClasses = new StoreSubscriber(this, () => this._matrixStore.installedAppletClasses());

  _newAppletInstances = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchNewAppletInstances(),
    () => [this._selectedWeGroupId, this._matrixStore],
  );

  @query('#sensemaker-dashboard')
  _sensemakerDashboard;
  @queryAsync('#nh-home')
  _neighbourhoodHome;

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
  private _defaultAppletInstanceId: EntryHash | undefined; // hash of the default applet, used when going to config

  @state()
  private _specialAppletMode: boolean = false;
  @state()
  private _widgetConfigDialogActivated: boolean = false;

  @query('#open-create-nh-dialog')
  _createNHDialogButton!: HTMLElement;

  @query('#component-card')
  _withProfile!: any;
  
  @state()
  userProfileMenuVisible: boolean = false;
  
  async refreshProfileCard() {
    if(!this._withProfile?._profilesStore) return;
    await this._withProfile._profilesStore.value.myProfile.reload();
    this._withProfile.refreshed = true;
  }
  
  toggleUserMenu () {
    this.userProfileMenuVisible = !this.userProfileMenuVisible;
    (this.renderRoot.querySelector(".user-profile-menu .context-menu") as HTMLElement).dataset.open = 'true';
  }

  renderPrimaryNavigation() {
    // show all we groups in weGroup mode
    if (this._navigationMode === NavigationMode.GroupCentric) {
      return this.renderWeGroupIconsPrimary(this._allWeGroupInfos.value.values());
      // show all applet classes in appletClass mode
    } else if (this._navigationMode === NavigationMode.AppletCentric) {
      return html`${this.renderAppletClassListPrimary(this._allAppletClasses.value.values())}
        <div id="placeholder"></div>`;
      // show all we groups in mainHome mode
    } else {
      return this.renderWeGroupIconsPrimary(this._allWeGroupInfos.value.values());
    }
  }

  renderSecondaryNavigation() {
    // show all applet instances of the selected group in weGroup mode
    // <sl-tooltip
    //       hoist
    //       placement="bottom"
    //       .content="${this._matrixStore.getWeGroupInfo(this._selectedWeGroupId!)?.name} Home"
    //     >
    //       <mwc-fab
    //         style="margin-left: 18px; margin-right: 6px; border-radius: 50%;"
    //         icon="home"
    //         class="group-home-button"
    //         @click=${() => {
    //           this._selectedAppletInstanceId = undefined;
    //           this._dashboardMode = DashboardMode.WeGroupHome;
    //         }}
    //       ></mwc-fab>
    //     </sl-tooltip>
    if (this._navigationMode === NavigationMode.GroupCentric) {
      const appletInstanceInfos = get(
        this._matrixStore.getAppletInstanceInfosForGroup(this._selectedWeGroupId!),
      );
      return html`
        ${appletInstanceInfos ? this.renderAppletInstanceList(appletInstanceInfos) : html``}

        <div
          class="navigation-switch-container ${classMap({
            invisible:
              this._dashboardMode == DashboardMode.MainHome ||
              this._allAppletClasses.value.keys().length == 0,
          })}
        "
        >
          <sl-tooltip placement="right" content="Switch Navigation Mode" hoist>
            <button class="navigation-switch" style="display:none" @click=${this.handleNavigationSwitch}>
              Applet Centric
            </button>
          </sl-tooltip>
        </div>
        <div style="display: flex; right: 16px; position: absolute; gap: calc(1px * var(--nh-spacing-lg));"> 
        ${this._dashboardMode !== DashboardMode.AssessmentsHome
          ? null
          : html`<span></span>`}
          ${this._dashboardMode == DashboardMode.AssessmentsHome
            ? html`<sl-tooltip placement="bottom" content="Add Applet" hoist>
            <button class="applet-add" @click=${async () => {this._dashboardMode = DashboardMode.WeGroupHome; (await this._neighbourhoodHome).showLibrary();}}></button>
          </sl-tooltip>`
            : html`
            <sl-tooltip hoist placement="bottom" content="Dashboard">
            <button
              class="dashboard-icon"
              @click=${() => {
                this._selectedAppletInstanceId = undefined;
                this._dashboardMode = DashboardMode.AssessmentsHome;
              }}
            ></button>
          </sl-tooltip>`}

        </div>
      `;

      // show all groups that have the currently selected applet class installed in NavigationMode.AppletCentric
      // and show the special modes of the chosen applet class
    } else if (this._navigationMode === NavigationMode.AppletCentric) {
      return html`
        ${this.renderWeGroupIconsSecondary(
          get(this._matrixStore.getInstanceInfosForAppletClass(this._selectedAppletClassId!)),
        )}

        <div
          class="navigation-switch-container ${classMap({
            invisible:
              this._dashboardMode == DashboardMode.MainHome ||
              this._allAppletClasses.value.keys().length == 0,
          })}
        "
          style="position: initial"
        >
          <sl-tooltip placement="right" content="Switch Navigation Mode" hoist>
            <button class="navigation-switch" @click=${this.handleNavigationSwitch}>
              Group Centric
            </button>
          </sl-tooltip>
        </div>

        ${this.renderSpecialAppletModeIcons()}
      `;
      // show all applet classes in NavigationMode.Agnostic
    } else {
      return html``;
    }
  }

  renderDashboardContent() {
    if (this._dashboardMode === DashboardMode.MainHome) {
      return html` <home-screen style="display: flex; flex: 1;"></home-screen> `;
    } else if (this._dashboardMode === DashboardMode.WeGroupHome) {
      return html`
        <we-group-context .weGroupId=${this._selectedWeGroupId}>
          <nh-home
            style="display: flex; flex: 1;"
            id="nh-home"
            @applet-installed=${(e: CustomEvent) => this.handleAppletInstalled(e)}
          >
          </nh-home>
        </we-group-context>
      `;
    } else if (this._dashboardMode === DashboardMode.AssessmentsHome) {
      return html`
        <we-group-context .weGroupId=${this._selectedWeGroupId}>
          <sensemaker-dashboard id="sensemaker-dashboard"> </sensemaker-dashboard>
        </we-group-context>
      `;
    } else if (this._dashboardMode === DashboardMode.AppletGroupInstanceRendering) {
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
      // Not used currently as Applet Class Home is disabled and button removed
      return html`
        <applet-class-home
          style="flex: 1;"
          .appletClassId=${this._selectedAppletClassId}
        ></applet-class-home>
      `;
    } else if (this._dashboardMode === DashboardMode.Loading) {
      return html`
        <div class="center-content" style="flex: 1;display: flex;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `;
    }
  }

  renderAppletInstanceContent() {
    // 1. check whether the selected applet instance is already installed
    if (this._matrixStore.isInstalled(this._selectedAppletInstanceId!)) {
      return getStatus(this._matrixStore.getAppletInstanceInfo(this._selectedAppletInstanceId!)!.appInfo) === "RUNNING"
      ? html`
        <applet-instance-renderer
          style="display: flex; flex: 1; background: var(--nh-theme-fg-muted); height: 0;"
          .appletInstanceId=${this._selectedAppletInstanceId}
        >
        </applet-instance-renderer>
      `
      : html`<applet-not-running style="display: flex; flex: 1;"></applet-not-running>`
    } else {
      return html`
        <applet-not-installed
          @applet-installed=${(e: CustomEvent) => this.handleAppletInstalled(e)}
          style="display: flex; flex: 1;"
          .appletInstanceId=${this._selectedAppletInstanceId}
        >
        </applet-not-installed>
      `;
    }
  }

  async handleWeGroupIconPrimaryClick(weGroupId: DnaHash) {
    await this.refreshProfileCard();

    this._navigationMode = NavigationMode.GroupCentric;
    if (this._selectedWeGroupId !== weGroupId) {
      this._selectedAppletInstanceId = undefined;
      this._selectedAppletClassId = undefined;
    }
    this._dashboardMode = DashboardMode.WeGroupHome;
    this._selectedWeGroupId = weGroupId;


    // initialize widgets for group
    console.log("initializing views for group")
    await this._matrixStore.initializeStateForGroup(weGroupId);
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
      // this._selectedAppletInstanceId = undefined;
      // this._dashboardMode = DashboardMode.AppletClassHome; // Not used currently as Applet Class Home is disabled and button removed. Added lines below and commented out line above instead.
      this._selectedAppletInstanceId = get(
        this._matrixStore.getInstanceInfosForAppletClass(this._selectedAppletClassId),
        )[0][1].appletId;
      this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
    }
  }
  
  handleMergeEyeViewClick() {
    this._dashboardMode = DashboardMode.AppletClassRendering;
    this._selectedAppletInstanceId = undefined;
  }
  
  handleNavigationSwitch() {
    if (this._navigationMode === NavigationMode.AppletCentric) {
      if (this._selectedAppletInstanceId === undefined) {
        // for example when "Merge Eye View" is selected
        // select the first group in the list and show it's Group Home Page and set the selected class Id to undefined
        this._selectedWeGroupId = this._allWeGroupInfos.value.keys()[0];
        this._selectedAppletClassId = undefined;
        this._dashboardMode = DashboardMode.WeGroupHome;
      } else {
        // if selected applet is not running, make selected applet Id undefined again
        if (
          getStatus(
            this._matrixStore.getAppletInstanceInfo(this._selectedAppletInstanceId)?.appInfo!,
          ) !== 'RUNNING'
        ) {
          this._selectedAppletInstanceId = undefined;
          this._dashboardMode = DashboardMode.WeGroupHome;
        }
      }

      this._navigationMode = NavigationMode.GroupCentric;
      (this.shadowRoot?.getElementById('applet-centric-snackbar') as Snackbar).close();
      (this.shadowRoot?.getElementById('group-centric-snackbar') as Snackbar).show();
      if (this._dashboardMode === DashboardMode.AppletClassHome) {
        // Not used currently as Applet Class Home is disabled and button removed.
        this._dashboardMode = DashboardMode.WeGroupHome;
      }
    } else if (this._navigationMode === NavigationMode.GroupCentric) {
      if (this._selectedAppletClassId === undefined) {
        // choose the first class Id in the list
        this._selectedAppletClassId = this._allAppletClasses.value.keys()[0];
        // this._dashboardMode = DashboardMode.AppletClassHome; // Not used currently as Applet Class Home is disabled and button removed. Added lines below instead.
        this._selectedAppletInstanceId = get(
          this._matrixStore.getInstanceInfosForAppletClass(this._selectedAppletClassId as any),
        )[0][1].appletId;
        this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
      }
      this._navigationMode = NavigationMode.AppletCentric;
      (this.shadowRoot?.getElementById('group-centric-snackbar') as Snackbar).close();
      (this.shadowRoot?.getElementById('applet-centric-snackbar') as Snackbar).show();
      if (this._dashboardMode === DashboardMode.WeGroupHome) {
        //this._dashboardMode = DashboardMode.AppletClassHome; // Not used currently as Applet Class Home is disabled and button removed. Added lines below instead.
        this._selectedAppletInstanceId = get(
          this._matrixStore.getInstanceInfosForAppletClass(this._selectedAppletClassId as any),
        )[0][1].appletId;
        this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
      }
    }
  }

  /**
   * Renders the We Group Icons if they are to be shown in the primary navigational panel
   * @param weGroups
   * @returns
   */
  renderWeGroupIconsPrimary(weGroups: WeGroupInfo[]) {
    return html`${weGroups.length > 0
        ? html` <div
            style="display:flex; flex-direction: column; gap: calc(1px * var(--nh-spacing-sm))"
          >
            ${weGroups
              .sort((a, b) => a.info.name.localeCompare(b.info.name))
              .map(
                weGroupInfo =>
                  html`
                    <sidebar-button
                      style="overflow: hidden; margin-top: 2px; margin-bottom: 2px;"
                      .logoSrc=${weGroupInfo.info.logoSrc}
                      .tooltipText=${weGroupInfo.info.name}
                      @click=${async () => {
                        console.log("clicked to enter group!");
                        await this.handleWeGroupIconPrimaryClick(weGroupInfo.dna_hash);
                        this.requestUpdate();
                      }}
                      class=${classMap({
                        highlightedGroupCentric:
                          JSON.stringify(weGroupInfo.dna_hash) ===
                          JSON.stringify(this._selectedWeGroupId),
                        groupCentricIconHover:
                          JSON.stringify(weGroupInfo.dna_hash) !=
                          JSON.stringify(this._selectedWeGroupId),
                      })}
                    ></sidebar-button>
                  `,
              )}
          </div>`
        : html`<div id="placeholder"></div>`}

      <sl-tooltip placement="right" content="Add Neighbourhood" hoist>
        <button id="open-create-nh-dialog" class="group-add"></button>
      </sl-tooltip> `;
  }

  /**
   * Renders the We Group Icons if they are to be shown in the secondary navigational panel
   * @param weGroups
   * @returns
   */
  renderWeGroupIconsSecondary(info: [WeGroupInfo, AppletInstanceInfo][]) {
    return html`
      ${info
        .sort(([weGroupInfo_a, appletInstanceInfo_a], [weGroupInfo_b, appletInstanceInfo_b]) => {
          // sort by group name and applet instance name
          if (weGroupInfo_a.info.name === weGroupInfo_b.info.name) {
            return appletInstanceInfo_a.applet.customName.localeCompare(
              appletInstanceInfo_b.applet.customName,
            );
          } else {
            return weGroupInfo_a.info.name.localeCompare(weGroupInfo_b.info.name);
          }
        })
        .map(([weGroupInfo, appletInstanceInfo]) => {
          return getStatus(appletInstanceInfo.appInfo) === 'RUNNING'
            ? html`
                <icon-dot icon="share" invisible=${appletInstanceInfo.federatedGroups.length === 0}>
                  <applet-icon-badge .logoSrc=${appletInstanceInfo.applet.logoSrc}>
                    <sidebar-button
                      placement="bottom"
                      style="overflow: hidden; margin-left: calc(1px * var(--nh-spacing-md)); margin-right: 2px; border-radius: 50%;"
                      .logoSrc=${weGroupInfo.info.logoSrc}
                      .tooltipText=${weGroupInfo.info.name +
                      ' - ' +
                      appletInstanceInfo.applet.customName}
                      @click=${() => {
                        this.handleWeGroupIconSecondaryClick(
                          weGroupInfo.dna_hash,
                          appletInstanceInfo.appletId,
                        );
                        this.requestUpdate();
                      }}
                      class=${classMap({
                        highlightedGroupCentric:
                          JSON.stringify(appletInstanceInfo.appletId) ===
                          JSON.stringify(this._selectedAppletInstanceId),
                        groupCentricIconHover:
                          JSON.stringify(appletInstanceInfo.appletId) !==
                          JSON.stringify(this._selectedAppletInstanceId),
                      })}
                    ></sidebar-button>
                  </applet-icon-badge>
                </icon-dot>
              `
            : html`
                <applet-icon-badge .logoSrc=${appletInstanceInfo.applet.logoSrc}>
                  <inactive-overlay>
                    <sidebar-button
                      placement="bottom"
                      style="overflow: hidden; margin-left: calc(1px * var(--nh-spacing-md)); margin-right: 2px; border-radius: 50%;"
                      .logoSrc=${weGroupInfo.info.logoSrc}
                      .tooltipText=${weGroupInfo.info.name +
                      ' - ' +
                      appletInstanceInfo.applet.customName +
                      ' (Disabled)'}
                      @click=${() => {
                        this.handleWeGroupIconSecondaryClick(
                          weGroupInfo.dna_hash,
                          appletInstanceInfo.appletId,
                        );
                        this.requestUpdate();
                      }}
                      class=${classMap({
                        highlightedGroupCentric:
                          JSON.stringify(appletInstanceInfo.appletId) ===
                          JSON.stringify(this._selectedAppletInstanceId),
                        groupCentricIconHover:
                          JSON.stringify(appletInstanceInfo.appletId) !==
                          JSON.stringify(this._selectedAppletInstanceId),
                      })}
                    ></sidebar-button>
                  </inactive-overlay>
                </applet-icon-badge>
              `;
        })}
    `;
  }

  renderAppletClassListPrimary(appletClasses: AppletClassInfo[]) {
    // do stuff
    return appletClasses
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(
        appletClassInfo =>
          html`
            <sidebar-button
              style="overflow: hidden; margin-top: 2px; margin-bottom: 2px; margin-left: 3px; margin-right: 3px; border-radius: 50%;"
              .logoSrc=${appletClassInfo.logoSrc}
              .tooltipText=${appletClassInfo.title}
              @click=${() => {
                this.handleAppletClassIconClick(appletClassInfo.devhubHappReleaseHash);
              }}
              class=${classMap({
                highlightedAppletCentric:
                  JSON.stringify(appletClassInfo.devhubHappReleaseHash) ===
                  JSON.stringify(this._selectedAppletClassId),
                appletCentricIconHover:
                  appletClassInfo.devhubHappReleaseHash != this._selectedAppletClassId,
              })}
            >
            </sidebar-button>
          `,
        // add special modes here
      );
  }

  renderAppletClassListSecondary(appletClasses: AppletClassInfo[]) {
    return html`
      <div style="display:flex">
        ${appletClasses
          .sort((a, b) => a.title.localeCompare(b.title))
          .map(
            appletClassInfo =>
              html`
                <sidebar-button
                  placement="bottom"
                  style="overflow: hidden; margin-left: calc(1px * var(--nh-spacing-md)); margin-right: 2px; border-radius: 50%;"
                  .logoSrc=${appletClassInfo.logoSrc}
                  .tooltipText=${appletClassInfo.title}
                  @click=${() => {
                    this._selectedAppletClassId = appletClassInfo.devhubHappReleaseHash;
                    this._navigationMode = NavigationMode.GroupCentric;
                    //this._dashboardMode = DashboardMode.AppletClassHome; // Not used currently as Applet Class Home is disabled and button removed. Added lines below instead.
                    const [weGroupInfo, appletInstanceInfo] = get(
                      this._matrixStore.getInstanceInfosForAppletClass(this._selectedAppletClassId),
                    ).sort((appletInfo_a, applet_info_b) =>
                      appletInfo_a[0].info.name.localeCompare(applet_info_b[0].info.name),
                    )[0]; // sort alphabetically by group name first
                    this._selectedAppletInstanceId = appletInstanceInfo.appletId;
                    this._selectedWeGroupId = weGroupInfo.dna_hash;
                    this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
                    this.requestUpdate();
                  }}
                  class=${classMap({
                    highlightedAppletCentric:
                      JSON.stringify(appletClassInfo.devhubHappReleaseHash) ===
                      JSON.stringify(this._selectedAppletClassId),
                    appletCentricIconHover:
                      appletClassInfo.devhubHappReleaseHash != this._selectedAppletClassId,
                  })}
                >
                </sidebar-button>
              `,
            // add special modes here
          )}
      </div>
    `;
  }

  renderAppletInstanceList(appletInstances: AppletInstanceInfo[]) {
    return appletInstances.length > 0
      ? html`<div style="display: flex;">
          ${appletInstances
            .sort((a, b) => a.applet.customName.localeCompare(b.applet.customName))
            .map(appletInstanceInfo => {
              return getStatus(appletInstanceInfo.appInfo) === 'RUNNING'
                ? html`
                    <icon-dot
                      icon="share"
                      invisible=${appletInstanceInfo.federatedGroups.length === 0}
                    >
                      <sidebar-button
                        placement="bottom"
                        style="overflow: hidden; margin-left: calc(1px * var(--nh-spacing-md)); margin-right: 2px; border-radius: 50%;"
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
                            JSON.stringify(appletInstanceInfo.appletId) ===
                            JSON.stringify(this._selectedAppletInstanceId),
                          appletCentricIconHover:
                            JSON.stringify(appletInstanceInfo.appletId) !=
                            JSON.stringify(this._selectedAppletInstanceId),
                        })}
                      >
                      </sidebar-button>
                    </icon-dot>
                  `
                : html``;
            })}
        </div>`
      : html`<span id="placeholder"></div>`;
  }

  /**
   * Renders Icons of Applets that have been newly installed to the given
   * we group by someone else but which are not yet installed on the
   * agents own conductor.
   *
   * @param allNewAppletInstances
   * @returns
   */
  renderNewAppletInstanceIcons(allNewAppletInstances: DnaHashMap<NewAppletInstanceInfo[]>) {
    const relevantNewAppletInstances = allNewAppletInstances.get(this._selectedWeGroupId!);

    if (relevantNewAppletInstances) {
      return html`<div style="display: flex;">
        ${relevantNewAppletInstances.map(
          newAppletInstanceInfo =>
            html`
              <icon-dot
                icon="share"
                invisible=${newAppletInstanceInfo.federatedGroups.length === 0}
              >
                <notification-dot>
                  <sidebar-button
                    notificationDot
                    placement="bottom"
                    style="overflow: hidden; margin-left: calc(1px * var(--nh-spacing-md)); margin-right: 2px; border-radius: 50%;"
                    .logoSrc=${newAppletInstanceInfo.applet.logoSrc}
                    .tooltipText=${newAppletInstanceInfo.applet.customName}
                    @click=${() => {
                      this.handleNewAppletInstanceIconClick(newAppletInstanceInfo.appletId);
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
              </icon-dot>
            `,
        )}
      </div>`;
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
        style="overflow: hidden; margin-left: 2px; margin-right: 2px; border-radius: 50%;"
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

  handleWeGroupLeft(e: CustomEvent) {
    this._selectedAppletInstanceId = undefined;
    this._selectedAppletClassId = undefined;
    this._selectedWeGroupId = undefined;
    this._dashboardMode = DashboardMode.MainHome;
    this._navigationMode = NavigationMode.Agnostic;
    (this.shadowRoot?.getElementById('group-left-snackbar') as Snackbar).show();
  }

  handleAppletInstalled(e: CustomEvent) {
    this._selectedWeGroupId = e.detail.weGroupId;
    this._selectedAppletInstanceId = e.detail.appletEntryHash;
    this._selectedAppletClassId = this._matrixStore.getAppletInstanceInfo(
      e.detail.appletEntryHash,
    )?.applet.devhubHappReleaseHash;
    this._newAppletInstances.run();
    this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
    this._navigationMode = NavigationMode.GroupCentric;

    this.requestUpdate();
    this._widgetConfigDialogActivated = true;
  }

  showLoading() {
    this._dashboardMode = DashboardMode.Loading;
    this.requestUpdate();
  }

  render() {
    return html`
      <create-nh-dialog
        @we-added=${e => {
          this.handleWeGroupAdded(e);
        }}
        @creating-we=${_e => this.showLoading()}
        id="create-nh-dialog"
        .openDialogButton=${this._createNHDialogButton}
      ></create-nh-dialog>
      ${this._widgetConfigDialogActivated
        ? html`
            <nh-dialog
              id="applet-widget-config"
              size="large"
              dialogType="widget-config"
              handleOk=${() => { this._widgetConfigDialogActivated = false }}
              isOpen=${true}
              title="Configure Applet Widgets"
              .primaryButtonDisabled=${true}
            >
              <div slot="inner-content">
                <nh-sensemaker-settings
                  .sensemakerStore=${get(
                    this._matrixStore.sensemakerStore(this._selectedWeGroupId as Uint8Array),
                  )}
                ></nh-sensemaker-settings>
              </div>
            </nh-dialog>
          `
        : html``}

      <mwc-snackbar
        id="applet-centric-snackbar"
        labelText="Applet-Centric Navigation"
        style="text-align: center;"
      ></mwc-snackbar>
      <mwc-snackbar
        id="group-centric-snackbar"
        labelText="Group-Centric Navigation"
        style="text-align: center;"
      ></mwc-snackbar>
      <mwc-snackbar
        id="group-left-snackbar"
        labelText="Group left."
        style="text-align: center;"
      ></mwc-snackbar>

      <div
        class="row"
        style="flex: 1"
        @we-group-joined=${e => this.handleWeGroupAdded(e)}
        @group-left=${e => this.handleWeGroupLeft(e)}
      >
        <div class="column">
          <div
            class="top-left-corner-bg ${classMap({
              tlcbgGroupCentric:
                this._navigationMode === NavigationMode.GroupCentric ||
                this._navigationMode == NavigationMode.Agnostic,
              tlcbgAppletCentric: this._navigationMode === NavigationMode.AppletCentric,
            })}"
          ></div>
          <div class="column top-left-corner">
            <sidebar-button
              id="nh-logo"
              logoSrc="${nhLogoIcon}"
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

          <div
            class="
            column
            left-sidebar
            ${classMap({
              navBarGroupCentric:
                this._navigationMode === NavigationMode.GroupCentric ||
                this._navigationMode == NavigationMode.Agnostic,
              navBarAppletCentric: this._navigationMode === NavigationMode.AppletCentric,
            })}"
            style="flex-basis: 100%; display: grid; grid-template-rows: 1fr 82px 90px; align-items: flex-start; justify-items: center; overflow:hidden;"
          >
            ${this.renderPrimaryNavigation()}
            <div class="user-profile-menu">
              <sl-tooltip
                hoist
                placement="right"
                .content="${"Your Profile"}"
              >
                <button class="user-profile" type="button" @click=${() => {this.toggleUserMenu()}}></button>
                </sl-tooltip>
                ${this._selectedWeGroupId 
                  ? html`<we-group-context .weGroupId=${this._selectedWeGroupId}><with-profile id="component-card" .agentHash=${encodeHashToBase64(this._matrixStore.myAgentPubKey)} .component=${"card"} class="context-menu" data-open=${this.userProfileMenuVisible} @mouseleave=${() => {this.toggleUserMenu()}}></with-profile></we-group-context>`
                  : html`<div id="component-card" class="context-menu" data-open=${this.userProfileMenuVisible} @mouseleave=${() => {this.toggleUserMenu()}}>No profile</div>`
                }
                
            </div>
          </div>
        </div>

        <div class="column" style="flex: 1;">
          <div
            class="
            row
            top-bar
            ${classMap({
              navBarAppletCentric:
                this._navigationMode === NavigationMode.GroupCentric ||
                this._navigationMode == NavigationMode.Agnostic,
              navBarGroupCentric: this._navigationMode === NavigationMode.AppletCentric,
            })}"
          >
            ${this.renderSecondaryNavigation()}
          </div>
          <div
            class="dashboard-content"
            style="flex: 1; width: 100%; display: flex;"
            @applet-installed=${(e: CustomEvent) => {
              this.handleAppletInstalled(e);
            }}
          >
            ${this.renderDashboardContent()}
          </div>
        </div>
      </div>
    `;
  }

  static get elementDefinitions() {
    return {
      'mwc-fab': Fab,
      'mwc-icon': Icon,
      'mwc-snackbar': Snackbar,
      'sidebar-button': SidebarButton,
      'holo-identicon': HoloIdenticon,
      'create-nh-dialog': CreateNeighbourhoodDialog,
      'home-screen': HomeScreen,
      'sl-tooltip': SlTooltip,
      'we-group-context': WeGroupContext,
      'applet-class-home': AppletClassHome,
      'nh-home': NeighbourhoodHome,
      'nh-dialog': NHDialog,
      'with-profile': WithProfile,
      'nh-profile-card': NHProfileCard,
      'sensemaker-dashboard': SensemakerDashboard,
      'nh-sensemaker-settings': NHSensemakerSettings,
      'applet-class-renderer': AppletClassRenderer,
      'applet-instance-renderer': AppletInstanceRenderer,
      'applet-not-installed': AppletNotInstalled,
      'notification-dot': NotificationDot,
      'icon-dot': IconDot,
      'inactive-overlay': InactiveOverlay,
      'applet-icon-badge': AppletIconBadge,
      'mwc-circular-progress': CircularProgress,
      'applet-not-running': AppletNotRunning,
    };
  }

  static styles: CSSResult[] = [
    sharedStyles,
    super.styles as CSSResult,
    css`
      :host {
        display: flex;
        overflow: hidden;
      }

      .column:last-child {
      }

      .top-left-corner {
        align-items: center;
        background-color: transparent;
        height: 72px;
        width: 72px;
        z-index: 1;
      }

      .top-left-corner-bg {
        border-style: solid;
        border-width: 72px 0 0 72px;
        position: absolute;
        z-index: 0;
      }

      #nh-logo {
        border-width: 0 !important;
        display: grid;
        place-content: center;
        height: 72px;
        width: 72px;
        position: relative;
        overflow: initial;
      }

      .tlcbgGroupCentric {
        border-color: var(--nh-colors-eggplant-800);
      }

      .tlcbgAppletCentric {
        border-color: var(--nh-colors-eggplant-800);
      }

      .left-sidebar {
        overflow: hidden;
        width: 72px;
        padding-top: 16px;
        z-index: 1;
      }

      .navigation-switch-container {
        position: absolute;
        right: 0;
        top: 5rem;
      }

      .group-add,
      .user-profile,
      .dashboard-icon,
      .applet-add {
        width: 58px;
        height: 58px;
        margin-top: calc(2px * var(--nh-spacing-lg));
        margin-bottom: calc(1px * var(--nh-spacing-lg));
        cursor: pointer;
        border: none;
        position: relative;
        border: transparent 1px solid;
      }

      #nh-logo::after,
      .group-add::before,
      .user-profile::before,
      .applet-add::before,
      .dashboard-icon::before {
        content: '';
        background-image: url(user-menu-divider.png);
        position: absolute;
        display: flex;
        justify-content: center;
        width: 50px;
        height: 2px;
      }
      .group-add::before,
      .user-profile::before {
        margin-bottom: calc(1px * var(--nh-spacing-lg));
        left: -4px;
        top: calc(-1px * var(--nh-spacing-lg) - 1px);
      }
      #nh-logo::after {
        margin-top: calc(1px * var(--nh-spacing-lg));
        left: 4px;
        bottom: calc(-1px * var(--nh-spacing-xs));
        z-index: 50;
      }
      .applet-add::before,
      .dashboard-icon::before {
        transform: rotate(-90deg);
        left: calc(-2px * var(--nh-spacing-lg) - 2px);
        bottom: 16px;
        margin: 0;
      }
      .group-add,
      .applet-add {
        background: url(./icons/add-nh-icon.png);
        background-size: contain;
        background-repeat: no-repeat;
      }
      .dashboard-icon,
      .applet-add {
        margin-top: 0;
        margin-bottom: 0;
      }

      user-profile-menu {
        display: relaive;
      }
      .user-profile {
        background: url(./icons/user-icon.png);
        background-size: contain;
        background-repeat: no-repeat;
      }

      .context-menu {
        overflow: inherit;
        position: absolute;
        left: calc(72px + calc(1px * var(--nh-spacing-md)));
        bottom: calc(1px * var(--nh-spacing-md));
        transition: all 0.3s ease-in-out;
        border: 1px solid transparent;
        box-shadow: var(--nh-50);
      }
      .context-menu[data-open=true] {
        border: 1px solid var(--nh-theme-bg-muted);
        border-radius: calc(1px * var(--nh-radii-md));
      }
      .context-menu[data-open=false] {
        visibility: hidden;
        opacity: 0;
        transition: all 0.3s ease-in-out;
      }
      .dashboard-icon {
        background: url(./icons/dashboard-icon.png);
        background-size: contain;
        background-repeat: no-repeat;
      }

      .top-bar {
        overflow: hidden;
        z-index: 0.5;
        display: grid;
        justify-items: start;
        align-items: center;
        grid-template-columns: 1fr 80px 80px;
      }

      .dashboard-content {
        background-color: var(--nh-theme-bg-canvas);
        color: var(--nh-theme-bg-detail);
        overflow: auto;
      }

      .navBarGroupCentric,
      .navBarAppletCentric {
        background-color: var(--nh-theme-bg-surface);
        min-height: 72px;
        height: 72px;
      }

      .left-sidebar,
      #nh-logo {
        background-color: var(--nh-colors-eggplant-950);
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
        border: var(--nh-theme-bg-surface) 1px solid;
        border-radius: calc(1px * var(--nh-radii-2xl)) !important;
      }

      .highlightedGroupCentric {
        border: var(--nh-theme-bg-surface) 1px solid;
        border-radius: calc(1px * var(--nh-radii-2xl));
      }

      .highlightedHome {
        border: transparent 1px solid;
      }

      .homeIconHover {
        border: transparent 1px solid;
      }

      .homeIconHover:hover {
        border: transparent 1px solid;
      }

      .groupCentricIconHover {
        border: transparent 1px solid;
        border-radius: 50%;
        transition: border-radius 0.1s ease-in;
      }
      .groupCentricIconHover:hover {
        border-radius: calc(1px * var(--nh-radii-xl));
      }

      .groupCentricIconHover:hover,
      .user-profile:hover,
      .group-add:hover,
      .applet-add:hover,
      .dashboard-icon:hover {
        box-shadow: 0px 0px 20px #6e46cc;
        border: 1px solid var(--nh-theme-bg-surface) !important;
      }
      .dashboard-icon:hover,
      .user-profile:hover,
      .group-add:hover,
      .applet-add:hover {
        border-radius: 50%;
      }

      .appletCentricIconHover {
        border: transparent 1px solid;
        overflow: auto;
      }

      .appletCentricIconHover:hover {
        border: var(--nh-theme-accent-muted) 1px solid;
        box-shadow: 0px 0px 20px #6e46cc;
      }

      .navigation-switch {
        color: white;
        cursor: pointer;
        z-index: 2;
        background: url(./user-icon.png);
      }

      .group-home-button {
        --mdc-theme-secondary: #303f9f;
        --mdc-fab-focus-outline-color: white;
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
