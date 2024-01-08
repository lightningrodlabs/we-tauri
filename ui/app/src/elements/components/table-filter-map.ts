import { Readable, derived, get } from '@holochain-open-dev/stores';
import {
  Assessment,
  CulturalContext,
  Dimension,
  SensemakerStore,
  sensemakerStoreContext,
} from '@neighbourhoods/client';
import { LitElement, css, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppInfo, EntryHash, DnaHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';
import { StatefulTable } from './table';
import { FieldDefinition } from '@adaburrows/table-web-component';
import { AssessmentTableRecord, AssessmentTableType, DimensionDict } from './helpers/types';
import { generateHeaderHTML, cleanResourceNameForUI } from './helpers/functions';
import { decode } from '@msgpack/msgpack';
import { MatrixStore } from '../../matrix-store';
import { matrixContext, weGroupContext } from '../../context';

@customElement('dashboard-filter-map')
export class DashboardFilterMap extends LitElement {
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({ type: SensemakerStore, attribute: true })
  _sensemakerStore!: SensemakerStore;

  @consume({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @property()
  private _allAssessments;

  @property({ type: String })
  resourceName;
  @property({ type: String })
  resourceDefEh;
  @property({ type: AssessmentTableType })
  tableType;
  @property({ type: Object })
  selectedAppletResourceDefs;
  @property({ type: String })
  selectedContext;
  @property()
  contextEhs!: EntryHash[];
  @property()
  contextEhsB64!: string[];
  @state()
  private _dimensionEntries!: Dimension[];
  @state()
  selectedDimensions!: DimensionDict;
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
      () => [this._subjectiveDimensionNames, this._objectiveDimensionNames]
    );

    this.setupAssessmentFilteringSubscription();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._allAssessments.unsubscribe();
  }

  async updated(changedProps) {
    if ((changedProps.has('selectedAppletResourceDefs') || changedProps.has('resourceDefEh')) && this.resourceDefEh) {
      this._allAssessments.unsubscribe();
      this.setupAssessmentFilteringSubscription();
      this.requestUpdate('selectedDimensions')
    }
    if (changedProps.has('selectedContext')) {
      await this.fetchCurrentContextEntry();
      this._allAssessments.unsubscribe();
      this.setupAssessmentFilteringSubscription();
    }
    if (changedProps.has('contextEhs') && this.tableType == AssessmentTableType.Context) {
      this._allAssessments.unsubscribe();
      this.contextEhsB64 = this.contextEhs.map(eh => encodeHashToBase64(eh));
      this.setupAssessmentFilteringSubscription();
    }
    if (changedProps.has('selectedDimensions')) {
      await this.fetchSelectedDimensionEntries();
      this.fieldDefs = this.generateContextFieldDefs();
      this.filterSelectedDimensionsByComputedMethod();
    }
    if (
      changedProps.has('_subjectiveDimensionNames') &&
      typeof changedProps.get('_objectiveDimensionNames') !== 'undefined'
    ) {
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
      this._contextEntry = decode((contexts.entry as any).Present.entry) as CulturalContext;
    } catch (error) {
      console.log('No context entry exists for that context entry hash!');
    }
  }

  async fetchSelectedDimensionEntries() {
    if (!this.selectedDimensions) return;

    try {
      const appInfo: AppInfo = await this._sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
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
    let filteredByResourceDef = (
      this.resourceDefEh == 'none'
        ? Object.values(assessments)
        : this.filterByResourceDefEh(assessments, this.resourceDefEh)
    ).flat() as Assessment[];

    filteredByResourceDef = this.selectedAppletResourceDefs ? this.filterByAppletResourceDefEhs(filteredByResourceDef, this.selectedAppletResourceDefs)  as Assessment[] : filteredByResourceDef;
    // By objective/subjective dimension names
    let filteredByMethodType;

    if (this.tableType === AssessmentTableType.Resource) {
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        this._objectiveDimensionNames,
      );
    } else {
      // else we are dealing with a Context table, filter accordingly
      filteredByMethodType = this.filterByMethodNames(
        filteredByResourceDef,
        this._subjectiveDimensionNames,
      );
    }

    // By context && context results
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
      // TODO: cache each context's results and extract this all to a method
      tripleFiltered = tripleFiltered.filter(assessment => {
        if(!this.contextEhsB64?.length) return false;
        const matchingContextEntryDefHash = this.contextEhsB64.find((eHB64) => encodeHashToBase64(assessment.resource_eh) === eHB64)
        if(matchingContextEntryDefHash) {
          // Filter out the oldest objective dimension values (so we have the latest average)
          const results = tripleFiltered.filter(assessment => encodeHashToBase64(assessment.resource_eh) === matchingContextEntryDefHash)
          const latestAssessmentFromResults = results.sort((a, b) => b.timestamp > a.timestamp).slice(-1)
          return latestAssessmentFromResults[0] == assessment
        }
      })
    }
// console.log('tripleFiltered || filteredByMethodType :>> ', tripleFiltered || filteredByMethodType);
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

  filterByAppletResourceDefEhs(resourceAssessments: Assessment[], selectedAppletResourceDefEhs: EntryHash[]) {
    if(!selectedAppletResourceDefEhs || typeof selectedAppletResourceDefEhs !== 'object') return;
    const appletResourceDefs = Object.values(selectedAppletResourceDefEhs).map(eh => encodeHashToBase64(eh));
    return resourceAssessments.filter((assessment: Assessment) => appletResourceDefs.includes(encodeHashToBase64(assessment.resource_def_eh)))
  }

  filterByDimensionEh(resourceAssessments: Assessment[], filteringHash: string) {
    return resourceAssessments.filter((assessment: Assessment) => {
      return encodeHashToBase64(assessment.dimension_eh) === filteringHash;
    });
  }

  filterByMethodNames(resourceAssessments: Assessment[], filteringMethods: string[]): Assessment[] {
    return resourceAssessments.filter((assessment: Assessment) => {
      for (let method of filteringMethods) {
        if(!this.selectedDimensions[method]) return true;
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

    // get the view from the matrix store
    const resourceView = this._matrixStore.getResourceView(this.weGroupId, assessment.resource_def_eh);
    const baseRecord = {
      neighbour: encodeHashToBase64(assessment.author),
      resource: {
        eh: [assessment.resource_eh, resourceView],
        value: [Object.values(assessment.value)[0], assessment],
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
        baseRecord[dimensionName] = [Object.values(assessment.value)[0], assessment];
      }
    }

    return baseRecord;
  }

  generateContextFieldDefs(): { [x: string]: FieldDefinition<AssessmentTableRecord> } {
    const contextFieldEntries = Object.entries(this.selectedDimensions).filter(
      ([dimensionName, _]: [string, Uint8Array]) =>
        this.tableType === AssessmentTableType.Resource
          ? this._subjectiveDimensionNames.includes(dimensionName)
          : this._objectiveDimensionNames.includes(dimensionName) &&
            this.filteredAssessments.every(a => a[dimensionName] !== ''),
    );
    switch (this.tableType) {
      case AssessmentTableType.Resource:
        const fieldEntriesResource = contextFieldEntries.map(
          ([dimensionName, _]: [string, Uint8Array]) => ({
            [dimensionName]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Assessment', cleanResourceNameForUI(dimensionName)),
              decorator: (value: any) => {
                const assessment = value[1] as Assessment;
                const isAssessment = !!assessment;
                if (isAssessment) {
                  const assessWidgetType = get(this._sensemakerStore.widgetRegistry())[
                    encodeHashToBase64(assessment.dimension_eh)
                  ].assess;
                  if(!assessWidgetType) return  html`<div></div>`;
                  const assessWidget = new assessWidgetType();
                  assessWidget.resourceEh = assessment.resource_eh;
                  assessWidget.dimensionEh = assessment.dimension_eh;
                  assessWidget.resourceDefEh = assessment.resource_def_eh;
                  const methodMap = get(this._sensemakerStore.methodDimensionMapping());
                  // given the assessment.dimension_eh, find the method eh that maps to it
                  const methodEh = Object.keys(methodMap).find(
                    key =>
                      encodeHashToBase64(methodMap[key].inputDimensionEh) ===
                      encodeHashToBase64(assessment.dimension_eh),
                  );
                  assessWidget.methodEh = decodeHashFromBase64(methodEh!);
                  assessWidget.sensemakerStore = this._sensemakerStore;
                  assessWidget.latestAssessment = get(
                    this._sensemakerStore.myLatestAssessmentAlongDimension(
                      encodeHashToBase64(assessment.resource_eh),
                      encodeHashToBase64(assessment.dimension_eh),
                    ),
                  );

                  const displayWidgetType = get(this._sensemakerStore.widgetRegistry())[
                    encodeHashToBase64(assessment.dimension_eh)
                  ].display;
                  const displayWidget = new displayWidgetType();
                  displayWidget.assessment = assessment;
                  const displayWidgetStyles = displayWidgetType.styles as any;

                  return html`
                    <style>
                      ${unsafeCSS(displayWidgetStyles[1])}
                      .display-box, .display-box-wrapper {
                        display: grid;
                        place-content: center;
                      }
                    </style>
                    <div class="widget-wrapper">${displayWidget.render()}</div>
                  `;
                } else {
                  return html`<div></div>`;
                }
              },
            }),
          }),
        );
        return fieldEntriesResource.reduce((fields, field) => ({ ...fields, ...field }), {});
      case AssessmentTableType.Context:
        const fieldEntriesContext = contextFieldEntries.map(
          ([dimensionName, _]: [string, Uint8Array]) => ({
            [dimensionName]: new FieldDefinition<AssessmentTableRecord>({
              heading: generateHeaderHTML('Dimension', cleanResourceNameForUI(dimensionName)),
              decorator: (value: any) => {
                const assessment = value[1] as Assessment;
                const isAssessment = !!assessment;
                if (isAssessment) {
                  const assessWidgetType = get(this._sensemakerStore.widgetRegistry())[
                    encodeHashToBase64(assessment.dimension_eh)
                  ].assess;
                  const assessWidget = new assessWidgetType();
                  assessWidget.resourceEh = assessment.resource_eh;
                  assessWidget.dimensionEh = assessment.dimension_eh;
                  assessWidget.resourceDefEh = assessment.resource_def_eh;
                  const methodMap = get(this._sensemakerStore.methodDimensionMapping());
                  // given the assessment.dimension_eh, find the method eh that maps to it
                  const methodEh = Object.keys(methodMap).find(
                    key =>
                      encodeHashToBase64(methodMap[key].outputDimensionEh) ===
                      encodeHashToBase64(assessment.dimension_eh),
                  );
                  assessWidget.methodEh = decodeHashFromBase64(methodEh!);
                  assessWidget.sensemakerStore = this._sensemakerStore;
                  assessWidget.latestAssessment = get(
                    this._sensemakerStore.myLatestAssessmentAlongDimension(
                      encodeHashToBase64(assessment.resource_eh),
                      encodeHashToBase64(assessment.dimension_eh),
                    ),
                  );

                  const displayWidgetType = get(this._sensemakerStore.widgetRegistry())[
                    encodeHashToBase64(assessment.dimension_eh)
                  ].display;
                  const displayWidget = new displayWidgetType();
                  displayWidget.assessment = assessment;
                  const displayWidgetStyles = displayWidgetType.styles as any;
                  return html`
                    <style>
                      ${unsafeCSS(displayWidgetStyles[1])}
                      .display-box, .display-box-wrapper {
                        display: grid;
                        place-content: center;
                      }
                    </style>
                    <div class="widget-wrapper">${displayWidget.render()}</div>
                  `;
                } else {
                  return html`<div></div>`;
                }
              },
            }),
          }),
        );
        return fieldEntriesContext.reduce((field, fields) => ({ ...fields, ...field }), {});
    }
    return {};
  }

  static get elementDefinitions() {
    return {
      'dashboard-table': StatefulTable,
    };
  }

  static get styles() {
    return [
      css`
        .widget-wrapper {
          display: flex;
          flex-direction: row;
        }
        .widget-wrapper > * {
          flex: 1;
        }
      `,
    ];
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
