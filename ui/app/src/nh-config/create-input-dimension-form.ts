import { NHBaseForm, NHButton, NHCard, NHTooltip, NHValidationError } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult } from "lit";
import { SlCheckbox, SlInput, SlRadio, SlRadioGroup } from "@scoped-elements/shoelace";
import { object, string, boolean, number, ObjectSchema } from 'yup';
import { Dimension, Range, RangeKind, SensemakerStore, RangeKindFloat, RangeKindInteger } from "@neighbourhoods/client";
import { property, state } from "lit/decorators.js";

const MIN_RANGE_INT = 0;
const MAX_RANGE_INT = 4294967295;
const MIN_RANGE_FLOAT = -Number.MAX_SAFE_INTEGER;
const MAX_RANGE_FLOAT = Number.MAX_SAFE_INTEGER;

export default class CreateDimension extends NHBaseForm {
  @property()
  sensemakerStore!: SensemakerStore;

  /* Concrete implementations of the abstract BaseForm interface */
  // Form schema
  protected get validationSchema() : ObjectSchema<any> { 
    return object({
    name: string().min(1, "Must be at least 1 characters").required(),
    computed: boolean().required(),
  })};
  
  // Form model
  @state()
  protected _model: Partial<Dimension> = { name: "", computed: false, range_eh: undefined };

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

  // Extra form state, not in the model
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

  @property()
  submitBtn!: NHButton;

  async resetForm() {
    super.reset();
    
    this._numberType = "Integer";
    //@ts-ignore
    this._dimensionRange = { name: "", kind: { [this._numberType as (keyof RangeKindInteger | keyof RangeKindFloat)]: {
      min: 0,
      max: 1,
    }} as (RangeKindInteger | RangeKindFloat) };
    this._useGlobalMin = false;
    this._useGlobalMax = false;
    

    this.submitBtn.loading = false;
    await this.submitBtn.updateComplete;
    await this.updateComplete
  }

  // Form submit handler
  async handleValidSubmit() {
      return await this.createEntries()
  }
  
  async createEntries() {
    this._dimensionRangeSchema().validate(this._dimensionRange.kind[this._numberType])
      .then(async _ => {
        this.submitBtn.loading = true; this.submitBtn.requestUpdate("loading");
        
        let rangeEh, dimensionEh;
        try {
          rangeEh = await this.sensemakerStore.createRange(this._dimensionRange);
        } catch (error) {
          console.log('Error creating new range for dimension: ', error);
        }

        if(!rangeEh) return
        this._model.range_eh = rangeEh;
        
        try {
          dimensionEh = await this.sensemakerStore.createDimension(this._model as Dimension);
        } catch (error) {
          console.log('Error creating new dimension: ', error);
        }

        if(!dimensionEh) return
        await this.updateComplete;
        this.dispatchEvent(
          new CustomEvent("dimension-created", {
            detail: { dimensionEh, dimensionType: "input", dimension: this._model },
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
      }).catch(e => console.log('Error validating new range for dimension: ', e))

  }

  handleInputChange(e: Event) {
    super.handleInputChange(e);
    
    // Change handler overloads
    const inputControl = (e.target as any);

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
    }
  }

  render() {
    return html`
        <form>
          <div class="field">
            <nh-tooltip .visible=${this.shouldShowValidationErrorForField('name')} .text=${this.getErrorMessage('name')}>
              <sl-input slot="hoverable" label="Dimension Name" size="medium" type="text" name="name" placeholder=${"Enter a dimension name"} required value=${this._model.name} @sl-input=${(e: CustomEvent) => this.handleInputChange(e)}></sl-input>
            </nh-tooltip>
            <label class="error" for="name" name="name">⁎</label>
          </div>  

          <div class="field" style="justify-content: center;">
            <sl-radio-group @sl-change=${(e: CustomEvent) => this.handleInputChange(e)} label=${"Select a number type"} data-name=${"number-type"} value=${this._numberType}>
              <sl-radio .checked=${this._numberType == "Integer"} value="Integer">Integer</sl-radio>
              <sl-radio .checked=${this._numberType == "Float"} value="Float">Float</sl-radio>
            </sl-radio-group>
          </div>
          <div class="field">
            <sl-input label="Range Minimum" name="min" ?disabled=${this._useGlobalMin} value=${this._dimensionRange.kind[this._numberType].min} @sl-change=${(e: CustomEvent) => this.handleInputChange(e)}></sl-input>
            <label class="error" for="min" name="min">⁎</label>
          </div>
          <div class="field checkbox">
            <label for="global-min" name="use-global-min">Lowest possible</label>
            <sl-checkbox name="use-global-min" .checked=${this._useGlobalMin} @sl-change=${(e: CustomEvent) => this.handleInputChange(e)}></sl-checkbox>
          </div>
          <div class="field">
            <sl-input label="Range Maximum" name="max" ?disabled=${this._useGlobalMax} value=${this._dimensionRange.kind[this._numberType].max}  @sl-change=${(e: CustomEvent) => this.handleInputChange(e)}></sl-input>
            <label class="error" for="max" name="max">⁎</label>
          </div>
          <div class="field checkbox">
            <label for="global-max" name="use-global-max">Highest possible</label>
            <sl-checkbox name="use-global-max" .checked=${this._useGlobalMax} @sl-change=${(e: CustomEvent) => this.handleInputChange(e)}></sl-checkbox>
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
    "nh-tooltip": NHTooltip,
    'nh-validation-error': NHValidationError,
  }

  static get styles() {
    return [
      ...super.styles as CSSResult[],
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

      sl-input.untouched::part(base), sl-input.untouched:hover::part(base) {
        margin: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-md));
        border: 2px solid var(--nh-theme-error-default, #E95C7B);
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
        height: 100%;
        align-items: center;
        padding: 0 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-error-default);
      }

      /* From test form */

      sl-input::part(base) {
        padding: calc(1px * var(--nh-spacing-sm));
        margin-bottom: calc(1px * var(--nh-spacing-sm));
        color: var(--nh-theme-fg-default);
      }

      .hidden {
        display: none;  
      }
    `
    ]
  }
}