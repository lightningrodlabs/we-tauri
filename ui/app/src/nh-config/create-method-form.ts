import { NHButton, NHCard, NHComponent } from "@neighbourhoods/design-system-components";
import { html, css } from "lit";
import { Method, Program, SensemakerStore } from "@neighbourhoods/client";
import { property, query, state } from "lit/decorators.js";
import CreateDimension from "./create-dimension-form";
import { SlRadio, SlRadioGroup } from "@scoped-elements/shoelace";
import { EntryHash } from "@holochain/client";

export default class CreateMethod extends NHComponent {
  @property()
  sensemakerStore!: SensemakerStore;

  @property()
  inputRange!: Range;

  @state()
  computationMethod: "AVG" | "SUM" = "AVG";

  @state()
  _inputDimensionEhs: EntryHash[] = [];

  @state()
  _program: Program = {
    Average: null
  };
  @state()
  _method: Partial<Method> = {
    name: '',
    program: this._program,
    can_compute_live: false,
    requires_validation: false,
    input_dimension_ehs: [],
    output_dimension_eh: undefined,
  };
  
  @query('create-dimension')
  _dimensionForm;

  onChangeValue(e: CustomEvent) {
    const inputControl = (e.target as any);
    if(!inputControl.dataset.touched) inputControl.dataset.touched = "1";

    this.computationMethod = inputControl.value;
    this._program = this.computationMethod == "AVG" ? {
      Average: null
    } : {
      Sum: null
    };
    this._dimensionForm.requestUpdate()
  }

  render() {
    return html`
      <create-dimension
        .dimensionType=${"output"}
        .inputRange=${this.inputRange}
        .computationMethod=${this.computationMethod}
        .sensemakerStore=${this.sensemakerStore}
        @dimension-created=${async (e: CustomEvent) => {
          if(e.detail.dimensionType == "output") {
            this._method.output_dimension_eh = e.detail.dimensionEh;
            await this._dimensionForm.resetForm(); 
            await this._dimensionForm.requestUpdate();
          } else {
            this._inputDimensionEhs.push(e.detail.dimensionEh); // TEMP
            // TODO: (once an API change is made to sensemaker-lite to provide Wrapped<Dimension> from one of the zomes)
            // Move this code to the correct place on line 71 - and when a new dimension is selected dispatch an event with the same name.
          }
        }}
        @input-dimension-selected=${async (e: CustomEvent) => {

        }}
      >
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