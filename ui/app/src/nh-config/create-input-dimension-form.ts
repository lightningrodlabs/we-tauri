import { NHBaseForm, NHButton, NHCard, NHTextInput, NHTooltip, NHValidationError } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult } from "lit";
import { SlCheckbox, SlInput, SlRadio, SlRadioGroup } from "@scoped-elements/shoelace";
import { object, string, number, ObjectSchema } from 'yup';
import { Dimension, Range, RangeKind, SensemakerStore, RangeKindFloat, RangeKindInteger } from "@neighbourhoods/client";
import { property, query, state } from "lit/decorators.js";
import { MAX_RANGE_FLOAT, MAX_RANGE_INT, MIN_RANGE_FLOAT, MIN_RANGE_INT } from ".";

export default class CreateDimension extends NHBaseForm {
  @property()
  sensemakerStore!: SensemakerStore;

  /* Concrete implementations of the abstract BaseForm interface */  
  // Form model
  @state()
  protected _model = { 
    // This form's model is for two zome calls (Range and Dimension), but keep it in a flat structure for now
    // Dimension:
    name: "",
    range_eh: undefined,
    // Range:
    min: undefined as number | undefined,
    max: undefined as number | undefined,
  };

  // Helper to generate nested, dynamic schema for the Range
  private _dimensionRangeSchema = () => {
    const rangeMin = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT
    const rangeMax = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT
    const numberType = number().typeError('The input must be numeric').required('Enter a number');
    return {
      min: (this._numberType == "Integer" 
          ? numberType.integer('Must be an integer') 
          : numberType.test('is-decimal', 'Must be a decimal number', ((value: number) => value.toString().match(/^(\-)?\d+(\.\d+)?$/)) as any)
        )
        .min(rangeMin, "The lower extent of this range cannot be lower than " + rangeMin),
      max:(this._numberType == "Integer" 
          ? numberType.integer('Must be an integer') 
          : numberType.test('is-decimal', 'Must be a decimal number', ((value: number) => value.toString().match(/^\d+(\.\d+)?$/)) as any)
        )
        .min((this._model?.min || - 1) + 1, "The higher extent of this range cannot be lower than the lower extent: " + this._model.min)
        .max(rangeMax, "The higher extent of this range cannot be higher than " + rangeMax),
  }};

  // Full concrete implementation of form schema
  protected get validationSchema() : ObjectSchema<any> { 
    return object({
    name: string().min(1, "Must be at least 1 characters").required("Enter a dimension name, e.g. Likes"),
    ...this._dimensionRangeSchema()
  })};

  // Extra form state, not in the model
  @property()
  private _numberType: (keyof RangeKindInteger | keyof RangeKindFloat) = "Integer";
  @state()
  private _useGlobalMin: boolean = false;
  @state()
  private _useGlobalMax: boolean = false;

  @property()
  submitBtn!: NHButton;
  @query("nh-text-input[name='min']")
  _minInput!: NHTextInput;
  @query("nh-text-input[name='max']")
  _maxInput!: NHTextInput;

  // Form submit handler
  async handleValidSubmit() {
    this.submitBtn.loading = true;
    this.submitBtn.requestUpdate("loading");

    return await this.createEntries()
  }
  
  async createEntries() {
    let rangeEh, dimensionEh;    
    let inputRange: Range = {
      name: this._model.name + '_range',
      //@ts-ignore
      kind: { [this._numberType]: {
        min: this._model.min,
        max: this._model.max
        }
      }
    }
    try {
      rangeEh = await this.sensemakerStore.createRange(inputRange);
    } catch (error) {
      console.log('Error creating new range for dimension: ', error);
    }
    if(!rangeEh) return
    
    let inputDimension: Dimension = {
      name: this._model.name,
      computed: false, // Hard coded for input dimensions
      range_eh: rangeEh
    }
    try {
      dimensionEh = await this.sensemakerStore.createDimension(inputDimension);
    } catch (error) {
      console.log('Error creating new dimension: ', error);
    }
    if(!dimensionEh) return

    await this.updateComplete;
    this.dispatchEvent(
      new CustomEvent("dimension-created", {
        detail: { dimensionEh, dimensionType: "input", dimension: inputDimension },
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
  }

  handleInputChange(e: Event) {
    super.handleInputChange(e);
    
    // Change handler overloads
    const inputControl = (e.target as any);

    switch (inputControl?.name || inputControl.parentElement.dataset?.name) {
      case 'min':
        this._model.min = Number(inputControl.value); 
        break;
      case 'max':
        this._model.max = Number(inputControl.value);
        break;
      case 'use-global-min':
        this._useGlobalMin = !this._useGlobalMin
        this._model.min = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
        this.validateForm()
        this._minInput?.requestUpdate()
        break;
      case 'use-global-max':
        this._useGlobalMax = !this._useGlobalMax
        this._model.max = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT
        this.validateForm()
        this._maxInput?.requestUpdate()
        break;
      case 'number-type':
        this._numberType = inputControl.value as (keyof RangeKindInteger | keyof RangeKindFloat);
        //@ts-ignore
        if(this._useGlobalMin) {
          this._model.min = this._numberType == "Integer" ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
        }
        if(this._useGlobalMax) {
          this._model.max = this._numberType == "Integer" ? MAX_RANGE_INT : MAX_RANGE_FLOAT;
        }
        break;
    }
  }

  async resetForm() {
    super.reset();
    
    this._numberType = "Integer";
    this._useGlobalMin = false;
    this._useGlobalMax = false;
    
    this.submitBtn.loading = false;
    await this.submitBtn.updateComplete;
    await this.updateComplete
  }

  render() {
    return html`
        <form method="post" action="" autoComplete="off">
          <nh-tooltip .visible=${this.shouldShowValidationErrorForField('name')} .text=${this.getErrorMessage('name')} .variant=${"danger"}>
            <nh-text-input
              .errored=${this.shouldShowValidationErrorForField('name')}
              .size=${"medium"}
              slot="hoverable"
              .label=${"Dimension Name"}
              .name=${"name"}
              .placeholder=${"Enter a dimension name"}
              .required=${true}
              .value=${this._model.name}
              @change=${(e: CustomEvent) => this.handleInputChange(e)}
            ></nh-text-input>
          </nh-tooltip>

          <div class="field radio">
            <sl-radio-group @sl-change=${(e: CustomEvent) => this.handleInputChange(e)} label=${"Select a number type"} data-name=${"number-type"} value=${this._numberType}>
              <sl-radio .checked=${this._numberType == "Integer"} value="Integer">Integer</sl-radio>
              <sl-radio .checked=${this._numberType == "Float"} value="Float">Float</sl-radio>
            </sl-radio-group>
          </div>
          
        <div class="row-2">
          <div class="field">
            <nh-tooltip class="extend" .visible=${this.shouldShowValidationErrorForField('min')} .text=${this.getErrorMessage('min')} .variant=${"danger"}>
              <nh-text-input
                .errored=${this.shouldShowValidationErrorForField('min')}
                .size=${"small"}
                slot="hoverable"
                .label=${"Min"}
                .required=${true}
                .placeholder=${"Min"}
                .name=${"min"}
                .disabled=${this._useGlobalMin}
                .value=${this._model.min}
                @change=${(e: CustomEvent) => this.handleInputChange(e)}>
              </nh-text--input>
            </nh-tooltip>
            <div class="field checkbox">
              <label for="global-min" name="use-global-min">Lowest possible</label>
              <sl-checkbox name="use-global-min" .checked=${this._useGlobalMin} @sl-change=${(e: CustomEvent) => this.handleInputChange(e)}></sl-checkbox>
            </div>
          </div>
          <div class="field">
            <nh-tooltip class="extend" .visible=${this.shouldShowValidationErrorForField('max')} .text=${this.getErrorMessage('max')} .variant=${"danger"}>
              <nh-text-input
                .errored=${this.shouldShowValidationErrorForField('max')}
                .size=${"small"}
                slot="hoverable"
                .label=${"Max"}
                .required=${true}
                .placeholder=${"Max"}
                .name=${"max"}
                .disabled=${this._useGlobalMax}
                .value=${this._model.max}
                @change=${(e: CustomEvent) => this.handleInputChange(e)}>
              </nh-text--input>
            </nh-tooltip>
            <div class="field checkbox">
              <label for="global-max" name="use-global-max">Highest possible</label>
              <sl-checkbox name="use-global-max" .checked=${this._useGlobalMax} @sl-change=${(e: CustomEvent) => this.handleInputChange(e)}></sl-checkbox>
            </div>
          </div>
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
    "nh-text-input": NHTextInput,
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

        form {
          padding: 0;
          margin: calc(1px * var(--nh-spacing-md)) 0 calc(1px * var(--nh-spacing-xl)) 0;
        }

        .row-2 {
          display: flex;
          justify-content:space-between;
          align-items: center;
          flex-wrap: wrap;
        }
        .row-2:last-child {
          padding-bottom: calc(1px * var(--nh-spacing-md));
        }

        .field {
          display: flex;
          margin-top: calc(1px * var(--nh-spacing-sm));
          padding-top: calc(1px * var(--nh-spacing-md));
        }

        .row-2 .field {
          flex-basis: 50%;
          margin: 0;
          flex-direction: column;
        }
        .row-2 .field:first-child {
          align-items: flex-start;
        }
        .row-2 .field:last-child {
          align-items: flex-end;
        }

        /* Radio */

        .field.radio {
          justify-content: center;  
          padding-top: calc(1px * var(--nh-spacing-md));
          margin-top: calc(1px * var(--nh-spacing-lg));
        }

        sl-radio-group, sl-radio-group::part(base) {
          width: 100%;
        }
          
        sl-radio-group::part(base) {
          display: flex;
          justify-content: space-around;
          gap: calc(1px * var(--nh-spacing-md));
        }

        sl-radio:hover::part(control) {
          background-color: var(--nh-theme-bg-detail); 
        }

        sl-radio::part(label) {
          color: var(--nh-theme-fg-default);
        }

        sl-radio::part(control) {
          color: var(--nh-theme-accent-default);
          border-color: var(--nh-theme-accent-default);
          background-color: transparent;
        }

        sl-radio {
          margin-bottom: 0 !important;
        }

        /* Checkbox */

        sl-checkbox::part(base) {
          position: relative;
          right: -9px;
          bottom: 1px
        }

        sl-checkbox::part(control) {
          color: var(--nh-theme-accent-default);
          background-color: var(--nh-theme-fg-default);
          border-color: var(--nh-theme-accent-default);
          border-radius: 3px;
        }

        .field.checkbox {
          justify-content: end;
          display: flex;
          width: 8rem;
          font-size: 90%;
          flex-direction: initial;
        }
    `
    ]
  }
}