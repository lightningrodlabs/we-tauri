import { html, css, PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";

import { ResourceDef, SensemakerStore } from "@neighbourhoods/client";

import { NHButton, NHCard, NHCardList, NHComponent } from "@neighbourhoods/design-system-components";
import { decodeHashFromBase64 } from "@holochain/client";
import { NHButtonGroup } from "@neighbourhoods/design-system-components";
import { b64images } from "@neighbourhoods/design-system-styles";

export default class ResourceDefList extends NHComponent {  
  @property()
  sensemakerStore!: SensemakerStore;

  @state()
  private _resourceDefEntries: Array<ResourceDef> = [ {
    "resource_name": "Feed Post",
    "base_types": [],
    "dimension_ehs": [decodeHashFromBase64('amockhash')],
    "installed_app_id": "test_provider",
    "role_name": "test_provider_dna",
    "zome_name": "provider",
  },{
    "resource_name": "Todo Item",
    "base_types": [],
    "dimension_ehs": [decodeHashFromBase64('amockhash')],
    "installed_app_id": "test_provider",
    "role_name": "test_provider_dna",
    "zome_name": "provider",
  },{
    "resource_name": "Photo",
    "base_types": [],
    "dimension_ehs": [decodeHashFromBase64('amockhash')],
    "installed_app_id": "test_provider",
    "role_name": "test_provider_dna",
    "zome_name": "provider",
  },{
    "resource_name": "Article",
    "base_types": [],
    "dimension_ehs": [decodeHashFromBase64('amockhash')],
    "installed_app_id": "test_provider",
    "role_name": "test_provider_dna",
    "zome_name": "provider",
  },
  ];
  
  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    const result = await this.sensemakerStore.getResourceDefs()
    console.log('result :>> ', result);
    // this._resourceDefEntries = result;
  }
  
  render() {
    return html`
      <nh-button-group class="content"  .direction=${"vertical"}
      .fixedFirstItem=${true}
      .addItemButton=${true}>
        <nh-card-list
          class="nested"
          slot="buttons"
          .type=${"linear"}
          .direction=${"vertical"}
        >
          ${
            this._resourceDefEntries.map((resourceDef: ResourceDef) => html`
              <nh-card
                class="tight button"
                .theme=${'dark'}
                .textSize=${"md"}
                .hasPrimaryAction=${false}
                .heading=${resourceDef['resource_name']}
                .subheading=${"Used in " + resourceDef['resource_name']}
              >
              </nh-card>
            `)
          }
        </nh-card-list>
        <nh-button
          variant=${"primary"}
          iconImageB64=${b64images.icons.plus}
          size=${"icon"}
          slot="actions"
        ></nh-button>
      </nh-button-group>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-button-group": NHButtonGroup,
    "nh-card": NHCard,
    "nh-card-list": NHCardList
  }

  static get styles() {
    return css`
      .content{
        width: 100%;
      }
    `;
  }
}