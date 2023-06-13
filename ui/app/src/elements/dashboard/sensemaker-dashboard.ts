import { CSSResult, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { contextProvided, contextProvider } from '@lit-labs/context';
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
  SlAlert,
  SlIcon,
} from '@scoped-elements/shoelace';
import { Readable, get } from '@holochain-open-dev/stores';

import { AssessmentTableType, StatefulTable } from '../components/table';
import '../components/fetch-table-data';

import { encodeHashToBase64 } from '@holochain/client';
import { classMap } from 'lit/directives/class-map.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

interface AppletRenderInfo {
  name: string;
  resourceNames?: string[];
}
export type DimensionDict = {
  [id: string]: Uint8Array;
};
type ContextEhDict = DimensionDict;

enum LoadingState {
  FirstRender = 'first-render',
  NoAppletSensemakerData = 'no-applet-sensemaker-data',
}

const zip = (a, b) => a.map((k, i) => [k, b[i]]);
const capitalize = part => part[0].toUpperCase() + part.slice(1);
const snakeCase = str =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.toLowerCase())
    .join('_');

export const cleanResourceNameForUI = propertyName =>
  propertyName.split('_').map(capitalize).join(' ');

export class SensemakerDashboard extends ScopedElementsMixin(NHComponentShoelace) {
  @state() loading: boolean = true;
  @state() loadingState: LoadingState = LoadingState.FirstRender;

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvider({ context: sensemakerStoreContext })
  @property({ attribute: false })
  _sensemakerStore!: SensemakerStore;

  @state() selectedAppletIndex: number = 0;
  @state() selectedResourceName!: string;
  @state() selectedContext: string = 'none';
  @state() selectedResourceDefEh!: string;

  @state() appletDetails!: object;
  @state() dimensions: DimensionDict = {};
  @state() context_ehs: ContextEhDict = {};

  async connectedCallback() {
    super.connectedCallback();
    this.addEventListener('sub-component-loaded', this.handleSubcomponentFinishedLoading);

    const selectedWeGroupId = (this.parentElement as any)?.__weGroupId;
    if (!selectedWeGroupId) return;

    this._sensemakerStore = get(
      this._matrixStore.sensemakerStore(selectedWeGroupId) as Readable<SensemakerStore>,
    );

    const appletStream = await this._matrixStore.fetchAllApplets(selectedWeGroupId);
    appletStream.subscribe(applets => {
      this.appletDetails = applets.reduce((applets, a) => {
        const roleName = Object.keys(a[1].dnaHashes)[0];
        
        return {
          ...applets,
          [roleName]: {
            customName: a[1].customName
          }
        }
      }, {})        
    });
    this._matrixStore.sensemakerStore(selectedWeGroupId).subscribe(store => {
      (store?.appletConfig() as Readable<AppletConfig>).subscribe(appletConfig => {
        const id: string = appletConfig?.role_name;
        // TODO: fix edge case of repeat install of same dna/cloned ? make unique id
        if (!id) return this.setLoadingState(LoadingState.NoAppletSensemakerData);

console.log('appletConfig:', appletConfig);
        this.appletDetails[id].appletRenderInfo = {
          resourceNames: Object.keys(appletConfig.resource_defs)?.map(cleanResourceNameForUI),
        };
        
        // Keep dimensions for dashboard table prop        
        this.dimensions = appletConfig.dimensions;
        //Keep context names for display
        this.appletDetails[id].contexts = Object.keys(appletConfig.cultural_contexts).map(cleanResourceNameForUI);

        // Keep context entry hashes and resource_def_eh for filtering in dashboard table
        this.context_ehs = Object.fromEntries(zip(this.appletDetails[id].contexts, Object.values(appletConfig.cultural_contexts)));
        const currentAppletRenderInfo = Object.values(this.appletDetails)[this.selectedAppletIndex]?.appletRenderInfo;
        const resourceName : string = snakeCase(currentAppletRenderInfo.resourceNames![0]);
        this.selectedResourceDefEh = encodeHashToBase64(appletConfig.resource_defs[resourceName]);
console.log('selectedResourceDefEh :>> ', this.selectedResourceDefEh);
        this.loading = false;
      });
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('sub-component-loaded', this.handleSubcomponentFinishedLoading);
  }

  // Handlers
  handleSubcomponentFinishedLoading(_: Event) {
    this.loading = false;
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
  renderSidebar(appletRoleNames: string[]) {
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
        ${appletRoleNames.map(
          (roleName, i) => html`
            <sl-menu-item 
              class="nav-item ${classMap({
              active: this.selectedAppletIndex === i})}"
              value="${this.appletDetails[roleName].customName.toLowerCase()}"
              @click=${() => {this.selectedAppletIndex = i}}
              >${this.appletDetails[roleName].customName}</sl-menu-item
            >
            <div role="navigation" class="sub-nav indented">
              ${this.appletDetails[roleName]?.appletRenderInfo?.resourceNames &&
                this.appletDetails[roleName]?.appletRenderInfo?.resourceNames.map(
                resource =>
                  html`<sl-menu-item class="nav-item" value="${resource.toLowerCase()}"
                    >${resource}</sl-menu-item
                  >`,
              )}
            </div>
          `,
        )}
      </sl-menu>
      <sl-menu class="dashboard-menu-section">
        <sl-menu-label class="nav-label">Member Management</sl-menu-label>
        <sl-menu-item class="nav-item" value="overview">Members</sl-menu-item>
        <sl-menu-item class="nav-item" value="roles">Invitees</sl-menu-item>
      </sl-menu>
    </nav>
    `;
  }
  renderMainSkeleton(awaitingData: boolean) {
    return html`
      <div class="container skeleton-overview">
        <main>
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
          ${this.loadingState == LoadingState.NoAppletSensemakerData || awaitingData
            ? html`<div class="alert-wrapper" style="width: 80%;">
                <sl-alert open class="alert">
                  <sl-icon slot="icon" name="info-circle"></sl-icon>
                  There is no sensemaking data for this tab; go to your applet to generate some.
                </sl-alert>
              </div>`
            : html`<div class="skeleton-main-container">
                ${Array.from(Array(24)).map(
                  () => html`<sl-skeleton effect="sheen" class="skeleton-part"></sl-skeleton>`,
                )}
              </div>`}
        </main>
      </div>
    `;
  }

  render() {
    const roleNames = this?.appletDetails && Object.keys(this.appletDetails);
    const appletDetails = Object.values(this.appletDetails);
    
    const appletConfig = (appletDetails?.length && ([appletDetails[this.selectedAppletIndex]?.appletRenderInfo] as AppletRenderInfo[])) //hard-coded to first applet
    
    if (appletConfig && appletDetails[this.selectedAppletIndex]?.customName) {
      this.selectedResourceName = appletDetails[this.selectedAppletIndex]?.customName;
    }
    const contexts = appletConfig && appletDetails[this.selectedAppletIndex]?.contexts;
    if (!appletConfig[0] || !contexts) { this.loadingState = LoadingState.FirstRender };
console.log('this.appletDetails, appletConfig, contexts, contextEhs  (from render function):>> ', this.appletDetails, appletConfig, contexts, this.context_ehs);

    return html`
      <div class="container">
        ${this.renderSidebar(roleNames)}
        <main>
          ${this.loading
            ? this.renderMainSkeleton(!!roleNames)
            : html`<sl-tab-group class="dashboard-tab-group">
                <div slot="nav" class="tab-nav">
                  <div class="tabs">
                    <sl-tab panel="resource" class="dashboard-tab resource ${classMap({
                      active: this.selectedContext === 'none'})}"
                      @click=${() => { this.loadingState = LoadingState.FirstRender; this.selectedContext = 'none' }}
                        >${this.selectedResourceName}</sl-tab>
                    ${contexts &&
                    contexts.map(
                      context =>
                        html`<sl-tab 
                            panel="${context.toLowerCase()}" 
                            class="dashboard-tab ${classMap({
                              active: encodeHashToBase64(this.context_ehs[context]) === this.selectedContext})}"
                            @click=${() => { this.loadingState = LoadingState.FirstRender; this.selectedContext = encodeHashToBase64(this.context_ehs[context])}}
                          ><span>${context}</span></sl-tab-panel
                        >`,
                    )}
                  </div>
                  ${this.renderIcons()}
                </div>

                <sl-tab-panel active class="dashboard-tab-panel" name="resource">
                  <fetch-assessment
                  .resourceName=${this.selectedResourceName}
                  .resourceDefEh=${this.selectedResourceDefEh}
                  .tableType=${AssessmentTableType.Resource} 
                  .selectedContext=${this.selectedContext}
                  .selectedDimensions=${this.dimensions}>
                  <dashboard-table></dashboard-table>
              </fetch-assessment>
              
                </sl-tab-panel>
                ${contexts &&
                contexts.map(
                  context =>
                    html`<sl-tab-panel class="dashboard-tab-panel ${classMap({
                      active: encodeHashToBase64(this.context_ehs[context]) === this.selectedContext})}" name="${context.toLowerCase()}">
                      <fetch-assessment
                        .resourceName=${this.selectedResourceName}
                        .resourceDefEh=${this.selectedResourceDefEh}
                        .tableType=${AssessmentTableType.Context} 
                        .selectedContext=${this.selectedContext}
                        .selectedDimensions=${this.dimensions}>
                        <dashboard-table></dashboard-table>
                      </fetch-assessment>

                    </sl-tab-panel>`,
                )}
              </sl-tab-group>`}
        </main>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      'sl-skeleton': SlSkeleton,
      'sl-input': SlInput,
      'sl-menu': SlMenu,
      'sl-menu-item': SlMenuItem,
      'sl-menu-label': SlMenuLabel,
      'sl-tab': SlTab,
      'sl-tab-group': SlTabGroup,
      'sl-tab-panel': SlTabPanel,
      'sl-icon': SlIcon,
      'sl-alert': SlAlert,
      // 'nh-table-header': NHTableHeader,
      'dashboard-table': StatefulTable,
    };
  }

  static styles : CSSResult[] = [
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
      .alert-wrapper {
        height: 100%;
        display: grid;
        place-content: center;
        align-content: start;
        padding: 4rem calc(1px * var(--nh-spacing-lg));
      }
      .alert::part(base) {
        height: 8rem;
        width: 100%;
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

      /** Tab Nav **/
      .tab-nav {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;

        margin: calc(1px * var(--nh-spacing-sm));
        margin-bottom: 0;
        padding: calc(1px * var(--nh-spacing-xs));

        color: var(--nh-theme-fg-default);
        background-color: var(--nh-theme-bg-surface);
        border-color: var(--nh-theme-bg-surface);
        border-width: 4px;
        border-style: solid;
        border-radius: var(--tab-nav-tab-radius);
      }
      .tab-nav .icon-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: calc(1px * var(--nh-spacing-lg));
        margin-right: calc(1px * var(--nh-spacing-sm));
      }
      .tab-nav .mock-icon {
        width: 1.5rem;
        height: 1.5rem;
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      /* Tabs */

      .dashboard-tab {
        position: relative;
        margin-left: calc(1px * var(--nh-spacing-xxs));
      }
      .dashboard-tab::part(base) {
        border-radius: 0;
        padding: calc(1px * var(--nh-spacing-xs)) calc(1px * var(--nh-spacing-lg));

        color: var(--nh-theme-fg-default);
        text-align: center;
        letter-spacing: 0.2px;
        font-family: var(--nh-font-families-headlines);
        font-weight: var(--sl-font-weight-semibold);
        line-height: var(--nh-line-heights-body-default);
        letter-spacing: 0.5px !important;
      }
      .dashboard-tab:first-child::part(base),
      .dashboard-tab:hover::part(base) {
        border-top-left-radius: var(--tab-nav-tab-radius);
        border-bottom-left-radius: var(--tab-nav-tab-radius);
      }
      .dashboard-tab:last-child::part(base) {
        border-top-right-radius: var(--tab-nav-tab-radius);
        border-bottom-right-radius: var(--tab-nav-tab-radius);
      }

      /* Resource(active) and Hover */

      .dashboard-tab.resource::part(base),
      .dashboard-tab:hover {
        color: var(--nh-theme-accent-muted);
        background-color: var(--nh-theme-bg-subtle);
      }

      .dashboard-tab.resource.active {
        background-color: var(--nh-colors-eggplant-950);
      }
      .dashboard-tab.active {
        color: var(--nh-theme-accent-muted);
        background-color: var(--nh-colors-eggplant-950);
        border-top-left-radius: var(--tab-nav-tab-radius);
        border-top-right-radius: var(--tab-nav-tab-radius);
      }
      .dashboard-tab.active::part(base) {
        border-top-left-radius: var(--tab-nav-tab-radius);
        border-top-right-radius: var(--tab-nav-tab-radius);
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
      }
      .dashboard-tab:hover {
        background-color: var(--nh-theme-bg-subtle);
        border-top-right-radius: calc(2px * var(--nh-radii-md) - 0px);
        border-top-left-radius: calc(2px * var(--nh-radii-md) - 0px);
      }
      .dashboard-tab.resource:hover::part(base) {
        border-radius: var(--tab-nav-tab-radius);
      }
      .dashboard-tab.resource:hover::part(base),
      .dashboard-tab.active::part(base):hover {
        cursor: default;
      }
      /* Tab hover effect */
      .dashboard-tab:hover::after,
      .dashboard-tab.active::after {
        position: absolute;
        background-color: var(--nh-theme-bg-subtle);
        bottom: -10px;
        left: 0px;
        content: '';
        width: 100%;
        height: 10px;
      }
      .dashboard-tab.active::after,
      .dashboard-tab.active::part(base) {
        background-color: var(--nh-theme-bg-canvas);
      }
      /* Divider after resource name */
      .dashboard-tab.resource::before {
        position: absolute;
        background-color: var(--nh-theme-bg-subtle);
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
        border: 1px solid transparent;
        border-radius: calc(1px * var(--nh-radii-base) - 0px);
        background-color: var(--nh-colors-eggplant-950);
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
        padding-left: calc(1px * var(--nh-spacing-2xl));
      }
      .nav-item.active::part(base) {
        background: var(--nh-colors-eggplant-950);
      }
      .nav-item:hover::part(base) {
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
        --color: var(--nh-theme-bg-subtle);
        --sheen-color: var(--nh-theme-bg-surface);
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
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr ;
        gap: calc(1px * var(--nh-spacing-sm));
      }
      .skeleton-overview nav {
        width: var(--menu-width);
        padding: calc(1px * var(--nh-spacing-sm));
        margin: calc(1px * var(--nh-spacing-sm));
        margin-top: calc(1px * var(--nh-spacing-xl));
      }
    `];
}
