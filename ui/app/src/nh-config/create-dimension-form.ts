import { AppInfo, DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { NHButton, NHCard, NHComponentShoelace } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult, PropertyValueMap } from "lit";
import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { SlInput, SlRadio, SlRadioGroup, SlRange } from "@scoped-elements/shoelace";
import { object, string, boolean, number, TestFunction } from 'yup';
import { Dimension, Range, RangeKind, SensemakerStore, RangeKindFloat, RangeKindInteger } from "@neighbourhoods/client";
import { property, query, state } from "lit/decorators.js";
import { capitalize } from "../elements/components/helpers/functions";

const MIN_RANGE_INT = 0;
const MAX_RANGE_INT = 4294967295;
const MIN_RANGE_FLOAT = -Number.MAX_SAFE_INTEGER;
const MAX_RANGE_FLOAT = Number.MAX_SAFE_INTEGER;

export default class CreateDimension extends NHComponentShoelace {
  @property()
  sensemakerStore!: SensemakerStore;
  
  @property()
  dimensionType!: "input" | "output";
  
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _dimensionSchema = object({
    name: string().min(1, "Must be at least 1 characters").required(),
    computed: boolean().required(),
  });
  
  _currentMinRange : number = 0;
  _dimensionRangeSchema = () => {
    const rangeMin = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT
    const rangeMax = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT
    return object({
      min: (this._numberType == "Integer" 
          ? number().integer('Must be an integer') 
          : number().test('is-decimal', 'Must be a float', ((value: number) => value.toString().match(/^\d+(\.\d+)?$/)) as any)
        )
        .min(rangeMin, "The lower extent of this range cannot be lower than " + rangeMin)
        .required(),
      max:(this._numberType == "Integer" 
          ? number().integer('Must be an integer') 
          : number().test('is-decimal', 'Must be a float', ((value: number) => value.toString().match(/^\d+(\.\d+)?$/)) as any)
        )
        .min(this._currentMinRange + 1, "The higher extent of this range cannot be lower than the lower extent: " + this._currentMinRange)
        .max(rangeMax, "The higher extent of this range cannot be higher than " + rangeMax),
    })};
  @property() // Only needed when an output dimension range is being computed
  inputRange!: Range & { range_eh: EntryHash }
  @property() // Only needed when an output dimension range is being computed
  computationMethod!: "AVG" | "SUM";

  @property()
  _numberType: (keyof RangeKindInteger | keyof RangeKindFloat) = "Integer";

  @state()
  _dimensionRange: Range = { name: "", kind: { [this._numberType]: {
    min: 0,
    max: 1,
  }} as any };
  @state()
  _dimension: Partial<Dimension> = { name: "", computed: this.dimensionType == "output", range_eh: undefined };

  @query("nh-button")
  submitBtn!: NHButton;

  resetInputErrorLabels(inputs: NodeListOf<any>) {
    inputs.forEach(input => {
      input.helpText = "";
      input.nextElementSibling.style.opacity = 0;
      input.nextElementSibling.style.visibility = 'hidden';
    });
  }

  validateIfUntouched(inputs: NodeListOf<any>) {
    let existsUntouched = false;
    inputs.forEach((input) => {
      // Just validate text field for an input dimension as range will be calculated
      if(this.dimensionType == "output" && input.name !== "dimension-name") return

      if(input.dataset.touched !== "1" && input.required) {
        this.handleValidationError.call(this, { path: input.name, errors: ['untouched']})
        existsUntouched = true;
      }
    });
    return existsUntouched
  }

  async resetForm() {
    this._dimension = { name: "", computed: false, range_eh: undefined };
    //@ts-ignore
    this._dimensionRange = { name: "", kind: { [this._numberType as (keyof RangeKindInteger | keyof RangeKindFloat)]: {
      min: 0,
      max: 0,
    }} as (RangeKindInteger | RangeKindFloat) };
    (this.renderRoot.querySelector('sl-input') as any).value = '';
    delete (this.renderRoot.querySelector('sl-input') as any).dataset.touched;
    
    (this.renderRoot.querySelectorAll('sl-range') as any).forEach(range => {
      range.value = 0;
      delete range.dataset.touched;
    })

    this.submitBtn.loading = false;
    await this.updateComplete
  }

  getSumComputationRange(min: number, max: number) : RangeKind {
    const rangeMin = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT
    const rangeMax = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT

    switch (true) {
      case (max <= min):
        throw new Error('Invalid RangeKind limits')
      case (min >=0):
        // range is [0, x], where x is a positive integer the output range will be [0, INF].
        //@ts-ignore
        return { [this._numberType]: {
          min: 0,
          max: rangeMax,
        }} as RangeKind
      case (min < 0 && max > 0):
        // range is [x, RangeKindy], where x is a negative integer and y is a positive integer the output range will be [-INF, INF].
        //@ts-ignore
        return { [this._numberType]: {
          min: rangeMin,
          max: rangeMax,
        }} as RangeKind
      default:
        // range is [x, 0], where x is a negative integer the output range will be [-INF, 0].
        //@ts-ignore
        return { [this._numberType]: {
          min: rangeMin,
          max: 0,
        }} as RangeKind
    }
  }

  computeOutputDimensionRange() {
    if(!this.inputRange) return;
    if(this.computationMethod === "SUM") {
      const rangeKindLimits = Object.values(this.inputRange.kind)[0];
      const {min, max} = rangeKindLimits;
      try {
        this._dimensionRange = { name: this._dimensionRange.name, kind: this.getSumComputationRange(min, max) };
        this._dimension.range_eh = undefined
      } catch (error) {
        console.log("Error calculating output range: ", error)
      }
      return
    }
    // Else it is AVG...
    this._dimensionRange = { name: this.inputRange.name, kind: this.inputRange.kind }
    this._dimension.range_eh = this.inputRange.range_eh
  }

  disable() {
    const inputs = this.renderRoot.querySelectorAll("sl-input");
    inputs.forEach(input => {
      input.disabled = true;
    });
  }

  onSubmit() {
    const inputs = this.renderRoot.querySelectorAll("sl-input, sl-range");
    this.resetInputErrorLabels(inputs);
    const fieldsUntouched = this.validateIfUntouched(inputs);
    if(fieldsUntouched) return;

    this._dimensionRangeSchema().validate(this._dimensionRange.kind[this._numberType])
      .catch((e) => {this.handleValidationError.call(this, e)})
      .then(async validRange => {
        if(validRange) {
          this._dimensionSchema.validate(this._dimension)
          .then(async _ => {
            this.submitBtn.loading = true; this.submitBtn.requestUpdate("loading");
            const rangeEh = await this.createRange();
            if(!rangeEh) return
            console.log('this._dimensionRange :>> ', this._dimensionRange);
            this._dimension.range_eh = rangeEh;
            const dimensionEh = await this.createDimension()
            this.dispatchEvent(
              new CustomEvent("dimension-created", {
                detail: { dimensionEh, dimensionType: this.dimensionType, dimension: this._dimension },
                bubbles: true,
                composed: true,
              })
            );
          })
          .catch(this.handleValidationError.bind(this))
        }
      })

  }

  fetchValidationErrorText({ path, errors }: any) {
    if(errors && errors[0] == 'untouched') return path.split('-').map((word: string, i: number) => !i ? capitalize(word) : word ).join(' ') + " is required";
    return errors[0];
  }

  handleValidationError(err: { path: string, errors: string[] }) {
    console.log("Error validating profile for field: ", err.path);

    const errorDOM = this.renderRoot.querySelectorAll("label[name=" + err.path + "]")
    if(errorDOM.length == 0) return;
    errorDOM.forEach((errorLabel: any) => {
      errorLabel.style.visibility = 'visible';
      errorLabel.style.opacity = '1';
      
      const slInput : any = errorLabel.previousElementSibling;
      slInput.helpText = this.fetchValidationErrorText(err);
    })
  }

  onChangeValue(e: CustomEvent) {
    const inputControl = (e.target as any);
    if(!inputControl.dataset.touched) inputControl.dataset.touched = "1";
    
    switch (inputControl?.name || inputControl.parentElement.dataset?.name) {
      case 'min':
        const newMin = Number(inputControl.value);
        this._currentMinRange = newMin;
        this._dimensionRange.kind[this._numberType].min = newMin;
        break;
      case 'max':
        const newMax = Number(inputControl.value);
        this._dimensionRange.kind[this._numberType].max = newMax;
        break;
      case 'dimension-name':
        this._dimension['name'] = inputControl.value; 
        this._dimensionRange['name'] = inputControl.value + '-range'; 
        break;
      case 'number-type':
        this._numberType = inputControl.value as (keyof RangeKindInteger | keyof RangeKindFloat);
        //@ts-ignore
        this._dimensionRange.kind = { [this._numberType] : { ...Object.values(this._dimensionRange.kind)[0] } as RangeKind}; 
        this.requestUpdate()
        break;
      default:
        this._dimension[inputControl.name] = inputControl.value; 
        break;
    }
  }
  
  async createRange() {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
      console.log('this._dimensionRange :>> ', this._dimensionRange);
      const response = await this.sensemakerStore.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'create_range',
        payload:  this._dimensionRange,
      });
      return response
    } catch (error) {
      console.log('Error creating new range for dimension: ', error);
    }
  }
  
  async createDimension() {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
      const response = await this.sensemakerStore.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'create_dimension',
        payload: this._dimension,
      });
      return response;
    } catch (error) {
      console.log('Error creating new dimension: ', error);
    }
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    this._dimension.computed = (this.dimensionType == "output");
  }
  
  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(this.dimensionType == "output" && (_changedProperties.has('inputRange') || _changedProperties.has('computationMethod') )) {
      if(typeof this.computationMethod !== "undefined") {
        this.computeOutputDimensionRange()
      }
    } 
  }

  render() {
    return html`
      <nh-card .theme=${"dark"} .title=${"Create an " + this.dimensionType + " Dimension"} .textSize=${"md"}>
        <form>
            <div class="field">
              <sl-input label="Dimension Name" size="medium" type="text" name="dimension-name" placeholder=${"Enter a dimension name"} required  value=${this._dimension.name} @sl-input=${(e: CustomEvent) => this.onChangeValue(e)}></sl-input>
              <label class="error" for="dimension-name" name="dimension-name">⁎</label>
            </div>
            <div class="field" style="justify-content: center;">
              <sl-radio-group @sl-change=${(e: CustomEvent) => this.onChangeValue(e)} label=${"Select a number type"} data-name=${"number-type"} value=${this._numberType}>
                <sl-radio .checked=${this._numberType == "Integer"} value="Integer">Integer</sl-radio>
                <sl-radio .checked=${this._numberType == "Float"} value="Float">Float</sl-radio>
              </sl-radio-group>
              <label class="error" for="method" name="method" data-name="method">⁎</label>
            </div>
          ${this.dimensionType == "input"
            ? html`
              <div class="field">
                <sl-input label="Range Minimum" name="min" value=${this._dimensionRange.kind[this._numberType].min} @sl-change=${(e: CustomEvent) => this.onChangeValue(e)}></sl-input>
                <label class="error" for="min" name="min">⁎</label>
              </div>
              <div class="field">
                <sl-input label="Range Maximum" name="max" required value=${this._dimensionRange.kind[this._numberType].max} @sl-change=${(e: CustomEvent) => this.onChangeValue(e)}></sl-input>
                <label class="error" for="max" name="max">⁎</label>
              </div>`
            : null
          }
          <slot name="method-computation"></slot>
        </form>
        <slot name="submit-action" slot="footer">
          <nh-button
            .size=${"auto"}
            .variant=${"primary"}
            @click=${() => this.onSubmit()}
            .disabled=${false}
            .loading=${false}
          >Create Dimension</nh-button>
        </slot>
      </nh-card>  
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    "sl-input": SlInput,
    "sl-radio": SlRadio,
    "sl-radio-group": SlRadioGroup,
  }

  static get styles() {
    return [
      super.styles as CSSResult,
      css`
      :host {
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default); 
      }

      /* Layout */
      .field, .field-row {
        display: flex;
        margin-bottom: calc(1px * var(--nh-spacing-md));
      }

      form {
        padding: 0;
      }

      legend {
        visibility: hidden;
        opacity: 0;
        height: 0;
      }

      .field-row {
        justify-content: space-between;
        align-items: center;
      }

      sl-radio-group::part(base) {
        display: flex;
        gap: calc(1px * var(--nh-spacing-md));
      }
      
      sl-radio::part(label) {
        color: var(--nh-theme-fg-default);
      }

      sl-input::part(base) {
        margin: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-md));
        padding: 0;
      }
      sl-input::part(label) {
        margin: 0 calc(1px * var(--nh-spacing-md));
      }
      sl-input::part(help-text) {
        margin: 0 1rem 1rem;
      }
      form {
        margin: calc(1px * var(--nh-spacing-md)) 0;
      }
      
      sl-input::part(form-control) {
        display: grid;
        grid: auto / var(--label-width) 1fr;
        gap: var(--sl-spacing-3x-small) var(--gap-width);
        align-items: center;
      }

      :host *::part(form-control-label) {
        color: red;
      }

      label.error {
        visibility: hidden;
        opacity: 0;
        align-items: center;
        padding: 0 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-error-default); 
      }
    `
    ]
  }
}