import { LitElement, html, css, TemplateResult } from "lit";
import { property, customElement } from "lit/decorators.js";
import { contextProvided } from "@lit-labs/context";
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

import { Assessment, SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { FieldDefinitions, FieldDefinition, TableStore } from '@adaburrows/table-web-component';
import { RowValue } from "@adaburrows/table-web-component/dist/table-store";

const fieldDefs: FieldDefinitions<Assessment> = {
    'value': new FieldDefinition<Assessment>({heading: 'Value'}),
    'dimension': new FieldDefinition<Assessment>({heading: 'Dimension'}),
    'resource': new FieldDefinition<Assessment>({heading: 'Resource'}),
    'author': new FieldDefinition<Assessment>({heading: 'Author'})
}
@customElement('assessments-table')
export class Table extends ScopedRegistryHost(LitElement) {
    @contextProvided({ context: sensemakerStoreContext, subscribe: true })
    _sensemakerStore!: SensemakerStore;

    @property({attribute: false})
    public tableStore: TableStore<Assessment>
    
    allAssessments = new StoreSubscriber(this, () => this._sensemakerStore.resourceAssessments());

    constructor() {
        super();

        this.tableStore = new TableStore({
            // This is the Id used to identify the table in the CSS variables and is the table's HTML id
            tableId: 'assessments',
            fieldDefs,
            records: Object.values(this.allAssessments.value).flat(),
            showHeader: true
        });
        /* eslint-disable no-console */
        console.log('this.tableStore records :>> ', this.tableStore.records);
        /* eslint-enable no-console */
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