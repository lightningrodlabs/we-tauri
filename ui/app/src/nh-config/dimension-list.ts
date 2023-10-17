import { html, css, PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";

import { AppInfo } from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { Dimension, SensemakerStore } from "@neighbourhoods/client";

import { NHButton, NHCard, NHComponent } from "@neighbourhoods/design-system-components";
import MethodListForDimension from "./method-list";

export default class DimensionList extends NHComponent {  
  @property()
  sensemakerStore!: SensemakerStore;

  @state()
  private _dimensionEntries!: Dimension[];

  async fetchSelectedDimensionEntries() {
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
    await this.fetchSelectedDimensionEntries()
    console.log('this._dimensionEntries :>> ', this._dimensionEntries);
  }

  render() {
    return html`
      <nh-card .theme=${"light"} .title=${"Existing Dimensions"} .textSize=${"sm"}>
        <div class="content">
          ${
            typeof this._dimensionEntries == 'undefined' || this._dimensionEntries.length == 0
              ? "No dimensions available"
              : this._dimensionEntries.map((dimension: Dimension) => {
                  return html`Dimension`
              })
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
    `;
  }
}