import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { Assessment } from '@neighbourhoods/sensemaker-lite-types';
import { encodeHashToBase64 } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { StoreSubscriber } from 'lit-svelte-stores';

import { TableC } from '../components/table2';

export class SensemakerDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;

  render() {
    return html`
      <test-table></test-table>
    `;
  }

  static get scopedElements() {
    return {
      'test-table': TableC
    };
  }

  static styles = css`
    table {
        font-family: arial, sans-serif;
        border-collapse: collapse;
        width: 100%;
    }
    
    td, th {
        border: 1px solid #dddddd;
        text-align: left;
        padding: 8px;
    }
    
    tr:nth-child(even) {
        background-color: #dddddd;
    }
  `;
}