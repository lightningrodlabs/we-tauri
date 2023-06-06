import { LitElement, html, css, TemplateResult, unsafeCSS } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';
import { contextProvided } from '@lit-labs/context';

import { Assessment, CulturalContext, Dimension, DimensionEh, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { Readable, StoreSubscriber, get } from '@holochain-open-dev/stores';
import { decode } from '@msgpack/msgpack';

import {
  FieldDefinitions,
  FieldDefinition,
  TableStore,
  Table,
} from '@adaburrows/table-web-component';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { encodeHashToBase64 } from '@holochain/client';

import theme from '../../styles/css/variables.css?inline' assert { type: 'css' };
import adapter from '../../styles/css/design-adapter.css?inline' assert { type: 'css' };

import { SlAlert, SlIcon } from '@scoped-elements/shoelace';
import { DimensionDict, cleanResourceNameForUI } from '../dashboard/sensemaker-dashboard';

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

@customElement('dashboard-table')
export class StatefulTable extends ScopedRegistryHost(LitElement) {
  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  @property({ type: SensemakerStore, attribute: true })
  _sensemakerStore;
  
  @property({ type: AssessmentTableType })
  tableType;
  @state()
  fieldDefs!: FieldDefinitions<AssessmentTableRecord>;

  @property({ type: String })
  resourceName;
  @property()
  allAssessments = new StoreSubscriber(this, () => this._sensemakerStore.resourceAssessments());

  @property({ type: String })
  selectedContext;
  @state()
  contextEntry!: CulturalContext;
  @property()
  selectedDimensions!: DimensionDict;
  @property()
  dimensionEntries!: any[];

  @property({ attribute: false })
  public tableStore!: TableStore<AssessmentTableRecord>;

  emitFinishedLoadingEvent() {
    const event = new CustomEvent('sub-component-loaded', {
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  async connectedCallback() {
    super.connectedCallback();

    this.fieldDefs = this.generateFieldDefs(this.resourceName, this.tableType);
    this.tableStore = new TableStore({
      tableId,
      fieldDefs: this.fieldDefs,
      colGroups: [
        { span: 2, class: 'fixedcols' }
      ],
      showHeader: true,
    });

    // TODO: Find a way of getting properties for 'Dimensions' entry hashes so that I know which are objective/subjective. 
    // Is it from AppletUIConfig?
    // const dimensionsEntries =  

    (this.allAssessments.store() as Readable<any>).subscribe(resourceAssessments => {
      if (Object.values(resourceAssessments).length) {
        this.tableStore.records = (Object.values(resourceAssessments) as Assessment[]).map(this.assessmentToAssessmentTableRecord);
        this.emitFinishedLoadingEvent();
      }
    });
  }

  async updated(changedProperties) {
    let resourceAssessments: Assessment[] = (Object.values(this.allAssessments.value as AssessmentDict))[0];

    if(this.tableType === AssessmentTableType.Resource) {
      // Hard coded until I can separate obj/subj dimensions. TODO: Remove this line
      // resourceAssessments = this.filterByMethodNames(resourceAssessments, ['importance', 'perceived_heat']);
      // console.log('resourceAssessments (subjective) :>> ', resourceAssessments);
      this.tableStore.records = resourceAssessments.map(this.assessmentToAssessmentTableRecord) as AssessmentTableRecord[];
      console.log('this.tableStore.records :>> ', this.tableStore.records);
      this.tableStore.fieldDefs = this.generateFieldDefs(this.resourceName, this.tableType);
      return;
    }
    
    // else we are dealing with a context, filter accordingly
    // Hard coded until I can separate obj/subj dimensions. TODO: Remove this line
    this.filterByMethodNames(resourceAssessments, ['total_importance', 'average_heat']);
    // console.log('resourceAssessments (objective) :>> ', resourceAssessments);

    for(let[propName, _] of changedProperties) {
      if(propName != 'selectedContext') return

      const contexts = await this._sensemakerStore.getCulturalContext(this[propName]);
      try {
        this.contextEntry = decode(contexts.entry.Present.entry) as CulturalContext;
      } catch (error) {
        console.log('No context entry exists for that context entry hash!')  
      }
      // Take the first dimension_eh in the first threshold of the context and use to filter TODO: review this way of filtering 
      const filteredAssessments =  this.filterByDimensionEh(resourceAssessments, encodeHashToBase64(this.contextEntry.thresholds[0].dimension_eh));
      this.tableStore.records = filteredAssessments.map(this.assessmentToAssessmentTableRecord);
      this.tableStore.fieldDefs = this.generateFieldDefs(this.resourceName, this.tableType);
    }
  }

  generateFieldDefs(resourceName: string, tableType: AssessmentTableType) : FieldDefinitions<AssessmentTableRecord> {
    const fixedFields = {
      'resource': new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Resource', resourceName),
        decorator: (resource: any) => html` <div
          style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;"
        >
          ${generateHashHTML(resource.eh)} ${resource.value}
        </div>`,
      }),
      'neighbour': new FieldDefinition<AssessmentTableRecord>({
        heading: generateHeaderHTML('Neighbour', 'Member'),
        decorator: (agentPublicKeyB64: any) => html` <div
          style="width: 100%; display: grid;place-content: start center; height: 100%; justify-items: center;"
        >
          ${generateHashHTML(agentPublicKeyB64)} ${generateMockProfile(Math.floor(Math.random() * 5) + 1)}
        </div>`,
    })}
    switch (tableType) {
      case AssessmentTableType.Resource:
        return fixedFields
      case AssessmentTableType.Context:
        const fieldEntries = Object.entries(this.selectedDimensions).map(([dimensionName, dimensionHash] : [string, Uint8Array]) => ({
          [dimensionName]: new FieldDefinition<AssessmentTableRecord>({ heading: generateHeaderHTML('Dimension', cleanResourceNameForUI(dimensionName)) })
        }))
        const contextFields = fieldEntries.reduce((field, fields) => ({...fields, ...field}) , {}) 
        return {
        ...fixedFields,
        ...contextFields
      }
    }
  }
  
  assessmentToAssessmentTableRecord = (assessment: Assessment) : AssessmentTableRecord => {
    return { 
      neighbour: encodeHashToBase64(assessment.author),
      resource: { eh: encodeHashToBase64(assessment.resource_eh), value: Object.values(assessment.value)[0]}, } as AssessmentTableRecord
  }
  
  filterByDimensionEh(resourceAssessments: Assessment[], filteringHash: string) {
    return resourceAssessments.filter((assessment: Assessment) => {
      return encodeHashToBase64(assessment.dimension_eh) === filteringHash
    })
  }

  filterByMethodNames(resourceAssessments: Assessment[], filteringMethods: string[]) {
    return resourceAssessments.filter((assessment: Assessment) => {
      for(let method of filteringMethods) {
        if(encodeHashToBase64(this.selectedDimensions[method]) == encodeHashToBase64(assessment.dimension_eh)) return false
      }
      return true
    })
  }

  render(): TemplateResult {
    // TODO: figure out why this re-renders 3 times on tab change
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
    /** Theme Properties **/
    ${unsafeCSS(theme)}
    ${unsafeCSS(adapter)}
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
      --border-color: #7d7087;
      --menuSubTitle: #a89cb0;
      --column-max-width: calc(2rem * var(--nh-spacing-lg));
      
      /** Header Cells **/
      --table-assessmentsForResource-heading-background-color: var(--nh-theme-bg-surface);
      --header-cell-border-width: 1px;
      --header-title-margin-y: 6px;
      --header-cell-border-width: 1px;

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
function generateMockValue(number: number) {
  switch (number) {
    case 1:
      return html`<p
        style="font-size: var(--cell-value-font-size);
        line-height: var(----nh-line-heights-headlines-small);"
      >
        What are some easy-to-grow veggies for beginners? I'm new to urban gardening and need some
        advice! 🌱👀 #gardeningtips #beginnergardener
      </p>`;
    case 2:
      return html`<p
        style="font-size: var(--cell-value-font-size);
        line-height: var(----nh-line-heights-headlines-small);"
      >
        Just harvested my first batch of tomatoes! So excited to cook with them tonight 🍅😋
        #urbangardening #homegrown
      </p>`;
    default:
      return html`<p
        style="font-size: var(--cell-value-font-size);
        font-size: var(--cell-hash-font-size);
        line-height: var(--nh-line-heights-headlines-small);"
      >
        Anyone have recommendations for natural pest control methods? My kale plants are getting
        eaten alive! 🐛🌿 #pestcontrol #organiccrops
      </p>`;
  }
}
function generateHeaderHTML(headerTitle: string, resourceName : string = 'Resource') {
  return html` <div style="font-family: 'Open Sans'; margin: var(--header-title-margin-y) 0">
    <h2
      style="margin: 0; font-size: calc(1px * var(--nh-font-size-md)); margin-bottom: var(--header-title-margin-y); font-weight: var(--nh-font-weights-headlines-bold)"
    >
      ${resourceName}
    </h2>
    <h4
      style="margin: 0; font-size: calc(1px * var(--nh-font-size-sm));font-weight: var(--nh-font-weights-headlines-regular)"
    >
      ${headerTitle}
    </h4>
  </div>`;
}
function generateHashHTML(hash: string) {
  return html`
    <div
      style="
      color: var(--menuSubTitle);
      border: 1px solid var(--menuSubTitle);
      border-radius: var(--cell-hash-border-radius);
      font-size: var(--cell-hash-font-size);
      line-height: var(--nh-line-heights-headlines-bold);
      overflow: hidden;
      white-space: nowrap;
      padding: var(--cell-hash-padding);
      height: 1rem;
      width: calc(var(--column-max-width) - (2 * var(--cell-hash-padding)));
      text-overflow: ellipsis;
    "
    >
      ${hash}
    </div>
  `;
}
