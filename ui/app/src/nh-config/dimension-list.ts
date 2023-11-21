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

type DimensionTableRecord = {
  ['dimension-name']: string,
  ['range-type']: string,
  ['range-min']: number,
  ['range-max']: number,
}

export default class DimensionList extends NHComponent {  
  @property()
  sensemakerStore!: SensemakerStore;

  @property()
  dimensionSelected: boolean = false;

  @property()
  dimensionType: "input" | "output" = "input";

  @state()
  tableStore!: TableStore<DimensionTableRecord>;

  @state()
  private _dimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;

  @state()
  private _rangeEntries!: Array<Range & { range_eh: EntryHash }>;
  
  @state()
  _selectedInputDimensionIndex!: number;

  @state()
  methodInputDimensions: Array<Dimension & { methodEh: EntryHashB64, dimensionEh?: EntryHashB64 }> = [];

  @state()
  filteredMethodInputDimensions: Array<Dimension & { methodEh?: EntryHashB64, dimensionEh?: EntryHashB64 }> = [];

  @state()
  private _methodMapping = new StoreSubscriber(this, () => this.sensemakerStore.methodDimensionMapping());

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
    // NOTE: The following retrieves a mapping for method entry hashes to their respective input/output dimension hashes, but ONLY for those registered in an appletConfig.
    if(typeof this._methodMapping.value == 'undefined') return;
    
    // If there is a method mapping (from applet config) it will be included here
    const dimensions : any = [];
    for (const [methodEh,{inputDimensionEh}] of Object.entries(this._methodMapping.value)) {
      const response = await this.fetchDimension(inputDimensionEh);
      try {
        const dimension = decode(response.entry.Present.entry) as any;
        dimension.methodEh = methodEh;
        dimensions.push(dimension)
      } catch (error) {
        console.log('Error decoding dimension payload: ', error);
      }
    }
    this.methodInputDimensions = [...this.methodInputDimensions, ...this._dimensionEntries, ...dimensions];

    // Select the first item in the list:
    // this.dispatchEvent(new CustomEvent("input-dimension-selected", {
    //   detail: { range: this._rangeEntries[this._rangeEntries.length-1], dimensionEh: this._dimensionEntries[this._dimensionEntries.length-1].dimension_eh },
    //   bubbles: true,
    //   composed: true,
    // }));
    this.dimensionSelected = true;
  }

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(_changedProperties.has('methodInputDimensions') && !!_changedProperties.get('methodInputDimensions')) {
      this.filteredMethodInputDimensions = this.methodInputDimensions.filter(dimension => dimension?.methodEh);
    }

    if(_changedProperties.has('_dimensionEntries') || _changedProperties.has('_rangeEntries')) {
      if(typeof this._rangeEntries == 'undefined') return;
      
      try {
        const tableRecords = this._dimensionEntries.filter((dimension: Dimension) => this.dimensionType == 'input' ? !dimension.computed : dimension.computed)
          .reverse()
          .map((dimension: Dimension & { dimension_eh: EntryHash; }, dimensionIndex: number) => {
            const range = this._rangeEntries
            .find((range: Range & { range_eh: EntryHash; }) =>
              encodeHashToBase64(range.range_eh) === encodeHashToBase64(dimension.range_eh));

            const [[rangeType, rangeValues]] : any = Object.entries(range?.kind as RangeKind);
            if(!rangeType || typeof rangeValues !== 'object') throw Error('Error formulating ranges for table record');
            return {
              ['dimension-name']: dimension.name,
              ['range-type']: rangeType,
              ['range-min']: rangeValues?.min,
              ['range-max']: rangeValues?.max,
            }
          });
        this.tableStore.records = tableRecords;
        console.log('this._dimensionEntries tableRecords:>> ', tableRecords);
      } catch (error) {
        console.log('Error mapping dimensions and ranges to table values: ', error)
      }
    }
  }

  handleCreateMethod = (dimension: Partial<Dimension> & { range_eh: Uint8Array; }, dimensionIndex: number) => {
      this._selectedInputDimensionIndex = dimensionIndex;

      const selectedRange = this._rangeEntries
        .find((range: Range & { range_eh: EntryHash; }) => 
          encodeHashToBase64(range.range_eh) === encodeHashToBase64(dimension.range_eh));

      // this.dispatchEvent(new CustomEvent("input-dimension-selected", {
      //   detail: { range: selectedRange, dimensionEh: dimension.dimension_eh },
      //   bubbles: true,
      //   composed: true,
      // }));
      // this.dispatchEvent(new CustomEvent("request-method-create", {
      //   detail: {},
      //   bubbles: true,
      //   composed: true,
      // }));

  }

  resetSelectedInputDimensionIndex() {
    this._selectedInputDimensionIndex = 0;
  }

  async connectedCallback() {
    super.connectedCallback();
    
    const fieldDefs: FieldDefinitions<DimensionTableRecord> = {
      'dimension-name': new FieldDefinition<DimensionTableRecord>({heading: 'Name'}),
      'range-type': new FieldDefinition<DimensionTableRecord>({heading: 'Type'}),
      'range-min': new FieldDefinition<DimensionTableRecord>({heading: 'Min'}),
      'range-max': new FieldDefinition<DimensionTableRecord>({heading: 'Max'}),
    }
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
        <wc-table .tableStore=${this.tableStore}></wc-table>
      </div>
    `;
  }

  // private renderInputDimensions(): TemplateResult {
  //   return typeof this._dimensionEntries == 'undefined' || this._dimensionEntries.length == 0
  //     ? html`No dimensions available`
  //     : html`<div style="display:flex; flex-direction: column; gap: 8px;">
  //       ${this._dimensionEntries.filter((dimension: Dimension) => !dimension.computed)
  //         .reverse()
  //         .map((dimension: Dimension & { dimension_eh: EntryHash; }, dimensionIndex: number) => {
  //           return keyed(encodeHashToBase64(dimension.dimension_eh), html`
  //             <nh-card 
  //               class="nested-card ${classMap({
  //                   selected: this._selectedInputDimensionIndex == dimensionIndex,
  //                 })}" .theme=${"dark"}
  //               .heading=${dimension.name}
  //               .textSize=${"sm"}
  //             >
  //               <h1>Range: </h1>
  //               ${this._rangeEntries?.length
  //                 ? this.renderRangeDetails(this._rangeEntries
  //                   .find((range: Range & { range_eh: EntryHash; }) =>
  //                     encodeHashToBase64(range.range_eh) === encodeHashToBase64(dimension.range_eh))) 
  //                 : null}

  //               ${this.renderMethodList(dimension, dimensionIndex)}
  //             </nh-card>`);
  //         }
  //         )
  //       }
  //     </div>`;
  // }

  private renderRangeDetails(range: Range & { range_eh: EntryHash } | undefined) : TemplateResult {
    if(typeof range == "undefined") return html``;
    return html`
      <nh-card .theme=${"light"} .title=${range.name} >
        <h3><em>Kind:</em></h3>
        <div>${Object.keys(range.kind)[0]}</div>
        <h3><em>Min:</em></h3>
        <span>${Object.values(range.kind)[0].min}</span>
        <h3><em>Max:</em></h3>
        <span>${Object.values(range.kind)[0].max}</span>
      </nh-card>
    `
  }

  private renderMethodList(dimension: Partial<Dimension> & { range_eh: Uint8Array; } & { dimension_eh: EntryHash; }, dimensionIndex: number): TemplateResult {
    return this.filteredMethodInputDimensions.length > 0 && this.filteredMethodInputDimensions.some(({ name }) => name === dimension.name)
      ? html`<h2>Methods using this dimension: </h2>
              ${this.filteredMethodInputDimensions.map(({ methodEh, name }) => {
                return name == dimension.name
                  ? html`${generateHashHTML(methodEh as string)}`
                  : null;
              })}`
      : html`<h1>No methods for this dimension</h1>
              ${this.renderMethodButton(dimensionIndex, dimension)}`;
  }

  private renderMethodButton(dimensionIndex: number, dimension: Partial<Dimension> & { range_eh: Uint8Array; } & { dimension_eh: EntryHash; }): TemplateResult {
    if(this._selectedInputDimensionIndex !== dimensionIndex) { 
      return html`<nh-button .size=${"sm"} .variant=${"warning"} @click=${() => this.handleCreateMethod(dimension, dimensionIndex)}>Create Method</nh-button>`}
      else return html`<nh-button .size=${"sm"} .variant=${"warning"} disabled=${this.dimensionSelected}>Creating Method</nh-button>`;
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