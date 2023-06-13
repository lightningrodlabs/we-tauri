import {  html, css, TemplateResult } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { contextProvided } from '@lit-labs/context';

import { Assessment, CulturalContext, DimensionEh, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { Readable, StoreSubscriber, get } from '@holochain-open-dev/stores';
import { decode } from '@msgpack/msgpack';

import {
  FieldDefinitions,
  FieldDefinition,
  TableStore,
  Table,
} from '@adaburrows/table-web-component';
import { encodeHashToBase64 } from '@holochain/client';

import { SlAlert, SlIcon } from '@scoped-elements/shoelace';
import { DimensionDict, cleanResourceNameForUI } from '../dashboard/sensemaker-dashboard';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';

interface AssessmentTableRecord {
  resource: object,
  neighbour: string,
  [key: string]: DimensionEh | object | string, // Dimensions or Assessments
}

export enum AssessmentTableType {
  Resource = 'resource',
  Context = 'context',
}

export type AssessmentDict = {
  [entryHash: string]: Assessment[];
};

export const tableId = 'assessmentsForResource';

    // Hard coded until I can separate obj/subj dimensions. TODO: Remove this line and finish implementation on line 99
const objectiveDimensionNames = ['total_importance', 'average_heat'];
const subjectiveDimensionNames = ['importance', 'perceived_heat'];

@customElement('dashboard-table')
export class StatefulTable extends NHComponentShoelace {

  @property({ type: Array })
  assessments: AssessmentTableRecord[] = [];

  @property({ type: Object })
  tableStore!: TableStore<AssessmentTableRecord>;

  updated(changedProps) {
    if (changedProps.has('assessments') || changedProps.has('tableStore')) {
      this.updateTable();
    }
  }

  // TODO: Implement updateTable method
  updateTable() { 
    // Check if we have the necessary data to create the table
    if (!this.assessments || !this.tableStore.fieldDefs) {
      console.warn('No data to create table.');
      return;
    }
  }

  // @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  // @property({ type: SensemakerStore, attribute: true })
  // _sensemakerStore;
  
  // @property({ type: AssessmentTableType })
  // tableType;
  // @state()
  // fieldDefs!: FieldDefinitions<AssessmentTableRecord>;

  // @property({ type: String })
  // resourceName;
  // @property({ type: String })
  // resourceDefEh;
  // @property()
  // allAssessments = new StoreSubscriber(this, () => this._sensemakerStore.resourceAssessments());
  // @state()
  // filteredAssessments!: Assessment[];
  
  // @property({ type: String })
  // selectedContext;
  // @state()
  // contextEntry!: CulturalContext;
  // @property()
  // selectedDimensions!: DimensionDict;
  // @property()
  // dimensionEntries!: any[];

  // @property({ attribute: false })
  // public tableStore!: TableStore<AssessmentTableRecord>;

  // emitFinishedLoadingEvent() {
  //   const event = new CustomEvent('sub-component-loaded', {
  //     bubbles: true,
  //     composed: true,
  //   });
  //   this.dispatchEvent(event);
  // }

  async connectedCallback() {
    super.connectedCallback();

    // let fieldDefs = this.generateFieldDefs(this.resourceName, this.tableType);
    this.tableStore = new TableStore({
      tableId,
      fieldDefs: {},
      colGroups: [
        { span: 2, class: 'fixedcols' }
      ],
      showHeader: true,
    });
  }

  //   // TODO: Find a way of getting properties for 'Dimensions' entry hashes so that I know which are objective/subjective. 
  //   // Is it from AppletUIConfig?
  //   // const dimensionsEntries =  

  //   (this.allAssessments.store() as Readable<any>).subscribe(resourceAssessments => {
  //     if (Object.values(resourceAssessments) && Object.values(resourceAssessments)?.length !== undefined) {
  //       const allAssessments = Object.values(resourceAssessments) as Assessment[][];
  //       try {
  //         this.filteredAssessments = this.filterByResourceDefEh(allAssessments, this.resourceDefEh).flat() as Assessment[];
  //       } catch (error) {
  //         console.log('Error filtering by resource def entry hash :>> ', error);
  //       }
  //       this.tableStore.records = (this.filteredAssessments).map(this.assessmentToAssessmentTableRecord);
  //       this.emitFinishedLoadingEvent();
  //     }
  //   });
  // }
  
  // async updated(changedProperties) {
  //   let resourceAssessments: Assessment[] = this.filteredAssessments?.length ? this.filteredAssessments : (Object.values(this.allAssessments.value as AssessmentDict))[0];
  //   if(this.tableType === AssessmentTableType.Resource) {
  //     resourceAssessments = this.filterByMethodNames(resourceAssessments, subjectiveDimensionNames);
  //     console.log('resourceAssessments (subjective) :>> ', resourceAssessments);
  //     this.tableStore.records = resourceAssessments.map(this.assessmentToAssessmentTableRecord) as AssessmentTableRecord[];
  //     this.tableStore.fieldDefs = this.generateFieldDefs(this.resourceName, this.tableType);
  //     return;
  //   }
    
  //   // else we are dealing with a context, filter accordingly
  //   this.filterByMethodNames(resourceAssessments, objectiveDimensionNames);
  //   console.log('resourceAssessments (objective) :>> ', resourceAssessments);

  //   for(let[propName, _] of changedProperties) {
  //     if(propName != 'selectedContext') return

  //     const contexts = await this._sensemakerStore.getCulturalContext(this[propName]);
  //     try {
  //       this.contextEntry = decode(contexts.entry.Present.entry) as CulturalContext;
  //     } catch (error) {
  //       console.log('No context entry exists for that context entry hash!')  
  //     }
  //     // Take the first dimension_eh in the first threshold of the context and use to filter TODO: review this way of filtering 
  //     this.filteredAssessments =  this.filterByDimensionEh(resourceAssessments, encodeHashToBase64(this.contextEntry.thresholds[0].dimension_eh));
  //     this.tableStore.records = this.filteredAssessments.map(this.assessmentToAssessmentTableRecord);
  //     this.tableStore.fieldDefs = this.generateFieldDefs(this.resourceName, this.tableType);
  //   }
  // }

  // generateFieldDefs(resourceName: string, tableType: AssessmentTableType) : FieldDefinitions<AssessmentTableRecord> {
  //   const fixedFields = {
  //     'resource': new FieldDefinition<AssessmentTableRecord>({
  //       heading: generateHeaderHTML('Resource', resourceName),
  //       decorator: (resource: any) => html` <div
  //         style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;"
  //       >
  //         ${generateHashHTML(resource.eh)}
  //       </div>`,
  //     }),
  //     'neighbour': new FieldDefinition<AssessmentTableRecord>({
  //       heading: generateHeaderHTML('Neighbour', 'Member'),
  //       decorator: (agentPublicKeyB64: any) => html` <div
  //         style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;"
  //       >
  //         ${generateHashHTML(agentPublicKeyB64)} ${generateMockProfile(Math.floor(Math.random() * 5) + 1)}
  //       </div>`,
  //   })}
  //   switch (tableType) {
  //     case AssessmentTableType.Resource:
  //       const fieldEntriesResource = Object.entries(this.selectedDimensions)
  //       .filter(([dimensionName, dimensionHash] : [string, Uint8Array]) => 
  //         subjectiveDimensionNames.includes(dimensionName)
  //       )
  //       .map(([dimensionName, dimensionHash] : [string, Uint8Array]) => ({
  //         [dimensionName]: new FieldDefinition<AssessmentTableRecord>({ heading: generateHeaderHTML('Assessment', cleanResourceNameForUI(dimensionName)), 
  //         decorator: (value: any) => html` <div> ${value} </div>`, }) // TODO: Add widget renderer here
  //       }))
  //       const resourceFields = fieldEntriesResource.reduce((fields, field) => ({...fields, ...field}) , {});
  //       return {
  //         ...fixedFields,
  //         ...resourceFields
  //       }
  //     case AssessmentTableType.Context:
  //       const fieldEntries = Object.entries(this.selectedDimensions)
  //       const fieldEntriesContext = Object.entries(this.selectedDimensions)
  //       .filter(([dimensionName, dimensionHash] : [string, Uint8Array]) => 
  //         objectiveDimensionNames.includes(dimensionName)
  //       )
  //       .map(([dimensionName, dimensionHash] : [string, Uint8Array]) => ({
  //         [dimensionName]: new FieldDefinition<AssessmentTableRecord>({ heading: generateHeaderHTML('Dimension', cleanResourceNameForUI(dimensionName)), 
  //             decorator: (value: any) => html` <div> ${value} </div>`, }) // TODO: Add widget renderer here
  //       }))
  //       const contextFields = fieldEntriesContext.reduce((field, fields) => ({...fields, ...field}) , {}) 
  //       return {
  //       ...fixedFields,
  //       ...contextFields
  //     }
  //   }
  // }
  
  // assessmentToAssessmentTableRecord = (assessment: Assessment) : AssessmentTableRecord => {
  //     // Base record with basic fields
  //   const baseRecord = { 
  //     neighbour: encodeHashToBase64(assessment.author),
  //     resource: { eh: encodeHashToBase64(assessment.resource_eh), value: Object.values(assessment.value)[0] },
  //   } as AssessmentTableRecord;
    
  //   if (this.tableType === 'context') {
  //     // Iterate over dimensions dictionary and add each dimension as a field to the base record with an empty default value
  //     for (let dimensionName of Object.keys(this.selectedDimensions)) {
  //       baseRecord[dimensionName] = "";
  //     }

  //     // If dimension_eh in assessment matches a dimensionUint8 in the dictionary
  //     // populate the corresponding dimension field in the base record with the assessment value
  //     for (let [dimensionName, dimensionUint8] of Object.entries(this.selectedDimensions)) {
  //       if (encodeHashToBase64(assessment.dimension_eh) === encodeHashToBase64(dimensionUint8)) {
  //         baseRecord[dimensionName] = Object.values(assessment.value)[0];
  //       }
  //     }
  //   }
    
  //   return baseRecord;
  // }
    
  // filterByDimensionEh(resourceAssessments: Assessment[], filteringHash: string) {
  //   return resourceAssessments.filter((assessment: Assessment) => {
  //     return encodeHashToBase64(assessment.dimension_eh) === filteringHash
  //   })
  // }

  // filterByResourceDefEh(resourceAssessments: Assessment[][], filteringHash: string) {
  //   return Object.values(resourceAssessments.filter((assessments: Assessment[]) => {
  //     return assessments.every(assessment => encodeHashToBase64(assessment.resource_def_eh) === filteringHash)
  //   }))
  // }

  // filterByMethodNames(resourceAssessments: Assessment[], filteringMethods: string[]) : Assessment[] {
  //   return resourceAssessments.filter((assessment: Assessment) => {
  //     for(let method of filteringMethods) {
  //       if(encodeHashToBase64(this.selectedDimensions[method]) == encodeHashToBase64(assessment.dimension_eh)) return false
  //     }
  //     return true
  //   })
  // }

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
      --table-assessmentsForResource-max-height: calc(100vh - 101px - calc(1px * var(--nh-spacing-lg)));

      --table-assessmentsForResource-border-spacing: calc(1px * var(--nh-spacing-sm));
      --cell-radius: calc(1px * var(--nh-radii-base));

      --table-assessmentsForResource-display : block;
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
      --table-assessmentsForResource-header-first-heading-border-width: var(--header-cell-border-width);
      --table-assessmentsForResource-header-last-heading-border-width: var(--header-cell-border-width);
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
      --table-assessmentsForResource-resource-row-even-background-color: var(--nh-colors-eggplant-800) !important;
      --table-assessmentsForResource-resource-heading-background-color: var(--nh-colors-eggplant-800) !important;
      --table-assessmentsForResource-neighbour-heading-background-color: var(--nh-colors-eggplant-800) !important;
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

function generateMockProfile(number: number) {
  return html` <img
    alt="profile"
    src="profile${number}.png"
    style="height: 2rem; object-fit: cover;"
  />`;
}
function generateHeaderHTML(headerTitle: string, resourceName : string = 'Resource') {
  return html`<div style="
      margin: var(--header-title-margin-y) 0;
      height: 4rem;
      display: flex;
      flex-direction: column;
      justify-content: space-around;">
    <h2 style="font-family: var(--nh-font-families-headlines);
      font-weight: var(--sl-font-weight-semibold);
      min-width: var(--column-min-width);
      margin: 0;
      font-size: calc(1px * var(--nh-font-size-md));
      margin-bottom: var(--header-title-margin-y);;"
    >
      ${resourceName}
    </h2>
    <h4
      style="font-family: var(--nh-font-families-body);
      margin: 0; 
      font-size: calc(1px * var(--nh-font-size-sm));
      font-weight: var(--nh-font-weights-headlines-regular)"
    >
      ${headerTitle}
    </h4>
  </div>`;
}
function generateHashHTML(hash: string) {
  return html`
    <div
      style="color: var(--menuSubTitle);
      border: 1px solid var(--menuSubTitle);
      border-radius: var(--cell-hash-border-radius);
      font-family: var(--nh-font-families-body);
      font-size: var(--cell-hash-font-size);
      line-height: var(--nh-line-heights-headlines-bold);
      overflow: hidden;
      white-space: nowrap;
      padding: var(--cell-hash-padding);
      height: 1rem;
      width: calc(var(--column-max-width) - (2 * var(--cell-hash-padding)));
      text-overflow: ellipsis;"
    >
      ${hash}
    </div>
  `;
}
