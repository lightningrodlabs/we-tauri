import { Readable } from '@holochain-open-dev/stores';
import { Assessment, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AssessmentTableRecord, AssessmentTableType, generateHeaderHTML } from './table';
import { encodeHashToBase64 } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';
import { StatefulTable } from './table';
import { DimensionDict, cleanResourceNameForUI } from '../dashboard/sensemaker-dashboard';
import { FieldDefinition } from '@adaburrows/table-web-component';

// Hard coded until I can separate obj/subj dimensions. TODO: Remove this line and finish implementation on line 99
const objectiveDimensionNames = ['total_importance', 'average_heat'];
const subjectiveDimensionNames = ['importance', 'perceived_heat'];

@customElement('fetch-assessment')
export class FetchAssessment extends LitElement {
  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  @property({ type: SensemakerStore, attribute: true })
  _sensemakerStore;
  @property()
  _allAssessments;

  @property({ type: String })
  resourceName;
  @property({ type: String })
  resourceDefEh;
  @property({ type: AssessmentTableType })
  tableType;
  @property({ type: String })
  selectedContext;
  @property()
  selectedDimensions!: DimensionDict;

  // To be fed as a prop to the dashboard table component
  @property({ type: Array })
  filteredAssessments: Assessment[] = [];

  async connectedCallback() {
    super.connectedCallback();

    this._allAssessments = new StoreSubscriber(this, () =>
      this._sensemakerStore.resourceAssessments(),
    );
    this.setupAssessmentFilteringSubscription();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._allAssessments.unsubscribe();
  }

  async setupAssessmentFilteringSubscription() {
    // Subscribe to resourceAssessments, filtering using this component's props when a new value is emitted
    (this._allAssessments.store() as Readable<any>).subscribe(resourceAssessments => {
      if (
        Object.values(resourceAssessments) &&
        Object.values(resourceAssessments)?.length !== undefined &&
        this.tableType
      ) {
        let allAssessments = Object.values(resourceAssessments) as Assessment[][];
        let assessmentTableRecords;
        try {
          let filteredAssessments = this.flatFiltered(allAssessments);
          assessmentTableRecords = filteredAssessments.map(a =>
            this.mapAssessmentToAssessmentTableRecord(a, this.tableType),
          );
        } catch (error) {
          console.log('Error filtering assessments :>> ', error);
        }
        this.filteredAssessments = assessmentTableRecords;
      }
    });
  }

  flatFiltered(assessments: Assessment[][]): Assessment[] {
    // By ResourceDefEH
    let filteredByResourceDef = this.filterByResourceDefEh(
      assessments,
      this.resourceDefEh,
    ).flat() as Assessment[];

    // By objective/subjective dimension names
    let filteredByDimension;

    if (this.tableType === AssessmentTableType.Context) {
      filteredByDimension = this.filterByMethodNames(
        filteredByResourceDef,
        subjectiveDimensionNames,
      );
    } else {
      // else we are dealing with a context, filter accordingly
      filteredByDimension = this.filterByMethodNames(
        filteredByResourceDef,
        objectiveDimensionNames,
      );
    }

    return filteredByDimension;
  }

  filterByResourceDefEh(resourceAssessments: Assessment[][], filteringHash: string) {
    return Object.values(
      resourceAssessments.filter((assessments: Assessment[]) => {
        return assessments.every(
          assessment => encodeHashToBase64(assessment.resource_def_eh) === filteringHash,
        );
      }),
    );
  }

  filterByMethodNames(resourceAssessments: Assessment[], filteringMethods: string[]): Assessment[] {
    return resourceAssessments.filter((assessment: Assessment) => {
      for (let method of filteringMethods) {
        if (
          encodeHashToBase64(this.selectedDimensions[method]) ==
          encodeHashToBase64(assessment.dimension_eh)
        )
          return false;
      }
      return true;
    });
  }

  mapAssessmentToAssessmentTableRecord(
    assessment: Assessment,
    type: AssessmentTableType,
  ): AssessmentTableRecord {
    // Base record with basic fields
    const baseRecord = {
      neighbour: encodeHashToBase64(assessment.author),
      resource: {
        eh: encodeHashToBase64(assessment.resource_eh),
        value: Object.values(assessment.value)[0],
      },
    } as AssessmentTableRecord;

    // Iterate over dimensions dictionary and add each dimension as a field to the base record with an empty default value
    for (let dimensionName of Object.keys(this.selectedDimensions)) {
      baseRecord[dimensionName] = '';
    }

    // If dimension_eh in assessment matches a dimensionUint8 in the dictionary
    // populate the corresponding dimension field in the base record with the assessment value
    for (let [dimensionName, dimensionUint8] of Object.entries(this.selectedDimensions)) {
      if (encodeHashToBase64(assessment.dimension_eh) === encodeHashToBase64(dimensionUint8)) {
        baseRecord[dimensionName] = Object.values(assessment.value)[0];
      }
    }

    return baseRecord;
  }

  generateContextFieldDefs(): { [x: string]: FieldDefinition<AssessmentTableRecord> } {
    const contextFieldEntries = Object.entries(this.selectedDimensions).filter(
      ([dimensionName, _]: [string, Uint8Array]) =>
        (this.tableType === AssessmentTableType.Resource
          ? subjectiveDimensionNames
          : objectiveDimensionNames
        ).includes(dimensionName),
    );
    switch (this.tableType) {
      case AssessmentTableType.Resource:
        const fieldEntriesResource = contextFieldEntries.map(
          ([dimensionName, _]: [string, Uint8Array]) => ({
            [dimensionName]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Assessment', cleanResourceNameForUI(dimensionName)),
              decorator: (value: any) => html` <div>${value}</div>`,
            }), // TODO: Add widget renderer here
          }),
        );
        return fieldEntriesResource.reduce((fields, field) => ({ ...fields, ...field }), {});
      case AssessmentTableType.Context:
        const fieldEntriesContext = contextFieldEntries.map(
          ([dimensionName, _]: [string, Uint8Array]) => ({
            [dimensionName]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Dimension', cleanResourceNameForUI(dimensionName)),
              decorator: (value: any) => html` <div>${value}</div>`,
            }), // TODO: Add widget renderer here
          }),
        );
        return fieldEntriesContext.reduce((field, fields) => ({ ...fields, ...field }), {});
    }
  }

  static get scopedElements() {
    return {
      'dashboard-table': StatefulTable,
    };
  }

  render() {
    console.log(
      'this.tableType, filtered Assessments, contextFieldDefs :>> ',
      this.tableType,
      this.filteredAssessments,
      this.generateContextFieldDefs(),
    );
    return html`
      <dashboard-table
        .resourceName=${this.resourceName}
        .assessments=${this.filteredAssessments}
        .tableType=${this.tableType}
        .contextFieldDefs=${this.generateContextFieldDefs()}
      ></dashboard-table>
    `;
  }
}
