import { html, css, TemplateResult } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash, EntryHash, encodeHashToBase64 } from '@holochain/client';

import { NHButton, NHComponent, NHDialog, NHPageHeaderCard } from '@neighbourhoods/design-system-components';
import CreateMethod from './create-method-form';
import CreateDimension from './create-dimension-form';
import DimensionList from './dimension-list';
import { query, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';

export default class NHGlobalConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;
  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @query('nh-dialog')
  _dialog;
  @query('dimension-list')
  _list;
  @query('create-dimension')
  _dimensionForm;

  @state()
  private _selectedInputDimensionRange!: Range;

  @state()
  private _inputDimensionEhs: EntryHash[] = [];

  @state()
  private _formType: "input-dimension" | "method" = "input-dimension";

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  getDialogAlertMessage() {
    return (this._dimensionForm && this._dimensionForm.touched && !this._dimensionForm.valid) ? "Some of your fields need to be updated:" : ""
  }

  resetConfig() {
    this._formType = "input-dimension"
    this._list.dimensionSelected = false;
  }

  render() {
    return html`
      <main
        @dimension-created=${async (e: CustomEvent) => await this.onDimensionCreated(e)}
        @request-method-create=${async (_: CustomEvent) => this.onMethodCreateRequest()}
        @method-created=${async (e: CustomEvent) => await this.onMethodCreated(e)}
        @reset-form-type=${() => this.resetConfig()}
        @input-dimension-selected=${async (e: CustomEvent) => this.onInputDimensionSelected(e)}
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
        <dimension-list .sensemakerStore=${this._sensemakerStore.value} .dimensionType=${'input'}></dimension-list>
        <nh-button
          id="add-dimension"
          .variant=${"primary"}
          .size=${"md"}
          @click=${() => {this._formType = "input-dimension";this._dialog.showDialog()} }
        >
          Add Dimension
        </nh-button>
        <dimension-list .sensemakerStore=${this._sensemakerStore.value} .dimensionType=${'output'}></dimension-list>
        <nh-button
          id="add-dimension"
          .variant=${"primary"}
          .size=${"md"}
          @click=${() => {this._formType = "method"; this._dialog.showDialog()} }
        >
          Add Dimension
        </nh-button>
        <nh-dialog
          id="create-dimension-dialog"
          .dialogType=${"create-dimension"}
          .title=${"Add " + (this._formType == "input-dimension" ? "Input" : "Output") + " Dimension"}
          .size=${"medium"}
          .alertType=${this?._dimensionForm?.valid ? null: "warning"}
          .alertMessage=${this.getDialogAlertMessage()}
          .handleOk=${() => { this._dimensionForm.submitBtn.click() }}
          .primaryButtonDisabled=${false}
          .isOpen=${true}
          .handleClose=${(e: any) => { if(!this._dimensionForm.valid) {
            e?.target?.show()
          }}}
        >           
          <div slot="inner-content">
          ${this.renderMainForm()}
          </div>
        </nh-dialog>
      </main>
    `;
  }

  private renderMainForm(): TemplateResult {
    if(this._formType == "input-dimension") {
      return html`<create-dimension .dimensionType=${"input"} .sensemakerStore=${this._sensemakerStore.value}></create-dimension>`
    }
    return html`<create-method .inputRange=${this._selectedInputDimensionRange} .inputDimensionEhs=${this._inputDimensionEhs} .sensemakerStore=${this._sensemakerStore.value}></create-method>`;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'create-dimension': CreateDimension,
    'create-method': CreateMethod,
    'dimension-list': DimensionList,
  };

  private onClickBackButton() {
    !this._dimensionForm
      ? this.resetConfig()
      : this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  private onMethodCreateRequest = () => {
    this._formType = "method";
  }

  private onDimensionCreated = async (e: CustomEvent) => {
    if (e.detail.dimensionType == "input") {
      await this._dimensionForm.resetForm();
      await this._dimensionForm.requestUpdate();

      this._formType = "method";
      this._list.dimensionSelected = true;
    }
    await this._list.fetchDimensionEntries();
    await this._list.fetchRangeEntries();
    this._list.resetSelectedInputDimensionIndex();
    await this._list.firstUpdated();
  }

  private onMethodCreated = async (e: CustomEvent) => {  
    // Add this to the state of the dimension list (WORKAROUND until we get a getMethods fn in the store)
    const inputMethods = [...this._list.methodInputDimensions];
    const dimensionOfThisMethod = inputMethods?.find(dimension => encodeHashToBase64(dimension.dimension_eh) === encodeHashToBase64(e.detail.inputDimensionEhs[0]));
    if (dimensionOfThisMethod) {
      dimensionOfThisMethod.methodEh = encodeHashToBase64(e.detail.methodEh);
      this._list.methodInputDimensions = inputMethods;
      await this._list.requestUpdate('methodInputDimensions');
    }

    this._list.dimensionSelected = false;
    this._formType = "input-dimension";
  }

  private onInputDimensionSelected = (e: CustomEvent) => {
    this._inputDimensionEhs = [e.detail.dimensionEh];
    this._selectedInputDimensionRange = e.detail.range;
    this._list.dimensionSelected = true;
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
