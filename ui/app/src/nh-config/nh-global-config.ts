import { html, css } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash } from '@holochain/client';

import { NHButton, NHComponent } from '@neighbourhoods/design-system-components';
import CreateMethod from './create-method-form';
import CreateDimension from './create-dimension-form';
import DimensionList from './dimension-list';
import { query } from 'lit/decorators.js';

export default class NHGlobalConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @query('dimension-list')
  _list;
  @query('create-dimension')
  _dimensionForm;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  render() {
    return html`
      <main
        @dimension-created=${async (_: CustomEvent) => {
          await this._dimensionForm.resetForm(); 
          await this._dimensionForm.requestUpdate();
          await this._list.fetchDimensionEntries()}
        }
      >
        <create-dimension .sensemakerStore=${this._sensemakerStore.value}></create-dimension>
        <dimension-list .sensemakerStore=${this._sensemakerStore.value}></dimension-list>
        <create-method></create-method>
      </main>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
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
        grid-template-rows: 1fr 1fr;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      dimension-list {
        grid-column: -2/-1;
        grid-row: 1/-1;
        display: flex;
        align-items: start;
      }
    `;
  }
}
