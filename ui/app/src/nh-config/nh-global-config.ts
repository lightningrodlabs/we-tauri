import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash, EntryHash } from '@holochain/client';

import {
  NHButton,
  NHCard,
  NHComponent,
  NHDialog,
  NHPageHeaderCard,
} from '@neighbourhoods/design-system-components';
import CreateDimension from './create-dimension-form';
import DimensionList from './dimension-list';
import { property, query, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import CreateOutputDimensionMethod from './create-output-dimension-form';

export default class NHGlobalConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;
  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @query('nh-dialog')
  private _dialog;
  @query('#input-dimension-list')
  private _inputDimensionList;
  @query('#output-dimension-list')
  private _outputDimensionList;
  @property()
  private _dimensionForm;

  @state()
  private _selectedInputDimensionRange!: Range;
  @state()
  private _formType: 'input-dimension' | 'method' = 'input-dimension';

  @query("nh-button[type='submit']")
  submitBtn;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (_changedProperties.has('_formType')) {
      this._dimensionForm = this.renderRoot.querySelector('create-dimension');
    }
  }

  protected async updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (
      _changedProperties.has('_formType') &&
      typeof _changedProperties.get('_formType') !== 'undefined'
    ) {
      await this.updateComplete;
      this._dimensionForm = this.renderRoot.querySelector(
        this._formType == 'input-dimension'
          ? 'create-dimension'
          : 'create-output-dimension-method-form',
      );
    }
  }

  isDimensionFormValid() {
    if (!this._dimensionForm) return false;

    return this._dimensionForm.touched; // && this._dimensionForm.valid
  }

  render() {
    return html`
      <main
        @dimension-created=${async (e: CustomEvent) => await this.onDimensionCreated(e)}
        @method-created=${async (e: CustomEvent) => await this.onMethodCreated(e)}
      >
        <nh-page-header-card .heading=${'Neighbourhood Config'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>
        <dimension-list
          id="input-dimension-list"
          .sensemakerStore=${this._sensemakerStore.value}
          .dimensionType=${'input'}
        ></dimension-list>
        <nh-button
          id="add-dimension"
          .variant=${'primary'}
          .size=${'md'}
          @click=${() => {
            this._formType = 'input-dimension';
            this._dialog.showDialog();
            this.requestUpdate();
          }}
        >
          Add Dimension
        </nh-button>
        <dimension-list
          id="output-dimension-list"
          .sensemakerStore=${this._sensemakerStore.value}
          .dimensionType=${'output'}
        ></dimension-list>
        <nh-button
          id="add-dimension"
          .variant=${'primary'}
          .size=${'md'}
          @click=${() => {
            this._formType = 'method';
            this._dialog.showDialog();
            this.requestUpdate();
          }}
        >
          Add Dimension
        </nh-button>
        <nh-dialog
          id="create-dimension-dialog"
          .dialogType=${'confirmation'}
          .size=${'medium'}
          @form-submitted=${(e: CustomEvent) => { (e.currentTarget as NHDialog).hideDialog(); }}
        >
          <div slot="inner-content" class="container">
            <h2>
              ${'Add ' + (this._formType == 'input-dimension' ? 'Input' : 'Output') + ' Dimension'}
            </h2>
            ${this.renderMainForm()}
          </div>

          <nh-button
            slot="primary-action"
            type="submit"
            .size=${'auto'}
            .variant=${'primary'}
            @click=${() => this._dimensionForm.handleSubmit()}
            .disabled=${false}
            .loading=${false}
            >Add</nh-button
          >
        </nh-dialog>
      </main>
    `;
  }

  private renderMainForm(): TemplateResult {
    if (this._formType == 'input-dimension') {
      return html`<create-dimension
        .dimensionType=${'input'}
        .sensemakerStore=${this._sensemakerStore.value}
      ></create-dimension>`;
    }
    return html`<create-output-dimension-method-form
      .sensemakerStore=${this._sensemakerStore.value}
      .inputRange=${this._selectedInputDimensionRange}
      .inputDimensions=${this._inputDimensionList._dimensionEntries}
      .inputDimensionRanges=${this._inputDimensionList._rangeEntries}
      .submitBtn=${this.submitBtn}
    ></create-output-dimension-method-form>`;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'create-dimension': CreateDimension,
    'create-output-dimension-method-form': CreateOutputDimensionMethod,
    'dimension-list': DimensionList,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  private onDimensionCreated = async (e: CustomEvent) => {
    if (e.detail.dimensionType == 'input') {
      await this._dimensionForm.resetForm();
      await this._dimensionForm.requestUpdate();
    }
    await this._inputDimensionList.fetchDimensionEntries();
    await this._inputDimensionList.fetchRangeEntries();
    await this._outputDimensionList.fetchDimensionEntries();
    await this._outputDimensionList.fetchRangeEntries();
  };

  private onMethodCreated = async (e: CustomEvent) => {
    console.log('method created!');
    this._dialog.hideDialog();
    await this._outputDimensionList.fetchRangeEntries();
    await this._outputDimensionList.fetchDimensionEntries();
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

      h2 {
        margin: 0;
        padding-left: 2rem;
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
      dimension-list {
        grid-column: 1 / -1;
        display: flex;
        align-items: start;
      }
    `;
  }
}
