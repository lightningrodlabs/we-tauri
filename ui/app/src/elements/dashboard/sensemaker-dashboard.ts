import { CSSResult, PropertyValueMap, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume, provide } from '@lit/context';
import { AppletConfig, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { MatrixStore } from '../../matrix-store';
import { matrixContext } from '../../context';
import {
  SlMenuItem,
  SlMenu,
  SlTabGroup,
  SlTabPanel,
  SlSkeleton,
  SlTab,
  SlMenuLabel,
  SlInput,
} from '@scoped-elements/shoelace';
import { StatefulTable } from '../components/table';
import { DashboardFilterMap } from '../components/table-filter-map';

import { Readable, StoreSubscriber, derived, get } from '@holochain-open-dev/stores';
import { encodeHashToBase64 } from '@holochain/client';

import { NHAlert, NHButton, NHComponentShoelace, NHPageHeaderCard } from '@neighbourhoods/design-system-components';

import { classMap } from 'lit/directives/class-map.js';
import {
  LoadingState,
  DimensionDict,
  ContextEhDict,
  AppletRenderInfo,
  AssessmentTableType,
} from '../components/helpers/types';
import { cleanResourceNameForUI, snakeCase, zip } from '../components/helpers/functions';
import { ContextSelector } from './context-selector';
import { b64images } from '@neighbourhoods/design-system-styles';
import { flattenRoleAndZomeIndexedResourceDefs } from '../../utils';

@customElement('sensemaker-dashboard')
export class SensemakerDashboard extends NHComponentShoelace {
  @state() loading: boolean = true;
  @state() loadingState: LoadingState = LoadingState.FirstRender;

  @consume({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @provide({ context: sensemakerStoreContext })
  @property({ attribute: false })
  _sensemakerStore!: SensemakerStore;

  @state() selectedAppletIndex: number = 0;
  @state() selectedResourceDefIndex: number = -1; // No resource definition selected
  @state() selectedResourceName!: string;
  @state() selectedContext: string = 'none';
  @state() selectedResourceDefEh!: string;
  @state() selectedWeGroupId!: Uint8Array;

  @state() appletDetails!: object;
  @state() selectedAppletResourceDefs!: object;
  @state() dimensions: DimensionDict = {};
  @state() context_ehs: ContextEhDict = {};

  @query("#select-context")
  contextSelector;
  
  async connectedCallback() {
    super.connectedCallback();

    this.selectedWeGroupId = (this.parentElement as any)?.__weGroupId;
    if (!this.selectedWeGroupId) return;

    this._sensemakerStore = get(
      this._matrixStore.sensemakerStore(this.selectedWeGroupId) as Readable<SensemakerStore>,
    );

    const appletInstancesStream = this._matrixStore.getAppletInstanceInfosForGroup(
      this.selectedWeGroupId,
    );

    appletInstancesStream.subscribe(applets => {
      this.appletDetails = applets!.reduce((appletDetails, applet) => {
        const installedAppId = applet.appInfo.installed_app_id;

        return {
          ...appletDetails,
          [installedAppId]: {
            customName: applet.applet.customName,
          },
        };
      }, {});
    });
    this.setupAssessmentsSubscription();
  }

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(typeof this.appletDetails !== 'object' || !Object.entries(this.appletDetails)[this.selectedAppletIndex]?.length) return;
    const [installedAppId, appletDetails] = Object.entries(this.appletDetails)[this.selectedAppletIndex];

    if(_changedProperties.has('selectedAppletIndex')) {
      this.context_ehs = Object.fromEntries(
        zip(this.appletDetails[installedAppId].contexts, appletDetails.context_ehs),
        );
      this.selectedAppletResourceDefs = flattenRoleAndZomeIndexedResourceDefs(this.appletDetails[installedAppId].resource_defs)

      this.dimensions = this.appletDetails[installedAppId].dimensions;
      this.requestUpdate('selectedResourceDefIndex')
    }
    
    if(_changedProperties.has('selectedResourceDefIndex')) {
      const resourceName: string = snakeCase(this.appletDetails[installedAppId].appletRenderInfo.resourceNames![this.selectedResourceDefIndex == -1 ? 0 : this.selectedResourceDefIndex]);
        
      this.selectedResourceDefEh = encodeHashToBase64(flattenRoleAndZomeIndexedResourceDefs(this.appletDetails[installedAppId].resource_defs)[resourceName]);

      this.selectedResourceName =
        this.selectedResourceDefIndex < 0
          ? 'All Resources'
          : appletDetails.appletRenderInfo.resourceNames[
              this.selectedResourceDefIndex
          ];
    }
  }

  setupAssessmentsSubscription() {
    let store = this._matrixStore.sensemakerStore(this.selectedWeGroupId);
    store.subscribe(store => {
      (store?.appletConfigs() as Readable<{ [appletName: string]: AppletConfig }>).subscribe(
        appletConfigs => {
          if(typeof appletConfigs !== 'object') return;
          Object.entries(appletConfigs).forEach(([installedAppId, appletConfig]) => {
            // flatten resource defs by removing the role name and zome name keys
            const flattenedResourceDefs = Object.values(appletConfig.resource_defs).map((zomeResourceMap) => Object.values(zomeResourceMap)).flat().reduce(
              (acc, curr) => ({...acc, ...curr}),
              {}
            );
            this.appletDetails[installedAppId].appletRenderInfo = {
              resourceNames: Object.keys(flattenedResourceDefs)?.map(cleanResourceNameForUI),
            };

            // Keep dimensions for dashboard table prop
            this.appletDetails[installedAppId].dimensions = appletConfig.dimensions;
            //Keep context names for display
            this.appletDetails[installedAppId].contexts = Object.keys(appletConfig.cultural_contexts).map(
              cleanResourceNameForUI,
            );
            // Keep context entry hashes and resource_def_eh for filtering in dashboard table
            this.appletDetails[installedAppId].context_ehs = Object.values(appletConfig.cultural_contexts);
            this.appletDetails[installedAppId].resource_defs = appletConfig.resource_defs;
          });
          this.loading = false;
        },
      );
    });
  }

  setLoadingState(state: LoadingState) {
    this.loadingState = state;
  }

  // Render helpers
  renderIcons() {
    return html`
      <div class="icon-container">
        <div class="mock-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25"
            />
          </svg>
        </div>
        <div class="mock-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="{1.5}"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </div>
      </div>
    `;
  }
  renderSidebar(appletIds: string[]) {
    return html`
      <nav>
        <div>
          <sl-input class="search-input" placeholder="SEARCH" size="small"></sl-input>
        </div>
        <sl-menu class="dashboard-menu-section">
          <sl-menu-label class="nav-label">NH NAME</sl-menu-label>
          <sl-menu-item class="nav-item" value="overview">Overview</sl-menu-item>
          <sl-menu-item class="nav-item" value="roles">Roles</sl-menu-item>
        </sl-menu>
        <sl-menu class="dashboard-menu-section">
          <sl-menu-label class="nav-label">SENSEMAKER</sl-menu-label>
          ${appletIds.map((id, i) => {
            const applet = this.appletDetails[id];
            const appletName = this.appletDetails[id]?.customName;
            return !!applet
              ? html`
                  <sl-menu-item
                    class="nav-item ${classMap({
                      active: this.selectedAppletIndex === i,
                    })}"
                    value="${appletName}"
                    @click=${() => {
                      this.selectedAppletIndex = i;
                      this.selectedResourceDefIndex = -1;
                      this.setupAssessmentsSubscription();
                    }}
                    >${appletName}</sl-menu-item
                  >
                  <div role="navigation" class="sub-nav indented">
                    ${applet?.appletRenderInfo?.resourceNames &&
                    applet?.appletRenderInfo?.resourceNames.map(
                      (resource, resourceIndex) => html`<sl-menu-item
                        class="nav-item"
                        value="${resource.toLowerCase()}"
                        @click=${() => {
                          this.selectedAppletIndex = i;
                          this.selectedResourceDefIndex = resourceIndex;
                          this.setupAssessmentsSubscription();
                        }}
                        >${resource}</sl-menu-item
                      >`,
                    )}
                  </div>
                `
              : html``;
          })}
        </sl-menu>
        <sl-menu class="dashboard-menu-section">
          <sl-menu-label class="nav-label">Member Management</sl-menu-label>
          <sl-menu-item class="nav-item" value="overview">Members</sl-menu-item>
          <sl-menu-item class="nav-item" value="roles">Invitees</sl-menu-item>
        </sl-menu>
      </nav>
    `;
  }
  renderMainSkeleton() {
    return html`
      <div class="container skeleton-overview">
        <main>
        <div class="alert-wrapper">
          <nh-alert
            .title=${"There are no applets installed"}
            .description=${"Go to your Neighbourhood Home to install them, then visit the applets and return here for data."}
            .type=${"danger"}
            style="display: flex; flex: 1; gap: 8px;"
          >
          </nh-alert>
        </div>
          <div class="skeleton-nav-container">
            ${[50, 40, 40, 55].map(
              width =>
                html`<sl-skeleton
                  effect="sheen"
                  class="skeleton-part"
                  style="width: ${width}%; height: 2rem;"
                ></sl-skeleton>`,
            )}
            <sl-skeleton
              effect="sheen"
              class="skeleton-part"
              style="width: 80%; height: 2rem; opacity: 0"
            ></sl-skeleton>
          </div>
          <div class="skeleton-main-container">
                ${Array.from(Array(24)).map(
                  () => html`<sl-skeleton effect="sheen" class="skeleton-part"></sl-skeleton>`,
                )}
          </div>
        </main>
      </div>
    `;
  }
  render() {
    const appletIds = this?.appletDetails ? Object.keys(this.appletDetails) : [];
    const appletDetails =
      typeof this.appletDetails == 'object' ? Object.values(this.appletDetails) : [];
    const appletConfig =
      appletDetails.length &&
      ([appletDetails[this.selectedAppletIndex]?.appletRenderInfo] as AppletRenderInfo[]);

    if (appletConfig && appletDetails[this.selectedAppletIndex]) {
      this.selectedResourceName =
        this.selectedResourceDefIndex < 0
          ? 'All Resources'
          : appletDetails[this.selectedAppletIndex].appletRenderInfo.resourceNames[
              this.selectedResourceDefIndex
            ];
    }
    const contexts = appletConfig && appletDetails[this.selectedAppletIndex]?.contexts;
    if (!appletConfig![0] || contexts == 0) {
      this.loadingState = LoadingState.NoAppletSensemakerData;
    }
    return html`
      <div class="container">
        <slot name="configure-widget-button"></slot>
        ${this.renderSidebar(appletIds as string[])}
        <main>
          ${this.loadingState === LoadingState.NoAppletSensemakerData
            ? this.renderMainSkeleton()
            : html`<sl-tab-group class="dashboard-tab-group" @context-selected=${function(e: CustomEvent) {
              ([...(e.currentTarget as any).querySelectorAll('sl-tab-panel')]
                .forEach(tab =>{
                  tab.name === snakeCase(e.detail.contextName) 
                    && tab.dispatchEvent(new CustomEvent('context-display', 
                    {
                      detail: e.detail,
                      bubbles: false,
                      composed: true
                    }
              ))})) }.bind(this)}>
                <nh-page-header-card slot="nav" role="nav" .heading=${""}>
                  <nh-context-selector slot="secondary-action" id="select-context" .selectedContext=${this.selectedContext}>
                    <sl-tab
                      slot="button-fixed"
                      panel="resource"
                      class="dashboard-tab resource ${classMap({
                        active: this.selectedContext === 'none',
                      })}"
                      @click=${() => {
                        this.loadingState = LoadingState.FirstRender;
                        this.selectedContext = 'none';
                      }}
                      >${this.selectedResourceName || "No Applets Installed"}</sl-tab
                    >
                    <div
                      slot="buttons"
                      class="tabs" style="width: 100%; display: flex; justify-content: space-between;">
                        ${contexts ?
                          html`<div>${contexts.map(
                            context =>
                            this.context_ehs[context] ? 
                              html`<nh-tab-button><sl-tab
                                  panel="${snakeCase(context)}" 
                                  class="dashboard-tab ${classMap({
                                    active:
                                      encodeHashToBase64(this.context_ehs[context]) ===
                                      this.selectedContext,
                                  })}"
                                  @click=${() => {
                                    this.loadingState = LoadingState.FirstRender;
                                    this.selectedContext = encodeHashToBase64(this.context_ehs[context]);
                                  }}
                                >${context}</sl-tab-panel></nh-tab-button>`
                                : null,
                          )}
                          </div>
                          <nh-button-group
                            class="dashboard-action-buttons"
                            style="display: flex; align-items: center;"
                            .direction=${"horizontal"}
                            .fixedFirstItem=${false}
                            .addItemButton=${false}
                          >
                          <div slot="buttons">
                            <nh-button @click=${async () => { await this.contextSelector.requestUpdate("resourceAssessments");  // TODO test this
                          }} .iconImageB64=${b64images.icons.refresh} .variant=${"neutral"} .size=${"icon"}></nh-button>
                          </nh-button-group></div>` : html``}
                        </div>
                      </div>
                    </nh-context-selector>
                </nh-page-header-card>

                <sl-tab-panel active class="dashboard-tab-panel" name="resource">
                  ${this.selectedContext !== 'none'
                    ? ''
                    : html`<dashboard-filter-map
                        .selectedAppletResourceDefs=${this.selectedAppletResourceDefs}
                        .resourceName=${this.selectedResourceName}
                        .resourceDefEh=${this.selectedResourceDefEh}
                        .tableType=${AssessmentTableType.Resource}
                        .selectedContext=${this.selectedContext}
                        .selectedDimensions=${this.dimensions}
                      >
                      </dashboard-filter-map>`}
                </sl-tab-panel>
                ${contexts ?
                contexts.map(context =>
                  {return !(this.context_ehs[context] && encodeHashToBase64(this.context_ehs[context]) == this.selectedContext)
                    ? ''
                    : html`<sl-tab-panel 
                              @context-display=${(e: CustomEvent) => {
                                const flatResults = typeof e.detail.results == "object" ? e.detail.results[this.selectedContext].flat() : [];
                                const dashboardFilterComponent = (e.currentTarget as any).children[0];
                                dashboardFilterComponent.contextEhs = flatResults;
                                }}
                              class="dashboard-tab-panel ${classMap({
                                active:
                                  encodeHashToBase64(this.context_ehs[context]) === this.selectedContext,
                              })}"
                              name="${snakeCase(context)}"
                          >
                            <dashboard-filter-map
                              .selectedAppletResourceDefs=${this.selectedAppletResourceDefs}
                              .resourceName=${this.selectedResourceName}
                              .resourceDefEh=${this.selectedResourceDefEh}
                              .tableType=${AssessmentTableType.Context}
                              .selectedContext=${this.selectedContext}
                              .selectedDimensions=${this.dimensions}
                            >
                            </dashboard-filter-map>
                          </sl-tab-panel>`},
                    ) : html``}
              </sl-tab-group>`}
        </main>
      </div>
    `;
  }

  static get elementDefinitions() {
    return {
      'sl-skeleton': SlSkeleton,
      'sl-input': SlInput,
      'sl-menu': SlMenu,
      'sl-menu-item': SlMenuItem,
      'sl-menu-label': SlMenuLabel,
      'sl-tab': SlTab,
      'sl-tab-group': SlTabGroup,
      'sl-tab-panel': SlTabPanel,
      'nh-alert': NHAlert,
      'nh-page-header-card': NHPageHeaderCard,
      'nh-button': NHButton,
      'nh-context-selector': ContextSelector,
      'dashboard-table': StatefulTable,
      'dashboard-filter-map': DashboardFilterMap,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      /** Layout **/
      :host {
        --menu-width: 138px;
        --tab-nav-tab-radius: calc(1px * var(--nh-radii-xl));
        width: calc(100% - 138px);
      }

      .container {
        display: flex;
        width: calc(100vw - 144px);
        height: 100%;
      }
      .container nav {
        flex-basis: var(--menu-width);
        padding: 0 calc(1px * var(--nh-spacing-sm));
        background: var(--nh-theme-bg-canvas);
      }
      .container main {
        flex-grow: 1;
        overflow-x: hidden;
        background: var(--nh-theme-bg-canvas);
        background: var(--nh-theme-bg-canvas);
        
      }
      .container main::-webkit-scrollbar   {
        width: 0;
      }

      /* Side scrolling **/
      .dashboard-tab-group {
        max-width: calc(100vw - calc(1px * var(--nh-spacing-sm)));
        overflow: hidden;
        background: var(--nh-theme-bg-canvas);
      }
      .dashboard-tab-panel {
        overflow: auto;
      }

      nh-page-header-card {
        width: 100%;
      }

      .alert-wrapper {
        display: flex;
        width: 100%;
        padding-top: calc(1px * var(--nh-spacing-md));
      }

      /** Tab Nav **/
      [slot="button-fixed"] {
        background: var(--nh-theme-bg-detail);
        border: 0;
        border-radius: calc(1px * var(--nh-radii-lg));
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
        font-family: "Work Sans", "Open Sans";
      }

      [slot="buttons"] > div{
        display: flex;
        gap: 4px;
        font-family: "Work Sans", "Open Sans";
      }


      [slot="buttons"] :hover::part(base) {
        background-color: var(--nh-theme-bg-canvas);
        color: var(--nh-theme-accent-emphasis);
      }

      /* Tab hover effect */
      [slot="buttons"] :hover::part(base)::after,
      [slot="buttons"] .active::part(base)::after {
        position: absolute;
        background-color: var(--nh-theme-bg-canvas);
        bottom: calc(-1px * var(--nh-spacing-sm));
        left: 0px;
        content: '';
        width: 100%;
        height: calc(1px * var(--nh-spacing-sm));
      }

      sl-tab::part(base) {
        color: #D9D9D9;
        background-color: var(--nh-theme-bg-surface);
        padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-xl));
        height: 52px;
        position: relative;
        
        border: 0;
        border-radius: calc(1px * var(--nh-radii-lg));
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;

        font-family: var(--nh-font-families-menu);
        letter-spacing: var(--nh-letter-spacing-buttons);

      }
      [slot="button-fixed"]::part(base) {
        color: var(--nh-theme-fg-default);
        background-color: var(--nh-theme-bg-element);
        border: 4px solid --nh-colors-eggplant-800;
        border-radius: calc(1px * var(--nh-radii-lg) - 4px);
        border-bottom-right-radius: 0;
        border-top-right-radius: 0;
      }
      [slot="button-fixed"].active::part(base),
      sl-tab.active::part(base)::after,
      sl-tab.active::part(base) {
        background-color: var(--nh-theme-bg-canvas);
      }
  
      /* Divider after resource name */
      [slot="button-fixed"].resource::before {
        position: absolute;
        background-color: var(--nh-theme-bg-surface);
        bottom: 1px;
        right: -3px;
        content: '';
        height: calc(100% - 2px);
        width: 2px;
      }

      /** Tab Panels **/
      .dashboard-tab-panel::part(base) {
        padding: 0;
      }
      .dashboard-tab-group::part(tabs) {
        border: none;
      }

      /**  Left Nav **/
      /* Search input */
      .search-input::part(input),
      .nav-label::part(base) {
        color: var(--nh-theme-menu-sub-title);
        text-transform: uppercase;
        font-size: calc(1px * var(--nh-font-size-xs));
        font-weight: var(--nh-font-weights-body-bold);
      }
      
      .search-input::part(form-control) {
        margin-top: calc(1px * var(--nh-spacing-md));
      }
      .search-input::part(base) {
        cursor: not-allowed;
        border: 1px solid transparent;
        border-radius: calc(1px * var(--nh-radii-base) - 0px);
        background-color: var(--nh-theme-bg-backdrop);
        height: 2rem;
      }
      .search-input:hover::part(base) {
        border-color: var(--nh-theme-accent-muted);
      }

      .nav-label::part(base) {
        text-align: left;
      }
      .nav-label::part(base),
      .nav-item::part(base) {
        padding: 0 calc(1px * var(--nh-spacing-sm));
      }

      .nav-item {
        border-radius: calc(1px * var(--nh-radii-base) - 0px);
        overflow: hidden;
        font-family: var(--nh-font-families-body);
        margin-bottom: calc(1px * var(--nh-spacing-xs));
      }
      .nav-item::part(base) {
        color: var(--nh-theme-fg-default);
        font-size: calc(1px * var(--nh-font-size-sm));
        padding: calc(1px * var(--nh-spacing-xxs));
        padding-left: calc(1px * var(--nh-spacing-sm));
      }
      .indented .nav-item::part(base) {
        margin-left: calc(1px * var(--nh-spacing-3xl));
      }
      .nav-item.active::part(base) {
        background: var(--nh-theme-bg-detail);
      }
      .nav-item.active + .indented  .nav-item::part(base) {
        background: var(--nh-theme-bg-element);
      }
      .nav-item:not(.active):hover::part(base) {
        background: var(--nh-theme-bg-surface);
      }

      /* Left Nav Subsections */
      .dashboard-menu-section::part(base) {
        background-color: transparent;
      }
      .dashboard-menu-section:not(:last-child)::part(base) {
        border-bottom-width: 2px;
        border-bottom-style: solid;
        border-bottom-color: var(--nh-theme-bg-surface);
      }

      /**  Skeleton **/
      .skeleton-overview {
        background-color: var(--nh-theme-bg-canvas);
      }
      .skeleton-part {
        --color: var(--nh-theme-bg-surface);
        --sheen-color: var(--nh-theme-bg-detail);
      }
      .skeleton-part::part(indicator) {
        background-color: var(--nh-theme-bg-muted);
        border-radius: calc(1px * var(--nh-radii-base));
        opacity: 0.2;
      }
      .skeleton-tabs {
        width: 100%;
        height: 50px;
      }
      .skeleton-main-container {
        width: 100%;
        height: 100%;
      }
      .skeleton-overview main,
      .skeleton-nav-container {
        display: flex;
        flex-direction: column;
        width: 95%;
        column-gap: calc(1px * var(--nh-spacing-md));
        align-items: start;
        margin-bottom: 1rem;
        width: 100%;
      }
      .skeleton-nav-container {
        flex-direction: row;
        margin: calc(1px * var(--nh-spacing-md)) 12px calc(1px * var(--nh-spacing-md)) 0;
        width: 100%;
      }
      .skeleton-nav-container .skeleton-part::part(indicator) {
        border-radius: calc(1px * var(--nh-radii-lg));
      }
      .skeleton-main-container {
        display: grid;
        gap: calc(1px * var(--nh-spacing-md));
        grid-template-rows: 1fr 1fr 1fr 1fr;
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
        gap: calc(1px * var(--nh-spacing-sm));
      }
      .skeleton-overview nav {
        width: var(--menu-width);
        padding: calc(1px * var(--nh-spacing-sm));
        margin: calc(1px * var(--nh-spacing-sm));
        margin-top: calc(1px * var(--nh-spacing-xl));
      }
    `,
  ];
}
