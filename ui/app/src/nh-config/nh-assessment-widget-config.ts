import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash, EntryHash } from '@holochain/client';

import {
  NHAssessmentContainer,
  NHButton,
  NHCard,
  NHComponent,
  NHDialog,
  NHPageHeaderCard,
  NHResourceAssessmentTray,
} from '@neighbourhoods/design-system-components';

import { query, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import AssessmentWidgetConfigForm from './assessment-widget-config-form';
import { ResourceDef } from '@neighbourhoods/client';
import ResourceDefList from './resource-def-list';

export default class NHAssessmentWidgetConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;
  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @query('nh-dialog')
  private _dialog;
  @query('assessment-widget-config-form')
  private _form;

  @query('#resource-def-list')
  private _resourceDefList;
  
  @query("nh-button[type='submit']")
  submitBtn;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  protected async updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {

  }

  render() {
    return html`
      <main
      >
        <nh-page-header-card .heading=${'Assessment Widget Config'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>

        <resource-def-list
          id="resource-def-list"
          .sensemakerStore=${this._sensemakerStore.value}
        >
        </resource-def-list>

        <div class="container">
          <assessment-widget-tray .editable=${true}>
            <div slot="widgets">
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
            </div>
          </assessment-widget-tray>
        </div>

        <nh-dialog
          .dialogType=${'input-form'}
          .size=${'medium'}
          @form-submitted=${(e: CustomEvent) => { (e.currentTarget as NHDialog).hideDialog(); this._form.resetForm() }}
        >
          <div slot="inner-content" class="container">
            <h2>
              ${'Add a thing'}
            </h2>
            ${this.renderMainForm()}
          </div>

          <nh-button
            slot="primary-action"
            type="submit"
            .size=${'auto'}
            .variant=${'primary'}
            @click=${() => {

              }
            }
            .loading=${false}
            >Add</nh-button
          >
        </nh-dialog>
      </main>
    `;
  }
 
  private renderMainForm(): TemplateResult {
    return html`<assessment-widget-config-form></assessment-widget-config-form>`
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'assessment-widget-config-form': AssessmentWidgetConfigForm,
    'resource-def-list': ResourceDefList,
    'assessment-widget-tray': NHResourceAssessmentTray,
    'assessment-widget': NHAssessmentContainer,
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

      h2 {
        margin: 0 auto;
        width: 18rem;
      }

      main {
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 1fr 5fr;
        grid-template-rows: 4rem auto;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      resource-def-list {
        grid-column: 1 / 1;
        display: flex;
        align-items: start;
      }

      .container {
        padding: calc(1px * var(--nh-spacing-lg));
        grid-column: 2 / -1;
        display: grid;
        align-items: flex-start;
        justify-items: center;
      }
    `;
  }
}
