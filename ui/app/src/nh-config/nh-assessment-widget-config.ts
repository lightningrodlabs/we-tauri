import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash } from '@holochain/client';

import {
  NHButton,
  NHCard,
  NHComponent,
  NHDialog,
  NHPageHeaderCard,
} from '@neighbourhoods/design-system-components';

import { query } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import AssessmentWidgetConfigForm from './assessment-widget-config-form';

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
        grid-template-columns: 2fr 1fr;
        grid-template-rows: 4rem auto;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      resource-def-list {
        grid-column: 1 / -1;
        display: flex;
        align-items: start;
      }
    `;
  }
}
