import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { StoreSubscriber } from 'lit-svelte-stores';
import { DnaHash } from '@holochain/client';

import DimensionsConfig from './pages/nh-dimensions-config';
import AssessmentWidgetConfig from './pages/nh-assessment-widget-config';

import { NHComponent, NHMenu } from '@neighbourhoods/design-system-components';
import { property, query, state } from 'lit/decorators.js';
import { provideWeGroupInfo } from '../matrix-helpers';

export default class NHGlobalConfig extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({ attribute: false })
  weGroupId!: DnaHash;

  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId],
  );

  _nhName!: string;
  @state()
  _page: 'dimensions' | 'widgets' | undefined = 'dimensions'; // TODO: make this an enum

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (this._neighbourhoodInfo?.value && !this?._nhName) {
      this._nhName = this._neighbourhoodInfo?.value.name;
    }
  }

  renderPage() : TemplateResult {
    switch (this._page) {
      case 'dimensions':
        return html`<dimensions-config></dimensions-config>`;
      case 'widgets':
        return html`<assessment-widget-config></assessment-widget-config>`;
      default:
        return html`Default Page`;
    }
  }

  render() : TemplateResult {
    return html`
      <main>
        <nh-menu
          .menuSectionDetails=${[
            {
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
                  subSectionMembers: [],
                  callback: () => (this._page = 'widgets'),
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
            },
          ]}
          .selectedMenuItemId=${'Sensemaker-0'}
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

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

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
        --menu-width: 138px;
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
