import { html, css, PropertyValueMap, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";

import { AppInfo, CallZomeResponse, EntryHash, EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { Dimension,  Range, SensemakerStore } from "@neighbourhoods/client";

import { NHButton, NHCard, NHComponent } from "@neighbourhoods/design-system-components";
import MethodListForDimension from "./method-list";
import { StoreSubscriber } from "lit-svelte-stores";
import { generateHashHTML } from "../elements/components/helpers/functions";
import { classMap } from "lit/directives/class-map.js";

export default class DimensionList extends NHComponent {  
  @property()
  sensemakerStore!: SensemakerStore;

  @state()
  private _dimensionEntries!: Dimension[];

  @state()
  private _rangeEntries!: Array<Range & { range_eh: EntryHash }>;
  
  @state()
  _selectedInputDimensionIndex: number = 0;

  @state()
  private _methodInputDimensions!: Array<Dimension & { methodEh: EntryHashB64 }>;

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
          return decode(payload.entry.Present.entry) as Dimension;
        } catch (error) {
          console.log('Error decoding dimension payload: ', error);
        }
      }) as Dimension[];
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

    if(typeof this._methodMapping.value == 'undefined') return;
    
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
    this._methodInputDimensions = dimensions;
  }

  renderRangeDetails(range: Range & { range_eh: EntryHash } | undefined) : TemplateResult {
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

  render() {
    return html`
      <nh-card .theme=${"light"} .title=${"Existing Input Dimensions"} .textSize=${"sm"}>
        <div class="content">
          ${
            typeof this._dimensionEntries == 'undefined' || this._dimensionEntries.length == 0
              ? "No dimensions available"
              : html`<div style="display:flex; flex-direction: column-reverse; gap: 8px;">
                  ${this._dimensionEntries.filter((dimension: Dimension) => !dimension.computed)
                    .map((dimension: Dimension, dimensionIndex: number) => {
                        return html`
                          <nh-card 
                            class="nested-card ${classMap({
                                selected: this._selectedInputDimensionIndex == dimensionIndex,
                              })}" .theme=${"dark"}
                            .heading=${dimension.name}
                            .textSize=${"sm"}
                          >
                            <h1>Range: </h1>
                            ${this._rangeEntries?.length && this.renderRangeDetails(this._rangeEntries.find((range: Range & { range_eh: EntryHash }) => encodeHashToBase64(range.range_eh) === encodeHashToBase64(dimension.range_eh)))}
                            ${typeof this._methodInputDimensions !== 'undefined' && this._methodInputDimensions.length > 0 
                              ? html`<h2>Methods using this dimension: </h2>
                                ${this._methodInputDimensions.map(({methodEh, name}) => {
                                  return name == dimension.name
                                    ? html`${generateHashHTML(methodEh)}`
                                    : null
                                })}
                              `
                              :html`<h1>No methods for this dimension</h1>
                              ${this._selectedInputDimensionIndex !== dimensionIndex
                                ? html`<nh-button .size=${"sm"} .variant=${"success"} @click=${() => {
                                  this._selectedInputDimensionIndex = dimensionIndex;
                                  const selectedRange = this._rangeEntries.find((range: Range & { range_eh: EntryHash }) => encodeHashToBase64(range.range_eh) === encodeHashToBase64(dimension.range_eh));
                                  this.dispatchEvent(new CustomEvent("input-dimension-selected", {
                                    detail: { range: selectedRange },
                                    bubbles: true,
                                    composed: true,
                                  }
                                ))
                                }}>Select</nh-button>` 
                                : html`<nh-button .size=${"sm"} .variant=${"warning"} @click=${() => {
                                    this.dispatchEvent(new CustomEvent("request-method-create", {
                                      detail: {},
                                      bubbles: true,
                                      composed: true,
                                    }
                                  ))
                                }}>Create Method</nh-button>` }
                              ` 
                            }
                            ${this._methodInputDimensions?.length ? this._methodInputDimensions.map(({methodEh, name}) => {
                              return name == dimension.name
                                ? html`${generateHashHTML(methodEh)}`
                                : null
                            }) : null}
                          </nh-card>`
                    }
                  )}</div>`
          }
        </div>
      </nh-card>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    "method-list-for-dimension": MethodListForDimension
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;
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