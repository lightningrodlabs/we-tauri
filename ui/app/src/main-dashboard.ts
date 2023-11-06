import { contextProvided } from '@lit-labs/context';
import { state, query, queryAsync } from 'lit/decorators.js';
import { DnaHash, EntryHash, encodeHashToBase64 } from '@holochain/client';
import { html, css, CSSResult, unsafeCSS } from 'lit';
import { StoreSubscriber } from 'lit-svelte-stores';
import { CircularProgress, Fab, Icon, Snackbar } from '@scoped-elements/material-web';
import { classMap } from 'lit/directives/class-map.js';
import { HoloIdenticon } from './elements/components/holo-identicon.js';

import { matrixContext } from './context';
import {
  AppletInstanceInfo,
  MatrixStore,
  WeGroupInfo,
} from './matrix-store';
import { sharedStyles } from './sharedStyles';
import { HomeScreen } from './elements/dashboard/home-screen';
import { get } from 'svelte/store';
import { SlTooltip } from '@scoped-elements/shoelace';
import { DashboardMode, NavigationMode } from './types';
import { SidebarButton } from './elements/components/sidebar-button';
import { CreateNeighbourhoodDialog } from './elements/dialogs/create-nh-dialog';
import { WeGroupContext } from './elements/we-group-context';
import { NeighbourhoodHome } from './elements/dashboard/neighbourhood-home';
import { SensemakerDashboard } from './elements/dashboard/sensemaker-dashboard';
import { AppletInstanceRenderer } from './elements/dashboard/applet-instance-renderer';
import { AppletNotInstalled } from './elements/dashboard/applet-not-installed';
import { NotificationDot } from './elements/components/notification-dot';
import { InactiveOverlay } from './elements/components/inactive-overlay';
import { AppletIconBadge } from './elements/components/applet-icon-badge';
import { getStatus } from './utils';
import { AppletNotRunning } from './elements/dashboard/applet-not-running';
import { IconDot } from './elements/components/icon-dot';
import { NHButton, NHComponentShoelace, NHDialog, NHProfileCard } from '@neighbourhoods/design-system-components';
import { NHSensemakerSettings } from './elements/dashboard/nh-sensemaker-settings';
import { WithProfile } from './elements/components/profile/with-profile';
import { b64images } from '@neighbourhoods/design-system-styles';
import { provideMatrix } from './matrix-helpers.js';
import { NHGlobalConfig } from './nh-global-config';

export class MainDashboard extends NHComponentShoelace {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  // :SHONK: not accessed, only used to call `matrixStore.fetchMatrix` to populate below Readables
  _matrix = new StoreSubscriber(
    this,
    () => provideMatrix(this._matrixStore),
    () => [this._matrixStore],
  );

  _allWeGroupInfos = new StoreSubscriber(this, () => this._matrixStore.weGroupInfos());

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

  @state()
  private _selectedWeGroupId: DnaHash | undefined; // DNA hash of the selected we group

  @state()
  private _selectedAppletClassId: EntryHash | undefined; // devhub hApp release hash of the selected Applet class

  @state()
  private _selectedAppletInstanceId: EntryHash | undefined; // hash of the Applet's entry in group's we dna of the selected Applet instance

  @state()
  private _selectedAppletRolename: string | undefined;

  @state()
  private _widgetConfigDialogActivated: boolean = false;

  @query('#open-create-nh-dialog')
  _createNHDialogButton!: HTMLElement;

  @query('#component-card')
  _withProfile!: any;

  @state()
  userProfileMenuVisible: boolean = false;
  private _appletName: string | undefined;

  async refreshProfileCard(weGroupId: DnaHash) {
    if(!this._withProfile?.agentProfile?.value) {
      console.log("Unable to refresh profile card")
      return;
    }
    this._withProfile.weGroupId = weGroupId;
    await this._withProfile.updateComplete;
  }

  toggleUserMenu () {
    this.userProfileMenuVisible = !this.userProfileMenuVisible;
    (this.renderRoot.querySelector(".user-profile-menu .context-menu") as HTMLElement).dataset.open = 'true';
  }

  renderPrimaryNavigation() {
    // show all we groups in weGroup mode
    return this.renderWeGroupIconsPrimary([...this._allWeGroupInfos.value.values()]);
  }

  renderSecondaryNavigation() {
    if (this._navigationMode === NavigationMode.GroupCentric) {
      const appletInstanceInfos = get(
        this._matrixStore.getAppletInstanceInfosForGroup(this._selectedWeGroupId!),
      );
      return html`
        ${appletInstanceInfos ? this.renderAppletInstanceList(appletInstanceInfos) : html``}

        <div style="display: flex; right: 16px; position: absolute; gap: calc(1px * var(--nh-spacing-lg));">
        ${this._dashboardMode !== DashboardMode.AssessmentsHome
          ? html`<div style="margin: auto;"><nh-button .variant=${"primary"} .size=${"sm"} @click=${() => {this._dashboardMode = DashboardMode.NHGlobalConfig}}>Config</nh-button></div>`
          : null
        }
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
      // show all applet classes in NavigationMode.Agnostic
    } else {
      return html``;
    }
  }

  renderDashboardContent() {
    if (this._dashboardMode === DashboardMode.MainHome) {
      return html` <home-screen style="display: flex; flex: 1;"></home-screen> `;
    } else if (this._dashboardMode === DashboardMode.NHGlobalConfig) {
      return html`
        <we-group-context .weGroupId=${this._selectedWeGroupId} @return-home=${() =>{
          this._dashboardMode = DashboardMode.WeGroupHome;
        }}>
          <nh-global-config></nh-global-config>
        </we-group-context>
      `
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
    this._navigationMode = NavigationMode.GroupCentric;
    if (this._selectedWeGroupId !== weGroupId) {
      this._selectedAppletInstanceId = undefined;
      this._selectedAppletClassId = undefined;
    }
    this._dashboardMode = DashboardMode.WeGroupHome;
    this._selectedWeGroupId = weGroupId;

    await this.refreshProfileCard(weGroupId);

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
    const appletInstanceInfo = this._matrixStore.getAppletInstanceInfo(
      e.detail.appletEntryHash,
    );
    const applet = appletInstanceInfo?.applet;
    this._appletName = appletInstanceInfo?.appInfo.installed_app_id;
    this._selectedAppletClassId = applet!.devhubHappReleaseHash;
    this._selectedAppletRolename = Object.keys(applet!.dnaHashes)[0];
    this._dashboardMode = DashboardMode.AppletGroupInstanceRendering;
    this._navigationMode = NavigationMode.GroupCentric;

    this._widgetConfigDialogActivated = true;
    this.requestUpdate();
  }

  goHome() {
    this._selectedWeGroupId = undefined;
    this._selectedAppletClassId = undefined;
    this._selectedAppletInstanceId = undefined;
    this._dashboardMode = DashboardMode.MainHome;
    this._navigationMode = NavigationMode.Agnostic;
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
          this.refreshProfileCard(e.detail)
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
                  .appletName=${this._appletName}
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
                this._navigationMode == NavigationMode.Agnostic
            })}"
          ></div>
          <div class="column top-left-corner">
            <sl-tooltip
              hoist
              placement="right"
              .content="${"Home"}"
            >
              <sidebar-button
                id="nh-logo"
                logoSrc="data:image/svg+xml;base64,${b64images.nhIcons.logoWhite}"
                @click=${this.goHome}
                class=${classMap({
                  highlightedHome: this._dashboardMode === DashboardMode.MainHome,
                  homeIconHover: this._dashboardMode !== DashboardMode.MainHome,
                })}
              ></sidebar-button>
              <sidebar-button
                id="nh-logo-col"
                logoSrc="data:image/svg+xml;base64,${b64images.nhIcons.logoCol}"
                @click=${this.goHome}
                class=${classMap({
                  highlightedHome: this._dashboardMode === DashboardMode.MainHome,
                  homeIconHover: this._dashboardMode !== DashboardMode.MainHome,
                })}
              ></sidebar-button>
            </sl-tooltip>
          </div>

          <div
            class="
            column
            left-sidebar
            ${classMap({
              navBarGroupCentric:
                this._navigationMode === NavigationMode.GroupCentric ||
                this._navigationMode == NavigationMode.Agnostic
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
                this._navigationMode == NavigationMode.Agnostic
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
      'nh-home': NeighbourhoodHome,
      'nh-dialog': NHDialog,
      'with-profile': WithProfile,
      'nh-button': NHButton,
      'nh-profile-card': NHProfileCard,
      'sensemaker-dashboard': SensemakerDashboard,
      'nh-global-config': NHGlobalConfig,
      'nh-sensemaker-settings': NHSensemakerSettings,
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

      #nh-logo,
      #nh-logo-col {
        border-width: 0 !important;
        display: grid;
        place-content: center;
        height: 72px;
        width: 72px;
        position: absolute;
        overflow: initial;
        animation: none;
      }
      #nh-logo:hover {
        animation: crossfade 8s linear;
      }

      #nh-logo-col {
        z-index: 0;
      }

      #nh-logo {
        z-index: 1;
      }

      @keyframes crossfade {
        0% {opacity: 1; z-index:1}
        3% {opacity: 1;}
        6% {opacity: 0;}
        7% {opacity: 0; z-index:1}
        100% {opacity: 0; z-index:1}
      }

      .tlcbgGroupCentric {
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
        background-image: url('data:image/svg+xml;base64,${unsafeCSS(b64images.nhIcons.divider)}');
        position: absolute;
        display: flex;
        justify-content: center;
        width: 69px;
        height: 2px;
      }
      .group-add::before,
      .user-profile::before {
        margin-bottom: calc(1px * var(--nh-spacing-lg));
        left: -7px;
        top: calc(-1px * var(--nh-spacing-lg) + 3px);
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
        left: calc(-2px * var(--nh-spacing-lg) - 12px);
        bottom: 25px;
        margin: 0;
        filter: brightness(0.5);
      }
      .group-add,
      .applet-add {
        background: url('data:image/svg+xml;base64,${unsafeCSS(b64images.nhIcons.addApplet)}');
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
        background: url('data:image/svg+xml;base64,${unsafeCSS(b64images.nhIcons.blankProfile)}');
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
      #nh-logo,
      #nh-logo-col {
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

      .highlightedHome {
        border: transparent 1px solid;
      }

      .homeIconHover {
        border: transparent 1px solid;
      }

      .homeIconHover:hover {
        border: transparent 1px solid;
      }

      .groupCentricIconHover, .highlightedGroupCentric {
        border: transparent 2px solid;
        border-radius: 50%;
        transition: border-radius 0.2s ease-in;
      }
      .groupCentricIconHover:hover,.highlightedGroupCentric {
        border-radius: calc(12px);
        border-color: var(--nh-theme-bg-canvas);
      }

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
