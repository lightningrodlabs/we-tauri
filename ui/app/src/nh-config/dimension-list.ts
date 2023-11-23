import { html, css, PropertyValueMap, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import {keyed} from 'lit/directives/keyed.js';

import { AppInfo, CallZomeResponse, EntryHash, EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { Dimension,  Range, RangeKind, SensemakerStore } from "@neighbourhoods/client";

import { NHButton, NHCard, NHComponent } from "@neighbourhoods/design-system-components";
import MethodListForDimension from "./method-list";
import { StoreSubscriber } from "lit-svelte-stores";
import { capitalize, generateHashHTML } from "../elements/components/helpers/functions";
import { classMap } from "lit/directives/class-map.js";
import { FieldDefinition, FieldDefinitions, Table, TableStore } from "@adaburrows/table-web-component";

type InputDimensionTableRecord = {
  ['dimension-name']: string,
  ['range-type']: string,
  ['range-min']: number,
  ['range-max']: number,
}

type OutputDimensionTableRecord = InputDimensionTableRecord & {
  ['input-dimension-name'] : string,
  ['method-operation'] : string,
}

type DimensionTableRecord = InputDimensionTableRecord | OutputDimensionTableRecord;

export default class DimensionList extends NHComponent {  
  @property()
  sensemakerStore!: SensemakerStore;

  @property()
  dimensionType: "input" | "output" = "input";

  @state()
  tableStore!: TableStore<DimensionTableRecord>;

  @state()
  private _dimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;

  @state()
  private _rangeEntries!: Array<Range & { range_eh: EntryHash }>;

  async fetchDimension(entryHash: EntryHash) : Promise<CallZomeResponse> {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
      return this.sensemakerStore.client.callZome({
            cell_id,
            zome_name: 'sensemaker',
            fn_name: 'get_dimension',
            payload: entryHash,
      });
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRange(entryHash: EntryHash) : Promise<CallZomeResponse> {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
      return this.sensemakerStore.client.callZome({
            cell_id,
            zome_name: 'sensemaker',
            fn_name: 'get_range',
            payload: entryHash,
      });
    } catch (error) {
      console.log('Error fetching range details: ', error);
    }
  }

  async fetchDimensionEntriesFromHashes(dimensionEhs: EntryHash[]) : Promise<Dimension[]> {
    const response = await Promise.all(dimensionEhs.map(eH => this.fetchDimension(eH)))
    return response.map(payload => {
      try {
        return decode(payload.entry.Present.entry) as Dimension
      } catch (error) {
        console.log('Error decoding dimension payload: ', error);
      }
    }) as Dimension[];
  }

  async fetchRangeEntries() {
    await this.fetchRangeEntriesFromHashes(this._dimensionEntries.map((dimension: Dimension) => dimension.range_eh));
  }

  async fetchDimensionEntries() {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
      const response = await this.sensemakerStore.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'get_dimensions',
        payload: null,
      });
      this._dimensionEntries = response.map(payload => {
        try {
          const entryHash = payload.signed_action.hashed.content.entry_hash;
          return { ...decode(payload.entry.Present.entry) as Dimension & { dimension_eh: EntryHash }, dimension_eh: entryHash};
        } catch (error) {
          console.log('Error decoding dimension payload: ', error);
        }
      }) as Array<Dimension & { dimension_eh: EntryHash }>;
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRangeEntriesFromHashes(rangeEhs: EntryHash[]) {
    const response = await Promise.all(rangeEhs.map(eH => this.fetchRange(eH)))
    this._rangeEntries = response.map((payload, index) => {
      try {
        return { ...decode(payload.entry.Present.entry) as Range, range_eh: rangeEhs[index]}
      } catch (error) {
        console.log('Error decoding range payload: ', error);
      }
    }) as Array<Range & { range_eh: EntryHash }>;
  }

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    await this.fetchDimensionEntries()
    await this.fetchRangeEntries()
  }

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {

    if(_changedProperties.has('_dimensionEntries') || _changedProperties.has('_rangeEntries')) {
      if(typeof this._rangeEntries == 'undefined') return;
      
      try {
        const tableRecords = this._dimensionEntries.filter((dimension: Dimension) => this.dimensionType == 'input' ? !dimension.computed : dimension.computed)
          .reverse()
          .map((dimension: Dimension & { dimension_eh: EntryHash; }) => {
            const range = this._rangeEntries
              .find((range: Range & { range_eh: EntryHash; }) =>
                encodeHashToBase64(range.range_eh) === encodeHashToBase64(dimension.range_eh));
            if(!range) {
              return {
                ['dimension-name']: dimension.name,
                ['range-type']: 'N/A',
                ['range-min']: 0,
                ['range-max']: 0,
              }
            }
            const [[rangeType, rangeValues]] : any = Object.entries(range?.kind as RangeKind);
            
            return {
              ['dimension-name']: dimension.name,
              ['range-type']: rangeType,
              ['range-min']: rangeValues?.min,
              ['range-max']: rangeValues?.max,
            }
          });
        this.tableStore.records = tableRecords;
        this.requestUpdate()
      } catch (error) {
        console.log('Error mapping dimensions and ranges to table values: ', error)
      }
    }
  }

  async connectedCallback() {
    super.connectedCallback();
    
    const fieldDefs: FieldDefinitions<DimensionTableRecord> = this.dimensionType == "input"
      ? {
        'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
        'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
        'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
        'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}) }
      : {
        'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
        'input-dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Input Dimension'}),
        'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Operation'}),
        'method-operation': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
        'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
        'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}) }

    //@ts-ignore
    this.tableStore = new TableStore({
      tableId: 'dimensions',
      fieldDefs,
      showHeader: true,
      records: []
    });
  }
  
  render() {
    return html`
      <div class="content">
        <h1>${capitalize(this.dimensionType)} Dimensions</h1>
        ${this.tableStore.records && this.tableStore.records.length > 0
          ? html`<wc-table .tableStore=${this.tableStore}></wc-table>`
          : 'No dimensions present'
        }
      </div>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    "method-list-for-dimension": MethodListForDimension,
    'wc-table': Table,
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;
      }

      .content{
        width: 100%;
      }

      h2 {
        margin: calc(1px * var(--nh-spacing-md)) 0;
      }

      nh-card {
        border-style: solid;
        border-width: 2px;
        border-radius: calc(24px); 
        border-color: transparent;
      }
      nh-card.selected {
        border-color: var(--nh-theme-accent-default); 
      }
    `;
  }
}