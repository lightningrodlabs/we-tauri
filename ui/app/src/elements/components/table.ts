import { AgentPubKey } from '@holochain/client';
import { LitElement, html, css, TemplateResult } from "lit";
import { property, state, customElement } from "lit/decorators.js";
import { contextProvided } from "@lit-labs/context";
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

import { FieldDefinitions, FieldDefinition, TableStore } from '@adaburrows/table-web-component';
import { RowValue } from "@adaburrows/table-web-component/dist/table-store";
import { Assessment, DimensionEh, ResourceEh, RangeValue } from "@neighbourhoods/client";

type Author = AgentPubKey;

const fieldDefs: FieldDefinitions<any> = {
    'value': new FieldDefinition<RangeValue>({heading: 'Value'}),
    'dimension': new FieldDefinition<DimensionEh>({heading: 'Dimension'}),
    'resource': new FieldDefinition<ResourceEh>({heading: 'Resource'}),
    'author': new FieldDefinition<Author>({heading: 'Author'})
  }

@customElement('assessments-table')
export class Table extends ScopedRegistryHost(LitElement) {
    @property({attribute: false})
    public tableStore: TableStore<Assessment>
    
    @state()
    table = html``

    constructor(store) {
        super();
        
        this.tableStore = store;
    }
    render(): TemplateResult {
        return html`
        <div id="${this.tableStore.tableId}">
        ${this.tableStore.caption && this.tableStore.caption !== '' && html`<div class="table-caption">${this.tableStore.caption}</div>`}
        <div class="table-header">
            ${this.tableStore.getHeadings().map( (rowValue) => {
            const {field, value} = rowValue;
            return html`
            <div class="table-header table-column-${field}">
                ${value}
            </div>`
            })}
        </div>
        <div class="table-body">
            ${this.tableStore.getRows().map( (row) => html`
            <div class="table-row">
                ${row.map( (rowValue: RowValue) => {
                const {field, value} = rowValue;
                return html`<div class="table-cell table-column-${field}">${value}</div>`
                })}
            </div>`
            )}
        </div>
        </div>`;
    }
    // dispatch an event when a context is selected
    dispatchContextSelected() {
        // TODO create page tabs and wire up to this handler
        this.dispatchEvent(new CustomEvent('context-selected'))
    }
    
    static styles = css`
    :host {
      /* =================== */
      /* SIMPLE TABLE STYLES */
      /* =================== */
    
      --table-simple-background-color: var(--color-lt-violet);
      --table-simple-border-style: var(--border-solid);
      --table-simple-border-width: var(--border-1px);
    
      --table-simple-b1-width: 8em;
      --table-simple-b0-width: 8em;
    }`;
}