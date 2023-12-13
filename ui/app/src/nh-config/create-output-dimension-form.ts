import { AppInfo, DnaHash, EntryHash, EntryHashB64, encodeHashToBase64 } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { NHButton, NHCard, NHBaseForm } from '@neighbourhoods/design-system-components';
import { html, css, CSSResult, PropertyValueMap } from 'lit';
import { weGroupContext } from '../context';
import { SlCheckbox, SlInput, SlRadio, SlRadioGroup, SlRange } from '@scoped-elements/shoelace';
import { object, string, boolean, number, TestFunction, ObjectSchema, array } from 'yup';
import {
  Dimension,
  Range,
  RangeKind,
  SensemakerStore,
  RangeKindFloat,
  RangeKindInteger,
} from '@neighbourhoods/client';
import { property, query, state } from 'lit/decorators.js';
import { capitalize } from '../elements/components/helpers/functions';

const DEFAULT_RANGE_MIN = 0;
const MIN_RANGE_INT = 0;
const MAX_RANGE_INT = 4294967295;
const MIN_RANGE_FLOAT = -Number.MAX_SAFE_INTEGER;
const MAX_RANGE_FLOAT = Number.MAX_SAFE_INTEGER;

export default class CreateOutputDimensionMethod extends NHBaseForm {
  @property()
  sensemakerStore!: SensemakerStore;

  // Needed for input dimension selection:
  @property()
  private inputDimensions!: Array<Dimension & { dimension_eh: EntryHash }>;
  @property()
  private inputDimensionRanges!: Array<Range & { range_eh: EntryHash }>;

  // Helper to assign input dimension/range after selection
  private getInputDimensionAndRangeForOutput(dimensionEh: EntryHashB64) {
    // Find the new range so that output dimension range can be calculated
    const inputDimension = this.inputDimensions.find(
      (dimension: Dimension & { dimension_eh: EntryHash }) =>
        encodeHashToBase64(dimension.dimension_eh) === dimensionEh,
    );
    const inputRange = this.inputDimensionRanges.find(
      (range: Range & { range_eh: EntryHash }) =>
        encodeHashToBase64(range.range_eh) === encodeHashToBase64(inputDimension!.range_eh),
    ) as Range & { range_eh: EntryHash };
    return { inputDimension, inputRange };
  }

  // Range will need to be calculated or created, depending on form input
  // ...so keep it in state
  @property()
  inputRange!: Range & { range_eh: EntryHash };
  @property()
  private _rangeNumberType: keyof RangeKindInteger | keyof RangeKindFloat = 'Integer';
  @state()
  private _dimensionRange: Range = {
    name: '',
    kind: {
      [this._rangeNumberType]: {
        min: 0,
        max: 1,
      },
    } as any,
  };
  // ...and use a dynamic schema to validate before any creation
  private _dimensionRangeSchema = () => {
    const rangeMin = this._rangeNumberType == 'Integer' ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
    const rangeMax = this._rangeNumberType == 'Integer' ? MAX_RANGE_INT : MAX_RANGE_FLOAT;

    return object({
      min: (this._rangeNumberType == 'Integer'
        ? number().integer('Must be an integer')
        : number().test('is-decimal', 'Must be a float', ((value: number) =>
            value.toString().match(/^(\-)?\d+(\.\d+)?$/)) as any)
      ).min(rangeMin, 'The lower extent of this range cannot be lower than ' + rangeMin),
      max: (this._rangeNumberType == 'Integer'
        ? number().integer('Must be an integer')
        : number().test('is-decimal', 'Must be a float', ((value: number) =>
            value.toString().match(/^\d+(\.\d+)?$/)) as any)
      )
        .min(
          DEFAULT_RANGE_MIN + 1,
          'The higher extent of this range cannot be lower than the lower extent: ' +
            DEFAULT_RANGE_MIN,
        )
        .max(rangeMax, 'The higher extent of this range cannot be higher than ' + rangeMax),
    });
  };
  // Helpers to calculate output range
  private getRangeForSumComputation(min: number, max: number): RangeKind {
    const rangeMin = this._rangeNumberType == 'Integer' ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
    const rangeMax = this._rangeNumberType == 'Integer' ? MAX_RANGE_INT : MAX_RANGE_FLOAT;

    switch (true) {
      case max <= min:
        throw new Error('Invalid RangeKind limits');
      case min >= 0:
        // range is [0, x], where x is positive the output range will be [0, INF].
        //@ts-ignore
        return {
          [this._rangeNumberType]: {
            min: 0,
            max: rangeMax,
          },
        } as RangeKind;
      case min < 0 && max > 0:
        // range is [x, y], where x is negative and y is positive the output range will be [-INF, INF].
        //@ts-ignore
        return {
          [this._rangeNumberType]: {
            min: rangeMin,
            max: rangeMax,
          },
        } as RangeKind;
      default:
        // range is [x, 0], where x is negative the output range will be [-INF, 0].
        //@ts-ignore
        return {
          [this._rangeNumberType]: {
            min: rangeMin,
            max: 0,
          },
        } as RangeKind;
    }
  }
  private computeOutputDimensionRange() {
    if (!this.inputRange) return;
    if (this._model.program === 'SUM') {
      const rangeKindLimits = Object.values(this.inputRange.kind)[0];
      const { min, max } = rangeKindLimits;
      try {
        this._dimensionRange = {
          name: this._dimensionRange.name,
          kind: this.getRangeForSumComputation(min, max),
        };
        this._model.range_eh = undefined;
      } catch (error) {
        console.log('Error calculating output range: ', error);
      }
      return;
    }
    // Else it is AVG...
    this._dimensionRange = { name: this.inputRange.name, kind: this.inputRange.kind };
    this._model.range_eh = this.inputRange.range_eh;
  }
  // Lifecycle hook to trigger the calculation
  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (_changedProperties.has('inputRange') || _changedProperties.has('_model')) {
      if (
        typeof _changedProperties.get('inputRange') !== 'undefined' ||
        (typeof _changedProperties.get('_model') !== 'undefined' &&
          _changedProperties.get('_model').program !== this._model.program)
      ) {
        this.computeOutputDimensionRange();
      }
    }
  }

  /* Concrete implementations of the abstract BaseForm interface */
  // Form schema
  protected get validationSchema(): ObjectSchema<any> {
    return object({
      dimension_name: string().min(1, 'Must be at least 1 characters').required(),
      computed: boolean().required(),

      method_name: string().min(1, 'Must be at least 1 characters').required(),
      program: string().required(),
      can_compute_live: boolean().required(),
      requires_validation: boolean().required(),
      input_dimension_ehs: array().min(1, 'Must have an input dimension').required(),
    });
  }

  // Form model
  @state()
  protected _model: any = {
    // This model is for an atomic call (Dimension and Method) but keep it in a flat structure for now
    // outputDimension:
    dimensionName: '',
    computed: true,
    range_eh: undefined,
    // partialMethod:
    method_name: '',
    program: 'AVG',
    can_compute_live: false,
    requires_validation: false,
    input_dimension_ehs: [],
    output_dimension_eh: null, // Created in the atomic fn call
  };

  // Form submit handler
  private async handleSubmit(e: Event) {
    e.preventDefault();
    const isValid = await this.validateForm();
    this.formWasSubmitted = true;
    debugger;
    if (isValid) {
      // Form is valid, proceed with submission logic
      console.log('valid! :>> ', isValid);
    } else if (this.isFormUntouched()) {
      console.log('untouched! :>> ');
      // Handle the case where the form is invalid and untouched
    }
  }

  // onSubmit({ validateOnly } = { validateOnly: false }) {
  //   const inputs = this.renderRoot.querySelectorAll('sl-input');
  //   this.resetInputErrorLabels(inputs);
  //   const fieldsUntouched = this.validateIfUntouched(inputs);
  //   if (fieldsUntouched) return;
  //   this._dimensionRangeSchema()
  //     .validate(this._dimensionRange.kind[this._rangeNumberType])
  //     .catch(e => {
  //       this.handleValidationError.call(this, e);
  //     })
  //     .then(async validRange => {
  //       if (validRange) {
  //         this._dimensionSchema
  //           .validate(this._dimension)
  //           .then(async _ => {
  //             this.valid = true;
  //             if (validateOnly) return;
  //             this.submitBtn.loading = true;
  //             this.submitBtn.requestUpdate('loading');
  //             const rangeEh = await this.createRange();
  //             if (!rangeEh) return;

  //             this._dimension.range_eh = rangeEh;
  //             const dimensionEh = await this.createDimension();
  //             await this.updateComplete;
  //             this.dispatchEvent(
  //               new CustomEvent('dimension-created', {
  //                 detail: {
  //                   dimensionEh,
  //                   dimensionType: this.dimensionType,
  //                   dimension: this._dimension,
  //                 },
  //                 bubbles: true,
  //                 composed: true,
  //               }),
  //             );
  //           })
  //           .catch(this.handleValidationError.bind(this));
  //       }
  //     });
  // }

  // private onChangeValue(e: CustomEvent) {
  //   const inputControl = e.target as any;
  //   if (!inputControl.dataset.touched) inputControl.dataset.touched = '1';
  //   if (!this.touched) {
  //     this.touched = true;
  //   }

  //   switch (inputControl?.name || inputControl.parentElement.dataset?.name) {
  //     case 'min':
  //       const newMin = Number(inputControl.value);
  //       this._currentMinRange = newMin;
  //       this._dimensionRange.kind[this._rangeNumberType].min = newMin;
  //       break;
  //     case 'max':
  //       const newMax = Number(inputControl.value);
  //       this._dimensionRange.kind[this._rangeNumberType].max = newMax;
  //       break;
  //     case 'use-global-min':
  //       this._useGlobalMin = !this._useGlobalMin;
  //       this._dimensionRange.kind[this._rangeNumberType].min =
  //         this._rangeNumberType == 'Integer' ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
  //       break;
  //     case 'use-global-max':
  //       this._useGlobalMax = !this._useGlobalMax;
  //       this._dimensionRange.kind[this._rangeNumberType].max =
  //         this._rangeNumberType == 'Integer' ? MAX_RANGE_INT : MAX_RANGE_FLOAT;
  //       break;
  //     case 'dimension-name':
  //       this._dimension['name'] = inputControl.value;
  //       this._dimensionRange['name'] = inputControl.value + '-range';
  //       break;
  //     case 'number-type':
  //       this._rangeNumberType = inputControl.value as keyof RangeKindInteger | keyof RangeKindFloat;
  //       //@ts-ignore
  //       this._dimensionRange.kind = {
  //         [this._rangeNumberType]: { ...Object.values(this._dimensionRange.kind)[0] } as RangeKind,
  //       };
  //       if (this._useGlobalMin) {
  //         this._dimensionRange.kind[this._rangeNumberType].min =
  //           this._rangeNumberType == 'Integer' ? MIN_RANGE_INT : MIN_RANGE_FLOAT;
  //       }
  //       if (this._useGlobalMax) {
  //         this._dimensionRange.kind[this._rangeNumberType].max =
  //           this._rangeNumberType == 'Integer' ? MAX_RANGE_INT : MAX_RANGE_FLOAT;
  //       }
  //       break;
  //     default:
  //       this._dimension[inputControl.name] = inputControl.value;
  //       break;
  //   }
  // }
  // TODO: replace with SM method calls

  render() {
    return html`
      <form>
        <sl-input
          label="Dimension Name"
          name="dimensionName"
          .value=${this._model.dimensionName}
          @input=${this.handleInputChange}
        ></sl-input>

        <div class="field select">
          <label for="input-dimension" data-name="input-dimension">Select input dimension:</label>
          <select
            id="choose-input-dimension"
            name="input-dimension"
            placeholder="Select an input dimension"
            @change=${this.handleInputChange}
          >
            ${this.inputDimensions
              .filter(dimension => !dimension.computed)
              .map(
                dimension => html`
                  <option value=${encodeHashToBase64(dimension.dimension_eh)}>
                    ${dimension.name}
                  </option>
                `,
              )}
          </select>
          <label
            class="error"
            for="input-dimension"
            name="input-dimension"
            data-name="input-dimension"
            >⁎</label
          >
        </div>
        <div class="field radio">
          <div style="display: flex; justify-content:space-between; align-items: center;">
            <sl-radio-group
              @sl-change=${this.handleInputChange}
              label=${'Select an option'}
              data-name="program"
              value=${this._model.program}
            >
              <sl-radio .checked=${this._model.program == 'AVG'} value="AVG">AVG</sl-radio>
              <sl-radio .checked=${this._model.program == 'SUM'} value="SUM">SUM</sl-radio>
            </sl-radio-group>
            <label class="error" for="program" name="program" data-name="program">⁎</label>
          </div>
        </div>

        <nh-button
          type="submit"
          .size=${'auto'}
          .variant=${'primary'}
          @click=${this.handleSubmit}
          .disabled=${false}
          .loading=${false}
          >Add</nh-button
        >
      </form>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'sl-input': SlInput,
    'sl-radio': SlRadio,
    'sl-radio-group': SlRadioGroup,
    'sl-checkbox': SlCheckbox,
  };

  static get styles() {
    return [
      ...(super.styles as CSSResult[]),
      css`
        /* Layout */
        :host {
          display: grid;
          flex: 1;
          place-content: start;
          color: var(--nh-theme-fg-default);
        }

        .field,
        .field-row {
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
          visibility: hidden;
          opacity: 0;
          align-items: center;
          padding: 0 8px;
          flex: 1;
          flex-grow: 0;
          flex-basis: 8px;
          color: var(--nh-theme-error-default);
        }

        /* From test form */

        :host,
        form,
        form > * {
          width: 100%;
        }
        sl-input::part(base) {
          padding: calc(1px * var(--nh-spacing-sm));
          margin-bottom: calc(1px * var(--nh-spacing-sm));
          color: var(--nh-theme-fg-default);
          background: var(--nh-theme-bg-element);
        }
        sl-input::part(form-control-label),
        span.label {
          --sl-spacing-3x-small: calc(1px * var(--nh-spacing-xl));
          font-size: calc(1px * var(--nh-font-size-base));
          font-family: var(--nh-font-families-body);
          font-weight: var(--nh-font-weights-body-regular);
          line-height: normal;
          color: var(--nh-theme-fg-default);

          margin-bottom: calc(1px * var(--nh-spacing-sm));
        }
        sl-input::part(input)::placeholder {
          color: var(--nh-theme-input-placeholder);
          opacity: 1;
        }
        .hidden {
          display: none;
        }
      `,
    ];
  }
}
