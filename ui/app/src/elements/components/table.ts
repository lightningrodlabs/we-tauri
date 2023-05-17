import { LitElement, html, css, TemplateResult } from "lit";
import { property, customElement, state } from "lit/decorators.js";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";

import { Assessment, SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { Readable, StoreSubscriber, derived, get as readStore } from '@holochain-open-dev/stores';

import { FieldDefinitions, FieldDefinition, TableStore, Table as AdaTable } from '@adaburrows/table-web-component';
import { RowValue } from "@adaburrows/table-web-component/dist/table-store";

export type AssessmentDict = {
  [entryHash: string]: Assessment[];
};

export const tableId = "assessmentsForResource";

const fieldDefs: FieldDefinitions<Assessment> = {
  'value': new FieldDefinition<Assessment>({ heading: 'Value' }),
  'dimension': new FieldDefinition<Assessment>({ heading: 'Dimension' }),
  'resource': new FieldDefinition<Assessment>({ heading: 'Resource' }),
  'author': new FieldDefinition<Assessment>({ heading: 'Author' })
}

@customElement('assessments-table')
export class Table extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  @property({ type: SensemakerStore, attribute: true })
  _sensemakerStore;

  @state()
  resourceIndex: keyof AssessmentDict = 'abc';

  @property()
  allAssessments = new StoreSubscriber(this, () => this._sensemakerStore.resourceAssessments());

  @property({ attribute: false })
  public tableStore!: TableStore<Assessment>

  constructor() {
    super();

    this.tableStore = new TableStore({
      // This is the Id used to identify the table in the CSS variables and is the table's HTML id
      tableId,
      fieldDefs,
      showHeader: true
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    (this.allAssessments.store() as Readable<any>)
      .subscribe(value => {
        this.tableStore.records = value
          ? Object.values(value).flat() as Assessment[]
          : this.tableStore.records
      })
  }
  // dispatch an event when a context is selected
  dispatchContextSelected() {
    // TODO create page tabs and wire up to this handler
    this.dispatchEvent(new CustomEvent('context-selected'))
  }

  render(): TemplateResult {
    return this.tableStore.records.length
      ? html`<adaburrows-table .tableStore=${this.tableStore}></adaburrows-table>`
      : html`<div id="${this.tableStore.tableId}"><p>No assessments found</p></div>`;
  }

  static elementDefinitions = {
    'adaburrows-table': AdaTable
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