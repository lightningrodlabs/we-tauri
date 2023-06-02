import { LitElement, html, css, TemplateResult, unsafeCSS } from "lit";
import { property, customElement, state } from "lit/decorators.js";
import { contextProvided } from "@lit-labs/context";

import { Assessment, SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { Readable, StoreSubscriber, get } from '@holochain-open-dev/stores';

import { FieldDefinitions, FieldDefinition, TableStore, Table } from '@adaburrows/table-web-component';
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin";
import { encodeHashToBase64 } from "@holochain/client";

import theme from '../../styles/css/variables.css?inline' assert { type: 'css' };
import adapter from '../../styles/css/design-adapter.css?inline' assert { type: 'css' };

export type AssessmentDict = {
  [entryHash: string]: Assessment[];
};

export const tableId = "assessmentsForResource";
const b64Decorator = (value: any) => html`${encodeHashToBase64(value)}`;

const fieldDefs: FieldDefinitions<Assessment> = {
  'value': new FieldDefinition<Assessment>({ heading: 'Value', decorator:  (value: any) => html`${Object.values(value)[0]}` }),
  'dimension_eh': new FieldDefinition<Assessment>({ heading: 'Dimension', decorator: b64Decorator }),
  'resource_eh': new FieldDefinition<Assessment>({ heading: 'Resource', decorator: b64Decorator }),
  'author': new FieldDefinition<Assessment>({ heading: 'Author', decorator: b64Decorator }),
}

@customElement('assessments-table')
export class StatefulTable extends ScopedRegistryHost(LitElement) {
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
  
  render(): TemplateResult {
    return this.tableStore.records.length
      ? html`<adaburrows-table .tableStore=${this.tableStore}></adaburrows-table>`
      : html`<div id="${this.tableStore.tableId}"><p>No assessments found</p></div>`;
  }

  static elementDefinitions = {
    'adaburrows-table': Table
  }

  static styles = css`
    /** Theme Properties **/
    ${unsafeCSS(theme)}
  `;
}