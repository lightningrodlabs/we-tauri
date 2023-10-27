import { NHButton, NHCard, NHComponent } from "@neighbourhoods/design-system-components";
import { html, css } from "lit";
import { SensemakerStore } from "@neighbourhoods/client";
import { property, query, state } from "lit/decorators.js";
import CreateDimension from "./create-dimension-form";
import { SlRadio, SlRadioGroup } from "@scoped-elements/shoelace";

export default class CreateMethod extends NHComponent {
  @property()
  sensemakerStore!: SensemakerStore;

  @property()
  inputRange!: Range;

  @state()
  computationMethod: "AVG" | "SUM" = "AVG";
  
  @query('create-dimension')
  _dimensionForm;

  onChangeValue(e: CustomEvent) {
    const inputControl = (e.target as any);
    if(!inputControl.dataset.touched) inputControl.dataset.touched = "1";
    this.computationMethod = inputControl.value;
    this._dimensionForm.requestUpdate()
  }

  render() {
    return html`
      <create-dimension .dimensionType=${"output"} .inputRange=${this.inputRange} .computationMethod=${this.computationMethod} .sensemakerStore=${this.sensemakerStore}>
        <div class="field" slot="method-computation">
          <nh-card class="nested-card" slot="submit-action" .theme=${"light"} .textSize=${"sm"} .heading=${"Select:"}>
            <sl-radio-group @sl-change=${(e: any) => this.onChangeValue(e)} class="field-row" label="Select an option" name="method" value="AVG">
              <sl-radio value="AVG">AVG</sl-radio>
              <sl-radio value="SUM">SUM</sl-radio>
            </sl-radio-group>
          </nh-card>
        </div>

        <nh-button
          slot="submit-action"
          .size=${"auto"}
          .variant=${"primary"}
          @click=${async () => {await this._dimensionForm.onSubmit()}}
          .disabled=${false}
          .loading=${false}
        >Create Method</nh-button>
      </create-dimension>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    'create-dimension': CreateDimension,
    'sl-radio': SlRadio,
    'sl-radio-group': SlRadioGroup,
  }

  static get styles() {
    return css`
      :host {
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default); 
      }

      fieldset {
        border: none;
        flex-direction: column;
      }

      sl-radio-group::part(base) {
        display: flex;
        justify-content: space-evenly;
        align-items: center;
      }
      
      sl-radio::part(base) {
        color: white;
      }
      
    `;
  }
}