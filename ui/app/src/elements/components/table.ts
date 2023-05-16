import { LitElement, html, css, TemplateResult } from "lit";
import { property, customElement, state } from "lit/decorators.js";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";

import { Assessment, SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { StoreSubscriber, get, Readable, derived } from '@holochain-open-dev/stores';

import { FieldDefinitions, FieldDefinition, TableStore, Table as AdaTable } from '@adaburrows/table-web-component';
import { RowValue } from "@adaburrows/table-web-component/dist/table-store";

export type AssessmentDict = {
    [entryHash: string]: Assessment[];
};

export const tableId = "assessmentsForResource";

const fieldDefs: FieldDefinitions<Assessment> = {
    'value': new FieldDefinition<Assessment>({heading: 'Value'}),
    'dimension': new FieldDefinition<Assessment>({heading: 'Dimension'}),
    'resource': new FieldDefinition<Assessment>({heading: 'Resource'}),
    'author': new FieldDefinition<Assessment>({heading: 'Author'})
}

@customElement('assessments-table')
export class Table extends ScopedElementsMixin(LitElement) {
    @contextProvided({ context: sensemakerStoreContext, subscribe: true })
    @property({type: SensemakerStore, attribute: true})
    _sensemakerStore;

    @state()
    resourceIndex : keyof AssessmentDict = 'abc';

    @property()
    allAssessments!: Readable<AssessmentDict[]>;

    @property({attribute: false})
    public tableStore!: TableStore<Assessment>

    constructor() {
        super();
    }
    
    connectedCallback() {
        super.connectedCallback();
        
        this.allAssessments =  this._sensemakerStore.resourceAssessments()
        const results: AssessmentDict[] = get(this.allAssessments);

        try {
            if(!results) return;

            const flatAssessments = Object.values(results[this.resourceIndex]).flat() as Assessment[]; 
            
            this.tableStore = new TableStore({
                // This is the Id used to identify the table in the CSS variables and is the table's HTML id
                tableId,
                fieldDefs,
                records: flatAssessments,
                showHeader: true
            });
        } catch (error) {
            console.log('Problem parsing Sensemaker store results into TableStore', error)
        }
    }

    // dispatch an event when a context is selected
    dispatchContextSelected() {
        // TODO create page tabs and wire up to this handler
        this.dispatchEvent(new CustomEvent('context-selected'))
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