import { html, css, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { ref } from "lit/directives/ref.js";

import {
  FieldDefinitions,
  FieldDefinition,
  TableStore,
  Table,
} from '@adaburrows/table-web-component';

import { SlAlert, SlIcon } from '@scoped-elements/shoelace';
import { NHComponentShoelace } from '@neighbourhoods/design-system-components';
import { generateHeaderHTML, generateHashHTML, generateMockProfile } from './helpers/functions';
import { AssessmentTableRecord, AssessmentTableType } from './helpers/types';
import { WithProfile } from './profile/with-profile';

export const tableId = 'assessmentsForResource';

@customElement('dashboard-table')
export class StatefulTable extends NHComponentShoelace {
  @property({ type: Array })
  assessments: AssessmentTableRecord[] = [];

  @property({ type: Object })
  tableStore!: TableStore<AssessmentTableRecord>;

  @property()
  resourceName!: string;
  @property()
  contextFieldDefs!: { [x: string]: FieldDefinition<AssessmentTableRecord> };
  @property()
  tableType!: AssessmentTableType;

  updateTable() {
    this.tableStore.fieldDefs = this.generateFieldDefs(this.resourceName, this.contextFieldDefs);

    // Check if we have the necessary data to create the table
    if (!this.assessments || !this.tableStore.fieldDefs) {
      console.warn('No data or field definitions to create table.');
      return;
    }
    
    // The following lines removes records in the table that have no assessment value for the context field definitions generate by generateFieldDefs
    this.tableStore.records = this.contextFieldDefs && Object.entries(this.contextFieldDefs).length 
      ? this.assessments.filter(assessment => Object.keys(this.contextFieldDefs).some(contextField => assessment[contextField] !== "")) 
      : this.assessments;
  }
  async connectedCallback() {
    super.connectedCallback();

    let fieldDefs = this.generateFieldDefs(this.resourceName, this.contextFieldDefs);
    this.tableStore = new TableStore({
      tableId,
      fieldDefs,
      colGroups: [{ span: 2, class: 'fixedcols' }],
      showHeader: true,
    });
  }

  updated(changedProps) {
    if (changedProps.has('assessments') || changedProps.has('contextFieldDefs') || changedProps.has('resourceName')) {
      this.updateTable();
    }
  }

  generateFieldDefs(
    resourceName: string,
    contextFieldDefs: { [x: string]: FieldDefinition<AssessmentTableRecord> },
  ): FieldDefinitions<AssessmentTableRecord> {
    const fixedFieldDefs = {
      resource: new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Resource', resourceName),
        decorator: (resource: any) => html`<div
          style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;"
          ${typeof resource.eh[1] === 'function' ? ref((e) => e ? resource.eh[1](e as HTMLElement, resource.eh[0]): null) : null}
        >
        </div>`,
      }),
      neighbour: new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Neighbour', 'Member'),
        decorator: function(agentPublicKeyB64: any) {return html` <div
          style="width: 100%; display: flex; flex-direction: column; align-items: start; height: 100%; justify-items: center;"
          >
          <with-profile .component=${"identicon"} .agentHash=${agentPublicKeyB64}></with-profile>
        </div>`},
      }),
    };
    return {
      ...fixedFieldDefs,
      ...contextFieldDefs,
    };
  }

  render(): TemplateResult {
    return this.contextFieldDefs
      ? html`<wc-table .tableStore=${this.tableStore}></wc-table>`
      : html`<div class="skeleton-main-container">
      ${Array.from(Array(24)).map(
        () => html`<sl-skeleton effect="sheen" class="skeleton-part"></sl-skeleton>`,
      )}
    </div>`;
  }

  static elementDefinitions = {
    'wc-table': Table,
    'sl-alert': SlAlert,
    'with-profile': WithProfile,
  };

  static styles = css`
    :host {
      /** Global Table **/
      color: var(--nh-theme-fg-default);
      --table-assessmentsForResource-height: 100%;
      --table-assessmentsForResource-overflow-x: auto;
      --table-assessmentsForResource-overflow-y: auto;
      --table-assessmentsForResource-max-height: calc(
        100vh - 101px - calc(1px * var(--nh-spacing-lg))
      );

      --table-assessmentsForResource-border-spacing: calc(1px * var(--nh-spacing-sm));
      --cell-radius: calc(1px * var(--nh-radii-base));

      --table-assessmentsForResource-display: block;
      --table-vertical-align: middle;
      --border-color: #7d7087;
      --menuSubTitle: #a89cb0;
      --column-min-width: calc(1rem * var(--nh-spacing-sm));
      --column-max-width: calc(1rem * var(--nh-spacing-md));

      /** Header Cells **/
      --table-assessmentsForResource-heading-background-color: var(--nh-theme-bg-surface);
      --header-cell-border-width: 1px;
      --header-title-margin-y: 6px;
      --table-assessmentsForResource-importance-heading-vertical-align: bottom;

      /* Border color, width */
      --table-assessmentsForResource-header-first-heading-border-color: var(--border-color);
      --table-assessmentsForResource-header-last-heading-border-color: var(--border-color);
      --table-assessmentsForResource-header-heading-border-color: var(--border-color);
      --table-assessmentsForResource-header-first-heading-border-width: var(
        --header-cell-border-width
      );
      --table-assessmentsForResource-header-last-heading-border-width: var(
        --header-cell-border-width
      );
      --table-assessmentsForResource-header-heading-border-width: var(--header-cell-border-width);
      /* Border radius */
      --table-assessmentsForResource-header-first-heading-border-radius: var(--cell-radius);
      --table-assessmentsForResource-header-last-heading-border-radius: var(--cell-radius);
      --table-assessmentsForResource-header-heading-border-radius: var(--cell-radius);
      --table-assessmentsForResource-body-first-cell-border-radius: var(--cell-radius);
      --table-assessmentsForResource-body-last-cell-border-radius: var(--cell-radius);
      --table-assessmentsForResource-body-cell-border-radius: var(--cell-radius);

      /** Global Cells **/
      /* Hashes */
      --table-assessmentsForResource-body-cell-background-color: var(--nh-theme-bg-surface);
      --cell-hash-border-radius: calc(1px * var(--nh-radii-sm));
      --cell-hash-padding: calc(1px * var(--nh-spacing-sm));
      --cell-hash-font-size: calc(1px * var(--nh-font-size-sm));

      /* Values */
      --cell-value-font-size: calc(1px * var(--nh-font-size-md));

      /** First Two Columns **/
      --table-assessmentsForResource-resource-width: var(--column-max-width);
      --table-assessmentsForResource-neighbour-width: var(--column-max-width);
      --table-assessmentsForResource-resource-vertical-align: middle;
      --table-assessmentsForResource-neighbour-vertical-align: top;

      --table-assessmentsForResource-row-even-background-color: var(---nh-theme-bg-surface);
      --table-assessmentsForResource-row-odd-background-color: var(---nh-theme-bg-surface);
      --table-assessmentsForResource-resource-row-even-background-color: var(
        --nh-colors-eggplant-800
      ) !important;
      --table-assessmentsForResource-resource-heading-background-color: var(
        --nh-colors-eggplant-800
      ) !important;
      --table-assessmentsForResource-neighbour-heading-background-color: var(
        --nh-colors-eggplant-800
      ) !important;
      --table-assessmentsForResource-row-even-background-color: var(--nh-theme-bg-surface);
      --table-assessmentsForResource-row-odd-background-color: var(--nh-theme-bg-surface);
    }
    .alert-wrapper {
      height: 100%;
      display: grid;
      place-content: center;
      align-content: start;
      padding: 4rem calc(1px * var(--nh-spacing-lg));
    }
    .alert::part(base) {
      height: 8rem;
      width: 100%;
    }
  `;
}