import { Readable } from '@holochain-open-dev/stores';
import {
  Assessment,
  CulturalContext,
  Dimension,
  SensemakerStore,
  sensemakerStoreContext,
} from '@neighbourhoods/client';
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

@customElement('dashboard-filter-map')
export class DashboardFilterMap extends LitElement {
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
  private _dimensionEntries!: Dimension[];
  @state()
  private _objectiveDimensionNames: string[] = [];
  @state()
  private _subjectiveDimensionNames: string[] = [];
  @state()
  private _contextEntry!: CulturalContext;

  // To be fed as props to the dashboard table component
  @property()
  fieldDefs;
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
    if (changedProps.has('selectedDimensions')) {
      await this.fetchSelectedDimensionEntries();
      this.filterSelectedDimensionsByComputedMethod()
    }
    if (changedProps.has('_subjectiveDimensionNames') && typeof changedProps.get('_objectiveDimensionNames') !== 'undefined') {
      this.fieldDefs = this.generateContextFieldDefs();
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
          assessmentTableRecords = filteredAssessments.map(
            this.mapAssessmentToAssessmentTableRecord.bind(this),
          );
        } catch (error) {
          console.log('Error filtering assessments :>> ', error);
        }
        this.filteredAssessments = assessmentTableRecords;
      }
    });
  }

  filterSelectedDimensionsByComputedMethod() {
    if (!this._dimensionEntries) return;

    let [subjective, objective] = this._dimensionEntries.reduce(
      (partitioned, dimension) => {
        partitioned[dimension.computed ? 1 : 0].push(dimension.name);
        return partitioned;
      },
      [[], []] as any,
    );
    this._objectiveDimensionNames = objective;
    this._subjectiveDimensionNames = subjective;
  }
  
  async fetchCurrentContextEntry() {
    if (this.selectedContext == 'none') return;

    const contexts = await this._sensemakerStore.getCulturalContext(this.selectedContext);
    try {
      this._contextEntry = decode(contexts.entry.Present.entry) as CulturalContext;
    } catch (error) {
      console.log('No context entry exists for that context entry hash!');
    }
  }

  async fetchSelectedDimensionEntries() {
    if (!this.selectedDimensions) return;

    try {
      const appInfo = await this._sensemakerStore.client.appWebsocket.appInfo({
        installed_app_id: 'we',
      });
      const cell_id = appInfo.cell_info.sensemaker[1].cloned.cell_id;
      const response = await this._sensemakerStore.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'get_dimensions',
        payload: null,
      });
      this._dimensionEntries = response.map(payload => {
        try {
          let dimension = decode(payload.entry.Present.entry) as any;
          return dimension;
        } catch (error) {
          console.log('Error decoding dimension payload: ', error);
        }
      }) as Dimension[];
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  // Filtering
  flatFiltered(assessments: Assessment[][]): Assessment[] {
    // By ResourceDefEH
    let filteredByResourceDef = this.filterByResourceDefEh(
      assessments,
      this.resourceDefEh,
    ).flat() as Assessment[];
    // By objective/subjective dimension names
    let filteredByMethodType;

    if (this.tableType === AssessmentTableType.Resource) {
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        this._objectiveDimensionNames
      );
    } else {
      // else we are dealing with a Context table, filter accordingly
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        this._subjectiveDimensionNames
      );
    }

    // By context
    let tripleFiltered;
    if (
      this.tableType === AssessmentTableType.Context &&
      !!this._contextEntry?.thresholds &&
      !!this.selectedDimensions
    ) {
      tripleFiltered = this.filterByDimensionEh(
        filteredByMethodType,
        encodeHashToBase64(this._contextEntry.thresholds[0].dimension_eh),
      );
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
      return encodeHashToBase64(assessment.dimension_eh) === filteringHash;
    });
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
  mapAssessmentToAssessmentTableRecord(assessment: Assessment): AssessmentTableRecord {
    // Base record with basic fields
    const baseRecord = {
      neighbour: encodeHashToBase64(assessment.author),
      resource: {
        eh: encodeHashToBase64(assessment.resource_eh),
        value: Object.values(assessment.value)[0],
      },
    } as AssessmentTableRecord;

    if (!this.selectedDimensions) return baseRecord;
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
      ([dimensionName, _]: [string, Uint8Array]) => this.tableType === AssessmentTableType.Resource
          ? (this._subjectiveDimensionNames).includes(dimensionName) 
          : (this._objectiveDimensionNames).includes(dimensionName) && this.filteredAssessments.every(a => a[dimensionName] !== '')
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
    return {};
  }

  static get scopedElements() {
    return {
      'dashboard-table': StatefulTable,
    };
  }

  render() {
    return html`
      <dashboard-table
        .resourceName=${this.resourceName}
        .assessments=${this.filteredAssessments}
        .tableType=${this.tableType}
        .contextFieldDefs=${this.fieldDefs}
      ></dashboard-table>
    `;
  }
}
