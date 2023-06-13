import { html, css, TemplateResult } from 'lit';
import { property, customElement } from 'lit/decorators.js';

import { Assessment, DimensionEh } from '@neighbourhoods/client';

import {
  FieldDefinitions,
  FieldDefinition,
  TableStore,
  Table,
} from '@adaburrows/table-web-component';

import { SlAlert, SlIcon } from '@scoped-elements/shoelace';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';

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

    this.tableStore.records = this.assessments;
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
    if (changedProps.has('assessments')) this.updateTable();
  }

  generateFieldDefs(
    resourceName: string,
    contextFieldDefs: { [x: string]: FieldDefinition<AssessmentTableRecord> },
  ): FieldDefinitions<AssessmentTableRecord> {
    const fixedFieldDefs = {
      resource: new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Resource', resourceName),
        decorator: (resource: any) => html` <div
          style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;"
        >
          ${generateHashHTML(resource.eh)}
        </div>`,
      }),
      neighbour: new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Neighbour', 'Member'),
        decorator: (agentPublicKeyB64: any) => html` <div
          style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;"
        >
          ${generateHashHTML(agentPublicKeyB64)}
          ${generateMockProfile(Math.floor(Math.random() * 5) + 1)}
        </div>`,
      }),
    };
    return {
      ...fixedFieldDefs,
      ...contextFieldDefs,
    };
  }

  render(): TemplateResult {
    return this.tableStore.records.length
      ? html`<wc-table .tableStore=${this.tableStore}></wc-table>`
      : html`<div id="${this.tableStore.tableId}">
          <div class="alert-wrapper">
            <sl-alert open class="alert">
              <sl-icon slot="icon" name="info-circle"></sl-icon>
              No assessment data was found. Please visit your applet and create some assessments.
            </sl-alert>
          </div>
        </div>`;
  }

  static elementDefinitions = {
    'wc-table': Table,
    'sl-icon': SlIcon,
    'sl-alert': SlAlert,
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
      --column-max-width: calc(2rem * var(--nh-spacing-md));

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
      --table-assessmentsForResource-resource-vertical-align: top;
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

// @state()
// fieldDefs!: FieldDefinitions<AssessmentTableRecord>;
// @state()
// contextEntry!: CulturalContext;
// @property()
// dimensionEntries!: any[];
  // TODO: Find a way of getting properties for 'Dimensions' entry hashes so that I know which are objective/subjective.
  // Is it from AppletUIConfig?
  // const dimensionsEntries =
