import { LitElement, html, css, TemplateResult } from "lit";
import { property, customElement, state } from "lit/decorators.js";
import { contextProvided } from "@lit-labs/context";
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

import { Assessment, SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { Readable, StoreSubscriber, get } from '@holochain-open-dev/stores';
import { FieldDefinitions, FieldDefinition, TableStore } from '@adaburrows/table-web-component';
import { RowValue } from "@adaburrows/table-web-component/dist/table-store";
import { AssessmentDict, mockAssessments, mockContext } from "./__tests__/test-harness";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";

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
    allAssessments = new StoreSubscriber<AssessmentDict>(
        this, () => this._sensemakerStore.resourceAssessments(),
        () => [this._sensemakerStore.resourceAssessments().value]
    );

    @property({attribute: false})
    public tableStore!: TableStore<Assessment>

    constructor() {
        super();
    }
    
    connectedCallback() {
        super.connectedCallback();
        try {
            const flatAssessments : Assessment[] = Object.values(this.allAssessments.value).flat();
            
            this.tableStore = new TableStore({
                // This is the Id used to identify the table in the CSS variables and is the table's HTML id
                tableId: 'assessments',
                fieldDefs,
                records: flatAssessments,
                showHeader: true
            });
        } catch (error) {
            console.log('Problem parsing Sensemaker store results (Assessments table): ', error)
        }
    }

    render(): TemplateResult {
        return html`
        <div id="abc">
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