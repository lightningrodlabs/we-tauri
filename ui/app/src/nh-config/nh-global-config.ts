import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash, EntryHash, encodeHashToBase64 } from '@holochain/client';

import { NHButton, NHCard, NHComponent, NHDialog, NHPageHeaderCard } from '@neighbourhoods/design-system-components';
import CreateMethod from './create-method-form';
import CreateDimension from './create-dimension-form';
import DimensionList from './dimension-list';
import { property, query, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';

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
  private _inputDimensionEhs: EntryHash[] = [];
  @state()
  private _formType: "input-dimension" | "method" = "input-dimension";

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );
  
  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (_changedProperties.has('_formType')) {
      this._dimensionForm = this.renderRoot.querySelector('create-dimension');
    }
  }

  protected async updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (_changedProperties.has('_formType') && typeof _changedProperties.get('_formType') !== "undefined") {
      await this.updateComplete;
      this._dimensionForm = this.renderRoot.querySelector(this._formType == 'input-dimension' ? 'create-dimension' : 'create-method');
    }
  }

  isDimensionFormValid() {
    if(!this._dimensionForm) return false;

    return this._dimensionForm.touched // && this._dimensionForm.valid 
  }

  render() {
    return html`
      <main
        @dimension-created=${async (e: CustomEvent) => await this.onDimensionCreated(e)}
        @method-created=${async (e: CustomEvent) => await this.onMethodCreated(e)}
      >
        <nh-page-header-card .heading=${"Neighbourhood Config"}>
          <nh-button
            slot="secondary-action"
            .variant=${"neutral"}
            .size=${"icon"}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>
        <dimension-list id="input-dimension-list" .sensemakerStore=${this._sensemakerStore.value} .dimensionType=${'input'}></dimension-list>
        <nh-button
          id="add-dimension"
          .variant=${"primary"}
          .size=${"md"}
          @click=${() => {this._formType = "input-dimension"; this._dialog.showDialog(); this.requestUpdate()} }
        >
          Add Dimension
        </nh-button>
        <dimension-list id="output-dimension-list" .sensemakerStore=${this._sensemakerStore.value} .dimensionType=${'output'}></dimension-list>
        <nh-button
          id="add-dimension"
          .variant=${"primary"}
          .size=${"md"}
          @click=${() => {this._formType = "method"; this._dialog.showDialog(); this.requestUpdate()} }
        >
          Add Dimension
        </nh-button>
        <nh-dialog
          id="create-dimension-dialog"
          .dialogType=${"create-dimension"}
          .title=${"Dimensions"}
          .size=${"medium"}
          .handleOk=${ () => {
            this._dimensionForm.onSubmit({validateOnly: true});
              if(!this.isDimensionFormValid()) {
                return { preventDefault: true }
              }
            ;
          }}
          .handleClose=${async () => {
            await this._dimensionForm.updateComplete;
            if(!this._dimensionForm.valid) {
              return ({ preventDefault: true })
            }
            // TODO: adapt the dialog so that this is seamless (currently there are instances where form has invalid field but dialog is still closing)
            await this._dimensionForm.onSubmit() 
          }}
        >           
          <nh-card
            slot="inner-content"
            class="nested-card"
            .heading=${"Add " + (this._formType == "input-dimension" ? "Input" : "Output") + " Dimension"}
          >
          ${this.renderMainForm()}
          </nh-card>
        </nh-dialog>
      </main>
    `;
  }

  private renderMainForm(): TemplateResult {
    if(this._formType == "input-dimension") {
      return html`<create-dimension .dimensionType=${"input"} .sensemakerStore=${this._sensemakerStore.value}></create-dimension>`
    }
    return html`<create-method .inputDimensions=${this._inputDimensionList._dimensionEntries} .inputDimensionRanges=${this._inputDimensionList._rangeEntries} .inputRange=${this._selectedInputDimensionRange} .inputDimensionEhs=${this._inputDimensionEhs} .sensemakerStore=${this._sensemakerStore.value}></create-method>`;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'create-dimension': CreateDimension,
    'create-method': CreateMethod,
    'dimension-list': DimensionList,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  private onDimensionCreated = async (e: CustomEvent) => {
    if (e.detail.dimensionType == "input") {
      await this._dimensionForm.resetForm();
      await this._dimensionForm.requestUpdate();
    }
    await this._inputDimensionList.fetchDimensionEntries();
    await this._inputDimensionList.fetchRangeEntries();
    await this._outputDimensionList.fetchDimensionEntries();
    await this._outputDimensionList.fetchRangeEntries();
  }
  
  private onMethodCreated = async (e: CustomEvent) => {  
    console.log('method created!')
    this._dialog.hideDialog();
    await this._outputDimensionList.fetchRangeEntries();
    await this._outputDimensionList.fetchDimensionEntries();
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        width: 100% 
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
