import { html, css, PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";

import { EntryHash } from "@holochain/client";
import { ResourceDef, SensemakerStore } from "@neighbourhoods/client";

import { NHButton, NHCard, NHComponent } from "@neighbourhoods/design-system-components";

export default class ResourceDefList extends NHComponent {  
  @property()
  sensemakerStore!: SensemakerStore;

  @state()
  private _resourceDefEntries!: Array<ResourceDef & { resource_def_eh: EntryHash }>;
  
  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    const result = await this.sensemakerStore.getResourceDefs()
    console.log('result :>> ', result);
    // this._resourceDefEntries = result;
  }
  
  render() {
    return html`
      <div class="content">
      </div>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard
  }

  static get styles() {
    return css`
      .content{
        width: 100%;
      }
    `;
  }
}