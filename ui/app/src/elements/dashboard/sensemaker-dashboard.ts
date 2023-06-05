import { LitElement, css, html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
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

import { StatefulTable } from '../components/table';

import theme from '../../styles/css/variables.css?inline' assert { type: 'css' };
import adapter from '../../styles/css/design-adapter.css?inline' assert { type: 'css' };
import adapterShoelaceUI from '../../styles/css/shoelace-adapter.css?inline' assert { type: 'css' };

interface AppletRenderInfo {
  name: string;
  resourceNames?: string[];
}
type AppletDict = {
  [id: string] : AppletRenderInfo;
}
type ContextDict = {
  [id: string] : string[];
}
enum LoadingContext {
  FirstRender = 'first-render',
  NoAppletSensemakerData = 'no-applet-sensemaker-data'
}

export class SensemakerDashboard extends ScopedElementsMixin(LitElement) {
  @state() loading: boolean = true;

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvider({context: sensemakerStoreContext})
  @property({attribute: false})
  _sensemakerStore!: SensemakerStore;

  @state() selectedResourceName!: string;
  @state() loadingContext: LoadingContext = LoadingContext.FirstRender;
  @state() applets : AppletDict = {};
  @state() contexts : ContextDict = {};

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('sub-component-loaded', this.handleSubcomponentFinishedLoading);

    const selectedWeGroupId = (this.parentElement as any)?.__weGroupId;
    if (!selectedWeGroupId) return;
    console.log('selected weGroupId :>> ', selectedWeGroupId);

    this._sensemakerStore = get(this._matrixStore.sensemakerStore(selectedWeGroupId) as Readable<SensemakerStore>);
    this._matrixStore.sensemakerStore(selectedWeGroupId).subscribe((store) => {
      console.log('store :>> ', store);
      (store?.appletConfig() as Readable<AppletConfig>)
        .subscribe(appletConfig => {
          const id : string = appletConfig?.role_name;
          // TODO: fix edge case of repeat install of same applet? make unique id
          if(!id) return this.setLoadingContext(LoadingContext.NoAppletSensemakerData)            
    
          const capitalize = part => part[0].toUpperCase() + part.slice(1)
          const cleanResourceNameForUI = propertyName => propertyName.split("_").map(capitalize).join(" ")
          
          console.log("appletConfig:", appletConfig);
          console.log("renderable applet info:", this.applets);
          console.log("renderable contexts info:", this.contexts, this.contexts?.length);
          this.applets[id] = { ...this.applets[id], resourceNames: Object.keys(appletConfig.resource_defs).map(cleanResourceNameForUI)};
          this.contexts[id] = Object.keys(appletConfig.cultural_contexts).map(cleanResourceNameForUI)

          this.loading = false;
        });
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('sub-component-loaded', this.handleSubcomponentFinishedLoading);
  }

  setLoadingContext(contextValue: LoadingContext) {
    this.loadingContext = contextValue;
  }
  handleSubcomponentFinishedLoading(event: Event) {
    this.loading = false;
    console.log('table finished loading! :>> ');
  }

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

  renderMainSkeleton() {
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
          ${this.loadingContext == LoadingContext.NoAppletSensemakerData
            ? html`<div class="alert-wrapper" style="width: 80%;">
              <sl-alert open class="alert">
                <sl-icon slot="icon" name="info-circle"></sl-icon>
                  Please visit your applet screen to generate some data for the dashboard.
              </sl-alert>
            </div>`
            : html`<div class="skeleton-main-container">
              ${Array.from(Array(25)).map(
                () => html`<sl-skeleton effect="sheen" class="skeleton-part"></sl-skeleton>`,
              )}
            </div>`
          }
        </main>
      </div>
    `;
  }

  render() {
    const applets = Object.values(this.applets)?.length && Object.values(this.applets) as AppletRenderInfo[] || undefined;
    if(applets && applets.length && applets[0]?.resourceNames) {
      this.selectedResourceName = applets[0]?.resourceNames[0]; 
    }
    const contexts = Object.values(this.contexts)?.length && Object.values(this.contexts)[0]; // TODO: set applet context control 

    return html`
      <div class="container">
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
            ${applets && applets.map(
              (applet) => html`
                <sl-menu-item class="nav-item" value="${applet.name?.toLowerCase()}"
                  >${applet.name}</sl-menu-item
                >
                <div role="navigation" class="sub-nav indented">
                  ${applet.resourceNames && applet.resourceNames.map(
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
        <main>
          ${this.loading
            ? this.renderMainSkeleton()
            : html`<sl-tab-group class="dashboard-tab-group">
                <div slot="nav" class="tab-nav">
                  <div class="tabs">
                    <sl-tab
                      panel="${this.selectedResourceName}s"
                      class="dashboard-tab resource"
                      >${this.selectedResourceName}s</sl-tab
                    >
                    ${contexts && contexts.map(
                      context =>
                        html`<sl-tab panel="${context.toLowerCase()}" class="dashboard-tab"
                          >${context}</sl-tab
                        >`,
                    )}
                  </div>
                  ${this.renderIcons()}
                </div>

                ${contexts && contexts.map(
                  context =>
                    html`<sl-tab-panel class="dashboard-tab-panel" name="${context.toLowerCase()}"><dashboard-table .resourceName=${this.selectedResourceName}></dashboard-table></sl-tab>`,
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
      'dashboard-table': StatefulTable,
    };
  }

  static styles = css`
    /** Imported Properties **/
    ${unsafeCSS(theme)}
    ${unsafeCSS(adapter)}
    ${unsafeCSS(adapterShoelaceUI)}

    /** Layout **/
    :host {
      --menu-width: 138px;
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
      width: 100%
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
      padding: 0;

      color: var(--nh-theme-fg-default);
      background-color: var(--nh-theme-bg-surface);
      border-color: var(--nh-theme-bg-surface);
      border-width: 4px;
      border-style: solid;
      border-radius: calc(1px * var(--nh-radii-lg));
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
    }
    .dashboard-tab::part(base) {
      border-radius: 0;
      padding: calc(1px * var(--nh-spacing-xs)) calc(1px * var(--nh-spacing-lg));

      color: var(--nh-theme-fg-default);
      text-align: center;
      letter-spacing: 0.2px;
      font-weight: var(--nh-font-weights-body-bold);
      line-height: var(--nh-line-heights-body-default);
      letter-spacing: 0.5px !important
    }
    .dashboard-tab:first-child::part(base) {
      border-top-left-radius: calc(1px * var(--nh-radii-base) - 0px);
      border-bottom-left-radius: calc(1px * var(--nh-radii-base) - 0px);
    }
    .dashboard-tab:last-child::part(base) {
      border-top-right-radius: calc(1px * var(--nh-radii-base) - 0px);
      border-bottom-right-radius: calc(1px * var(--nh-radii-base) - 0px);
    }

    /* Resource(active) and Hover */

    .dashboard-tab.resource::part(base),
    .dashboard-tab:hover,
    .dashboard-tab.active {
      color: var(--nh-theme-accent-muted);
      background-color: var(--nh-theme-bg-subtle);
    }
    .dashboard-tab.active {
      border-color: var(--nh-theme-accent-muted);
      border-radius: calc(1px * var(--nh-radii-base) - 0px);
    }
    .dashboard-tab:hover {
      background-color: var(--nh-theme-bg-subtle);
      border-top-right-radius: calc(1px * var(--nh-radii-base) - 0px);
      border-top-left-radius: calc(1px * var(--nh-radii-base) - 0px);
    }
    .dashboard-tab.resource:hover,
    .dashboard-tab.active::part(base) {
      border-radius: calc(1px * var(--nh-radii-base) - 0px);
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
      bottom: -5px;
      left: 0px;
      content: '';
      width: 100%;
      height: 8px;
    }
    .dashboard-tab.active::after, 
    .dashboard-tab.active::part(base) {
      background-color: var(--nh-theme-bg-canvas);
    }
    /* Divider after resource */
    .dashboard-tab.resource::before {
      position: absolute;
      background-color: var(--nh-theme-bg-subtle);
      bottom: 1px;
      right: -4px;
      content: '';
      height: calc(100% - 4px);
      width: 2px;
    }
    .dashboard-tab.resource:hover::after {
      width: 0;
      height: 0;
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
      color: var(--nh-theme-bg-muted);
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
      font-family: var(--nh-font-families-headlines);
      margin-bottom: calc(1px * var(--nh-spacing-xs));
    }
    .nav-item::part(base) {
      color: var(--nh-theme-fg-default);
      font-size: calc(1px * var(--nh-font-size-sm));
      font-weight: var(--nh-font-weights-body-regular);
      padding: calc(1px * var(--nh-spacing-xxs));
      padding-left: calc(1px * var(--nh-spacing-sm));
    }

    .indented .nav-item::part(base) {
      padding-left: calc(1px * var(--nh-spacing-2xl));
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
      grid-template-rows: 50px repeat(5, 100px);
      grid-template-columns: repeat(5, 100px);
      gap: calc(1px * var(--nh-spacing-sm));
    }
    .skeleton-overview nav {
      width: var(--menu-width);
      padding: calc(1px * var(--nh-spacing-sm));
      margin: calc(1px * var(--nh-spacing-sm));
      margin-top: calc(1px * var(--nh-spacing-xl));
    }
  `;
}
