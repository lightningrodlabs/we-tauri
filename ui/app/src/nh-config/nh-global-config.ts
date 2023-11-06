import { html, css } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash, EntryHash, encodeHashToBase64 } from '@holochain/client';

import { NHButton, NHComponent, NHPageHeaderCard } from '@neighbourhoods/design-system-components';
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

  resetConfig() {
    this._formType = "input-dimension"
    this._list.dimensionSelected = false;
  }

  render() {
    return html`
      <main
        @dimension-created=${async (e: CustomEvent) => {
            if(e.detail.dimensionType == "input") {
              await this._dimensionForm.resetForm(); 
              await this._dimensionForm.requestUpdate();

              this._formType = "method"
              this._list.dimensionSelected = true;
              // this._list.methodInputDimensions.push({...e.detail.dimension, dimensionEh: e.detail.dimensionEh});
            }
            await this._list.fetchDimensionEntries()
            await this._list.fetchRangeEntries()
            this._list.resetSelectedInputDimensionIndex()
            await this._list.firstUpdated()
          }
        }
        @request-method-create=${async (_: CustomEvent) => {
          this._formType = "method"
        }}
        @method-created=${async (e: CustomEvent) => {
          // Add this to the state of the dimension list (WORKAROUND until we get a getMethods fn in the store)
          const inputMethods = [...this._list.methodInputDimensions];
          const dimensionOfThisMethod = inputMethods?.find(dimension => encodeHashToBase64(dimension.dimension_eh) === encodeHashToBase64(e.detail.inputDimensionEhs[0]))
          if(dimensionOfThisMethod) {
            dimensionOfThisMethod.methodEh = encodeHashToBase64(e.detail.methodEh)
            this._list.methodInputDimensions = inputMethods;
            await this._list.requestUpdate('methodInputDimensions');
          }

          this._list.dimensionSelected = false;
          this._formType = "input-dimension"
        }}
        @reset-form-type=${() => this.resetConfig()}
        @input-dimension-selected=${async (e: CustomEvent) => {
          this._inputDimensionEhs = [e.detail.dimensionEh];
          this._selectedInputDimensionRange = e.detail.range
          this._list.dimensionSelected = true;
        }}
      >
        <nh-page-header-card .heading=${"Neighbourhood Config"}>
          <nh-button
            slot="secondary-action"
            .variant=${"neutral"}
            .size=${"icon"}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => { !this._dimensionForm
              ? this.resetConfig()
              : this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true})) // TODO emit event to navigate back to home
            }}
          >
          </nh-button>
        </nh-page-header-card>
        ${this._formType == "input-dimension" 
          ? html`<create-dimension .dimensionType=${"input"} .sensemakerStore=${this._sensemakerStore.value}></create-dimension>`
          : html`<create-method .inputRange=${this._selectedInputDimensionRange} .inputDimensionEhs=${this._inputDimensionEhs} .sensemakerStore=${this._sensemakerStore.value}></create-method>`
        }
        <dimension-list .sensemakerStore=${this._sensemakerStore.value}></dimension-list>
      </main>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-page-header-card': NHPageHeaderCard,
    'create-dimension': CreateDimension,
    'create-method': CreateMethod,
    'dimension-list': DimensionList,
  };

  static get styles() {
    return css`
      main {
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 2fr 1fr;
        grid-template-rows: 4rem 1fr 1fr;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }
      nh-page-header-card {
        grid-column: 1/-1;
        grid-row: 1/2;
      }
      dimension-list {
        grid-column: -2/-1;
        grid-row: 2/-1;
        display: flex;
        align-items: start;
      }
    `;
  }
}
