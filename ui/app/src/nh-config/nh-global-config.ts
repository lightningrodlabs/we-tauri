import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash } from '@holochain/client';

import DimensionsConfig from './pages/nh-dimensions-config';
import AssessmentWidgetConfig from './pages/nh-assessment-widget-config';

import { NHComponent, NHMenu } from '@neighbourhoods/design-system-components';
import { property, state } from 'lit/decorators.js';
import { provideWeGroupInfo } from '../matrix-helpers';
import { removeResourceNameDuplicates } from '../utils';
import { ResourceDef } from '@neighbourhoods/client';
import { cleanForUI } from '../elements/components/helpers/functions';
import { EntryRecord } from '@holochain-open-dev/utils';

export default class NHGlobalConfig extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false })
  weGroupId!: DnaHash;

  @state()
  selectedResourceDef!: ResourceDef;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  private _resourceDefEntries: Array<ResourceDef> = [];
  
  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId],
  );

  _nhName!: string;
  @state()
  _page: 'dimensions' | 'widgets' | undefined = 'dimensions'; // TODO: make this an enum

  protected async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (this._neighbourhoodInfo?.value && !this?._nhName) {
      this._nhName = this._neighbourhoodInfo?.value.name;
    }

    if(changedProperties.has('weGroupId')) {
      if(!this._sensemakerStore.value) return
      const result = await this._sensemakerStore.value.getResourceDefs()
      this._resourceDefEntries = removeResourceNameDuplicates(result.map((entryRec) => ({...entryRec.entry, resource_def_eh: entryRec.entryHash}))); // This de-duplicates resources with the same name from other applets (including uninstalled) 
    }
  }
  
  renderPage() : TemplateResult {
    switch (this._page) {
      case 'dimensions':
        return html`<dimensions-config></dimensions-config>`;
      case 'widgets':
        return html`<assessment-widget-config .resourceDef=${this.selectedResourceDef}></assessment-widget-config>`;
      default:
        return html`Default Page`;
    }
  }

  render() : TemplateResult {
    return html`
      <main>
        <nh-menu
          @sub-nav-item-selected=${(e: CustomEvent) => {
            this._page = 'widgets';
            const [mainMenuItemName, mainMenuItemIndex, subMenuItemIndex] = e.detail.itemId.split(/\-/);
            if (mainMenuItemName !== 'Sensemaker') return; // Only current active main menu item is Sensemaker, but you can change this later

            // THIS RELIES ON THE SAME ORDERING/INDEXING OCCURRING IN `this._resourceDefEntries` AS IN THE RENDERED SUBMENU and may need to be changed
            this.selectedResourceDef = this._resourceDefEntries[subMenuItemIndex]
          }
          }
          .menuSectionDetails=${
            (() => ([{
              sectionName: this._nhName,
              sectionMembers: [
                {
                  label: 'Overview',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
                {
                  label: 'Roles',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
              ],
            },
            {
              sectionName: 'Sensemaker',
              sectionMembers: [
                {
                  label: 'Dimensions',
                  subSectionMembers: [],
                  callback: () => (this._page = 'dimensions'),
                },
                {
                  label: 'Assessments',
                  subSectionMembers: this._resourceDefEntries.map(rd =>  cleanForUI(rd.resource_name)),
                  callback: () => {this.selectedResourceDef = this._resourceDefEntries[0]; this._page = 'widgets'},

                },
                {
                  label: 'Contexts',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
              ],
            },
            {
              sectionName: 'Member Management',
              sectionMembers: [
                {
                  label: 'Members',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
                {
                  label: 'Invites',
                  subSectionMembers: [],
                  callback: () => (this._page = undefined),
                },
              ],
            }]))()
          } 
          .selectedMenuItemId=${'Sensemaker-0' // This is the default selected item
        }
        >
        </nh-menu>
        <slot name="page"> ${this.renderPage()} </slot>
      </main>
    `;
  }

  static elementDefinitions = {
    'nh-menu': NHMenu,
    'dimensions-config': DimensionsConfig,
    'assessment-widget-config': AssessmentWidgetConfig,
  };

  static get styles() {
    return css`
      :host,
      .container {
        display: flex;
        width: 100%;
      }

      .container {
        flex-direction: column;
        align-items: flex-start;
      }

      main {
        --menu-width: 200px;
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: calc(16px + var(--menu-width)) 3fr;
        grid-template-rows: 4rem auto;
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      nh-menu {
        display: flex;
      }

      nav {
        grid-column: 1 / -2;
        display: flex;
        align-items: start;
      }
      
      slot[name='page'] {
        grid-column: 2 / -2;
        display: flex;
        align-items: start;
      }
    `;
  }
}
