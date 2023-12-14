import { AppInfo, DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { NHButton, NHCard, NHComponentShoelace } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult, PropertyValueMap } from "lit";
import {  weGroupContext } from "../context";
import { SlCheckbox, SlInput, SlRadio, SlRadioGroup, SlRange } from "@scoped-elements/shoelace";
import { object, string, boolean, number, TestFunction } from 'yup';
import { Dimension, Range, RangeKind, SensemakerStore, RangeKindFloat, RangeKindInteger } from "@neighbourhoods/client";
import { property, query, state } from "lit/decorators.js";
import { capitalize } from "../elements/components/helpers/functions";
import { EntryRecord } from "@holochain-open-dev/utils";

const MIN_RANGE_INT = 0;
const MAX_RANGE_INT = 4294967295;
const MIN_RANGE_FLOAT = -Number.MAX_SAFE_INTEGER;
const MAX_RANGE_FLOAT = Number.MAX_SAFE_INTEGER;

export default class CreateDimension extends NHComponentShoelace {
  @property()
  sensemakerStore!: SensemakerStore;
  
  @property()
  dimensionType!: "input" | "output";
  
  @state()
  valid: boolean = false;
  @state()
  touched: boolean = false;

  private _dimensionSchema = object({
    name: string().min(1, "Must be at least 1 characters").required(),
    computed: boolean().required(),
  });
  
  private _currentMinRange : number = 0;
  private _dimensionRangeSchema = () => {
    const rangeMin = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT
    const rangeMax = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT
    return object({
      min: (this._numberType == "Integer" 
          ? number().integer('Must be an integer') 
          : number().test('is-decimal', 'Must be a float', ((value: number) => value.toString().match(/^(\-)?\d+(\.\d+)?$/)) as any)
        )
        .min(rangeMin, "The lower extent of this range cannot be lower than " + rangeMin),
      max:(this._numberType == "Integer" 
          ? number().integer('Must be an integer') 
          : number().test('is-decimal', 'Must be a float', ((value: number) => value.toString().match(/^\d+(\.\d+)?$/)) as any)
        )
        .min(this._currentMinRange + 1, "The higher extent of this range cannot be lower than the lower extent: " + this._currentMinRange)
        .max(rangeMax, "The higher extent of this range cannot be higher than " + rangeMax),
    })};

  @property()
  private _numberType: (keyof RangeKindInteger | keyof RangeKindFloat) = "Integer";

  @state()
  private _useGlobalMin: boolean = false;
  @state()
  private _useGlobalMax: boolean = false;
  @state()
  private _dimensionRange: Range = { name: "", kind: { [this._numberType]: {
    min: 0,
    max: 1,
  }} as any };
  @state()
  private _dimension: Partial<Dimension> = { name: "", computed: this.dimensionType == "output", range_eh: undefined };

  @property()
  submitBtn!: NHButton;

  private resetInputErrorLabels(inputs: NodeListOf<any>) {
    inputs.forEach(input => {
      input.helpText = "";
      input.nextElementSibling.style.opacity = 0;
      input.nextElementSibling.style.visibility = 'hidden';
      if(input.disabled = true) input.disabled = false;
    });
  }

  private validateIfUntouched(inputs: NodeListOf<any>) {
    let existsUntouched = false;
    inputs.forEach((input) => {
      // Just validate text field for an input dimension as range will be calculated
      if(this.dimensionType == "output" && input.name !== "dimension-name") return

      if(input.dataset.touched !== "1" && input.required) {
        this.handleValidationError.call(this, { path: input.name, errors: ['untouched']})
        existsUntouched = true;
      }
    });
    this.touched = !existsUntouched;
    return existsUntouched
  }

  async resetForm() {
    this._dimension = { name: "", computed: this.dimensionType == "output", range_eh: undefined };
    this._numberType = "Integer";
    //@ts-ignore
    this._dimensionRange = { name: "", kind: { [this._numberType as (keyof RangeKindInteger | keyof RangeKindFloat)]: {
      min: 0,
      max: 1,
    }} as (RangeKindInteger | RangeKindFloat) };
    this._useGlobalMin = false;
    this._useGlobalMax = false;
    this.valid = false;
    this.touched = false;
    
    (this.renderRoot.querySelectorAll('sl-input') as any)?.forEach(input => {
      delete input.dataset.touched;
      if(input.disabled = true) input.disabled = false;
      input.requestUpdate();
    })    
    const checkboxes = this.renderRoot.querySelectorAll('sl-checkbox') as any;
    checkboxes?.length && checkboxes?.forEach(checkbox => {
      checkbox.checked = false;
      delete checkbox.dataset.touched;
    })

    this.submitBtn.loading = false;
    await this.updateComplete
  }

  private getSumComputationRange(min: number, max: number) : RangeKind {
    const rangeMin = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT
    const rangeMax = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT

    switch (true) {
      case (max <= min):
        throw new Error('Invalid RangeKind limits')
      case (min >=0):
        // range is [0, x], where x is positive the output range will be [0, INF].
        //@ts-ignore
        return { [this._numberType]: {
          min: 0,
          max: rangeMax,
        }} as RangeKind
      case (min < 0 && max > 0):
        // range is [x, y], where x is negative and y is positive the output range will be [-INF, INF].
        //@ts-ignore
        return { [this._numberType]: {
          min: rangeMin,
          max: rangeMax,
        }} as RangeKind
      default:
        // range is [x, 0], where x is negative the output range will be [-INF, 0].
        //@ts-ignore
        return { [this._numberType]: {
          min: rangeMin,
          max: 0,
        }} as RangeKind
    }
  }

  private computeOutputDimensionRange() {
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

  handleSubmit({validateOnly} = {validateOnly: false}) {
    const inputs = this.renderRoot.querySelectorAll("sl-input");
    this.resetInputErrorLabels(inputs);
    const fieldsUntouched = this.validateIfUntouched(inputs);
    if(fieldsUntouched) return;
    this._dimensionRangeSchema().validate(this._dimensionRange.kind[this._numberType])
      .catch((e) => {this.handleValidationError.call(this, e)})
      .then(async validRange => {
        if(validRange) {
          this._dimensionSchema.validate(this._dimension)
          .then(async _ => {
            this.valid = true;
            if(validateOnly) return;
            this.submitBtn.loading = true; this.submitBtn.requestUpdate("loading");
            const rangeRecord = await this.createRange();
            const rangeEh = new EntryRecord<Range>(rangeRecord).entryHash;
            if(!rangeEh) return
            
            this._dimension.range_eh = rangeEh;
            const dimensionEh = await this.createDimension()
            await this.updateComplete;
            this.dispatchEvent(
              new CustomEvent("dimension-created", {
                detail: { dimensionEh, dimensionType: this.dimensionType, dimension: this._dimension },
                bubbles: true,
                composed: true,
              })
            );
            this.dispatchEvent(
              new CustomEvent('form-submitted', {
                bubbles: true,
                composed: true,
              }),
            );
          })
          .catch((e) => {console.log('e :>> ', e);this.handleValidationError.call(this, e)})
        }
      })

  }

  private fetchValidationErrorText({ path, errors }: any) {
    if(errors && errors[0] == 'untouched') return path.split('-').map((word: string, i: number) => !i ? capitalize(word) : word ).join(' ') + " is required";
    return errors[0];
  }

  private handleValidationError(err: { path: string, errors: string[] }) {
    console.log("Error validating dimension for field: ", err.path);

    const errorDOM = this.renderRoot.querySelectorAll("label[name=" + err.path + "]")
    if(errorDOM.length == 0) return;
    errorDOM.forEach((errorLabel: any) => {
      errorLabel.style.visibility = 'visible';
      errorLabel.style.opacity = '1';
      
      const slInput : any = errorLabel.previousElementSibling;
      slInput.helpText = this.fetchValidationErrorText(err);
    })
  }

  private onChangeValue(e: CustomEvent) {
    const inputControl = (e.target as any);
    if(!inputControl.dataset.touched) inputControl.dataset.touched = "1";
    if(!this.touched) {this.touched = true};

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
      case 'use-global-min':
        this._useGlobalMin = !this._useGlobalMin
        this._dimensionRange.kind[this._numberType].min = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
        break;
      case 'use-global-max':
        this._useGlobalMax = !this._useGlobalMax
        this._dimensionRange.kind[this._numberType].max = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT
        break;
      case 'dimension-name':
        this._dimension['name'] = inputControl.value; 
        this._dimensionRange['name'] = inputControl.value + '-range'; 
        break;
      case 'number-type':
        this._numberType = inputControl.value as (keyof RangeKindInteger | keyof RangeKindFloat);
        //@ts-ignore
        this._dimensionRange.kind = { [this._numberType] : { ...Object.values(this._dimensionRange.kind)[0] } as RangeKind}; 
        if(this._useGlobalMin) {
          this._dimensionRange.kind[this._numberType].min = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
        }
        if(this._useGlobalMax) {
          this._dimensionRange.kind[this._numberType].max = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT;
        }
        break;
      default:
        this._dimension[inputControl.name] = inputControl.value; 
        break;
    }
  }
  // TODO: replace with SM method calls
  async createRange() {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
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
      if(typeof _changedProperties.get('inputRange') !== "undefined" || typeof _changedProperties.has('computationMethod') !== "undefined") {
        this.computeOutputDimensionRange()
      }
    } 
  }

  render() {
    return html`
        <form>
          <div class="field">
            <sl-input help-text=${this.dimensionType == "output" ? "Your dimension's range will be calculated automatically" : ""} label="Dimension Name" size="medium" type="text" name="dimension-name" placeholder=${"Enter a dimension name"} required  value=${this._dimension.name} @sl-input=${(e: CustomEvent) => this.onChangeValue(e)}></sl-input>
            <label class="error" for="dimension-name" name="dimension-name">⁎</label>
          </div>
          <div class="field" style="justify-content: center;">
            <sl-radio-group @sl-change=${(e: CustomEvent) => this.onChangeValue(e)} label=${"Select a number type"} data-name=${"number-type"} value=${this._numberType}>
              <sl-radio .checked=${this._numberType == "Integer"} value="Integer">Integer</sl-radio>
              <sl-radio .checked=${this._numberType == "Float"} value="Float">Float</sl-radio>
            </sl-radio-group>
          </div>
          <div class="field">
            <sl-input label="Range Minimum" name="min" ?disabled=${this._useGlobalMin} value=${this._dimensionRange.kind[this._numberType].min} @sl-change=${(e: CustomEvent) => this.onChangeValue(e)}></sl-input>
            <label class="error" for="min" name="min">⁎</label>
          </div>
          <div class="field checkbox">
            <label for="global-min" name="use-global-min">Lowest possible</label>
            <sl-checkbox name="use-global-min" .checked=${this._useGlobalMin} @sl-change=${(e: CustomEvent) => this.onChangeValue(e)}></sl-checkbox>
          </div>
          <div class="field">
            <sl-input label="Range Maximum" name="max" ?disabled=${this._useGlobalMax} value=${this._dimensionRange.kind[this._numberType].max} (e: CustomEvent) => this.onChangeValue(e)(e: CustomEvent) => this.onChangeValue(e)}></sl-input>
            <label class="error" for="max" name="max">⁎</label>
          </div>
          <div class="field checkbox">
            <label for="global-max" name="use-global-max">Highest possible</label>
            <sl-checkbox name="use-global-max" .checked=${this._useGlobalMax} @sl-change=${(e: CustomEvent) => this.onChangeValue(e)}></sl-checkbox>
          </div>
      </form>
    `;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    "sl-input": SlInput,
    "sl-radio": SlRadio,
    "sl-radio-group": SlRadioGroup,
    "sl-checkbox": SlCheckbox,
  }

  static get styles() {
    return [
      super.styles as CSSResult,
      css`
      /* Layout */
      :host {
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        margin: 0 auto;
      }

      .field, .field-row {
        display: flex;
        margin-bottom: calc(1px * var(--nh-spacing-md));
      }

      form {
        padding: 0;
        margin: calc(1px * var(--nh-spacing-md)) 0;
      }

      legend {
        visibility: hidden;
        opacity: 0;
        height: 0;
      }

      /* Fields */
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

      sl-radio::part(control) {
        color: var(--nh-theme-accent-default);
        border-color: var(--nh-theme-accent-default);
        background-color: transparent;
      }
      sl-checkbox::part(control) {
        color: var(--nh-theme-accent-default);
        background-color: var(--nh-theme-fg-default);
        border-color: var(--nh-theme-accent-default);
      }

      sl-input::part(base) {
        margin: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-md));
        padding: 0;
      }

      sl-input::part(form-control) {
        display: grid;
        grid: auto / var(--label-width) 1fr;
        gap: var(--sl-spacing-3x-small) var(--gap-width);
        align-items: center;
      }

      .field.checkbox {
        justify-content: end;
        gap: 1rem;
      }

      /* Labels */

      sl-input::part(help-text) {
        margin: 0 1rem 1rem;
      }
      
      sl-input::part(label) {
        margin: 0 calc(1px * var(--nh-spacing-md));
      }

      :host *::part(form-control-label) {
        color: red;
      }

      label.error {
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