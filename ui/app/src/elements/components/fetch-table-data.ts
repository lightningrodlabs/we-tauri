import { Readable } from '@holochain-open-dev/stores';
import { Assessment, CulturalContext, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { encodeHashToBase64 } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';
import { StatefulTable } from './table';
import { FieldDefinition } from '@adaburrows/table-web-component';
import { AssessmentTableRecord, AssessmentTableType, DimensionDict } from './helpers/types';
import { generateHeaderHTML, cleanResourceNameForUI } from './helpers/functions';
import { decode } from '@msgpack/msgpack';

// Hard coded until I can separate obj/subj dimensions. TODO: Remove this line and finish implementation on line 99
const objectiveDimensionNames = ['total_importance', 'average_heat'];
const subjectiveDimensionNames = ['importance', 'perceived_heat'];

@customElement('fetch-assessment')
export class FetchAssessment extends LitElement {
  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  @property({ type: SensemakerStore, attribute: true })
  _sensemakerStore;
  @property()
  private _allAssessments;

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
  @state()
  private _dimensionEntries!: any[];
  @state()
  private _contextEntry!: CulturalContext;

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
  
  async updated(changedProps) {
    if (changedProps.has('selectedContext')) {
      await this.fetchCurrentContextEntry();
      this._allAssessments.unsubscribe();
      this.setupAssessmentFilteringSubscription();
    }
  }

  setupAssessmentFilteringSubscription() {
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
          console.log('filteredAssessments ready to be mapped :>> ', filteredAssessments, this.selectedDimensions);
          assessmentTableRecords = filteredAssessments.map(this.mapAssessmentToAssessmentTableRecord.bind(this));
        } catch (error) {
          console.log('Error filtering assessments :>> ', error);
        }
        this.filteredAssessments = assessmentTableRecords;
      }
    });
  }

  async fetchCurrentContextEntry() {
    if(this.selectedContext == 'none') return
    
    const contexts = await this._sensemakerStore.getCulturalContext(this.selectedContext);
    try {
      this._contextEntry = decode(contexts.entry.Present.entry) as CulturalContext;
    } catch (error) {
      console.log('No context entry exists for that context entry hash!')
    }
  }

  // Filtering
  flatFiltered(assessments: Assessment[][]): Assessment[] {
    // By ResourceDefEH
    let filteredByResourceDef = this.filterByResourceDefEh(
      assessments,
      this.resourceDefEh,
    ).flat() as Assessment[];
    console.warn('FILTERED 1 :>> tabletype ', filteredByResourceDef, this.tableType);
    // By objective/subjective dimension names
    let filteredByMethodType;

    if (this.tableType === AssessmentTableType.Resource) {
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        objectiveDimensionNames,
      );
      console.log('this.filterByMethodNames( :>> ', this.filterByMethodNames(
        filteredByResourceDef,
        objectiveDimensionNames,
      ));
    } else {
      // else we are dealing with a Resource table, filter accordingly
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        subjectiveDimensionNames,
      );
    }
    
    // console.warn('FILTERED 2 :>> ', filteredByMethodType);
    // console.warn('FILTERED pre 3 :>> ', filteredByMethodType.map(r => r?.dimension_eh && encodeHashToBase64(r.dimension_eh)));
    // By context
    let tripleFiltered;
    if (this.tableType === AssessmentTableType.Context && !!this._contextEntry?.thresholds && !!this.selectedDimensions) {
      tripleFiltered = this.filterByDimensionEh(filteredByMethodType, encodeHashToBase64(this._contextEntry.thresholds[0].dimension_eh));
    }

    return tripleFiltered || filteredByMethodType;
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

  filterByDimensionEh(resourceAssessments: Assessment[], filteringHash: string) {
    return resourceAssessments.filter((assessment: Assessment) => {
      console.log('filtering by dimension :>> ',  encodeHashToBase64(assessment.dimension_eh) === filteringHash, filteringHash);
      return encodeHashToBase64(assessment.dimension_eh) === filteringHash
    })
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

  // Mapping
  mapAssessmentToAssessmentTableRecord(
    assessment: Assessment
  ): AssessmentTableRecord {
    // Base record with basic fields
    const baseRecord = {
      neighbour: encodeHashToBase64(assessment.author),
      resource: {
        eh: encodeHashToBase64(assessment.resource_eh),
        value: Object.values(assessment.value)[0],
      },
    } as AssessmentTableRecord;
    
    if(!this.selectedDimensions) return baseRecord;
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
      return {}
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
