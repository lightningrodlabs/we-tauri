import { html, css, PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";

import { AppInfo, CallZomeResponse, EntryHash, EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { Dimension, SensemakerStore } from "@neighbourhoods/client";

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

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    await this.fetchDimensionEntries()

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

  render() {
    return html`
      <nh-card .theme=${"light"} .title=${"Existing Input Dimensions"} .textSize=${"sm"}>
        <div class="content">
          ${
            typeof this._dimensionEntries == 'undefined' || this._dimensionEntries.length == 0
              ? "No dimensions available"
              : html`<div style="display:flex; flex-direction: column-reverse; gap: 8px;">${this._dimensionEntries.filter((dimension: Dimension) => !dimension.computed)
                                      .map((dimension: Dimension, dimensionIndex: number) => {
                                          return html`
                                            <nh-card 
                                              class="nested-card ${classMap({
                                                  selected: this._selectedInputDimensionIndex == dimensionIndex,
                                                })}" .theme=${"dark"}
                                              .title=${dimension.name}
                                              .textSize=${"sm"}
                                            >
                                              <h2>Range: </h2>
                                              ${`TODO: get range details`}
                                              ${typeof this._methodInputDimensions !== 'undefined' && this._methodInputDimensions.length 
                                                ? html`<h2>Methods using this dimension: </h2>
                                                  ${this._methodInputDimensions.map(({methodEh, name}) => {
                                                    return name == dimension.name
                                                      ? html`${generateHashHTML(methodEh)}`
                                                      : null
                                                  })}
                                                `
                                                :html`<h2>No methods for this dimension</h2>
                                                <nh-button .size=${"sm"} .variant=${"secondary"} @click=${() => this.dispatchEvent(new CustomEvent('request-method-create', { detail: {}}))}>Create Method</nh-button>
                                                <nh-button .size=${"sm"} .variant=${"success"} @click=${() => this._selectedInputDimensionIndex = dimensionIndex}>Select</nh-button>
                                                ` 
                                              }
                                              ${this._methodInputDimensions.map(({methodEh, name}) => {
                                                return name == dimension.name
                                                  ? html`${generateHashHTML(methodEh)}`
                                                  : null
                                              })}
                                            </nh-card>`
                                      })}</div>`
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