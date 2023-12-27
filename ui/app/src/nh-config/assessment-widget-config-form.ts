import {
  NHBaseForm,
  NHButton,
  NHCard,
  NHSelect,
  NHTextInput,
  NHTooltip,
} from '@neighbourhoods/design-system-components';
import { html, css, CSSResult } from 'lit';
import { SlCheckbox, SlInput, SlRadio, SlRadioGroup } from '@scoped-elements/shoelace';
import { object, string, number, ObjectSchema } from 'yup';
import { SensemakerStore } from '@neighbourhoods/client';
import { property, state } from 'lit/decorators.js';

export default class AssessmentWidgetConfigForm extends NHBaseForm {
  @property()
  sensemakerStore!: SensemakerStore;

  /* Concrete implementations of the abstract BaseForm interface */
  // Form model
  @state()
  protected _model = {
    assessment_widget: '',
    input_dimension: '',
    output_dimension: ''
  };

  // Full concrete implementation of form schema
  protected get validationSchema(): ObjectSchema<any> {
    return object({
      assessment_widget: string()
        .min(1, 'Must be at least 1 characters')
        .required('Enter a dimension name, e.g. Likes'),
        input_dimension: string()
        .min(1, 'Must be at least 1 characters')
        .required('Enter a dimension name, e.g. Likes'),
        output_dimension: string()
        .min(1, 'Must be at least 1 characters')
        .required('Enter a dimension name, e.g. Likes'),
    });
  }

  // Extra form state, not in the model
  //..

  @property()
  submitBtn!: NHButton;

  // Form submit handler
  async handleValidSubmit() {
    this.submitBtn.loading = true;
    this.submitBtn.requestUpdate('loading');

    return await this.createEntries();
  }

  async createEntries() {
    // let rangeEh, dimensionEh;
    // let inputRange: Range = {
    //   name: this._model.name + '_range',
    //   //@ts-ignore
    //   kind: { [this._numberType]: {
    //     min: this._model.min,
    //     max: this._model.max
    //     }
    //   }
    // }
    // try {
    //   rangeEh = await this.sensemakerStore.createRange(inputRange);
    // } catch (error) {
    //   console.log('Error creating new range for dimension: ', error);
    // }
    // if(!rangeEh) return
    // let inputDimension: Dimension = {
    //   name: this._model.name,
    //   computed: false, // Hard coded for input dimensions
    //   range_eh: rangeEh
    // }
    // try {
    //   dimensionEh = await this.sensemakerStore.createDimension(inputDimension);
    // } catch (error) {
    //   console.log('Error creating new dimension: ', error);
    // }
    // if(!dimensionEh) return
    // await this.updateComplete;
    // this.dispatchEvent(
    //   new CustomEvent("dimension-created", {
    //     detail: { dimensionEh, dimensionType: "input", dimension: inputDimension },
    //     bubbles: true,
    //     composed: true,
    //   })
    // );
    // this.dispatchEvent(
    //   new CustomEvent('form-submitted', {
    //     bubbles: true,
    //     composed: true,
    //   }),
    // );
  }

  handleInputChange(e: Event) {
    super.handleInputChange(e);

    // Change handler overloads
    const inputControl = e.target as any;
    //..
  }

  async resetForm() {
    super.reset();

    this.submitBtn.loading = false;
    await this.submitBtn.updateComplete;
    await this.updateComplete;
  }

  render() {
    return html`
      <form method="post" action="" autocomplete="off">
        <nh-tooltip
          class="tooltip-overflow"
          .visible=${this.shouldShowValidationErrorForField('assessment_widget')}
          .text=${this.getErrorMessage('assessment_widget')}
          .variant=${'danger'}
        >
          <nh-select
            .errored=${this.shouldShowValidationErrorForField('assessment_widget')}
            .size=${'large'}
            slot="hoverable"
            .required=${true}
            id="choose_assessment_widget"
            name="assessment_widget"
            .placeholder=${'Select'}
            .label=${'1. Select an assessment widget for this resource: '}
            @change=${this.handleInputChange}
            .options=${ [
      {
        label: "One",
        value: "1"
      },
      {
        label: "Two",
        value: "2"
      },
      {
        label: "Three",
        value: "3"
      },
      {
        label: "Four",
        value: "4"
      },
      {
        label: "Five",
        value: "5"
      },
    ]}
          >
          </nh-select>
        </nh-tooltip>
        <nh-tooltip
          class="tooltip-overflow"
          .visible=${this.shouldShowValidationErrorForField('input_dimension')}
          .text=${this.getErrorMessage('input_dimension')}
          .variant=${'danger'}
        >
          <nh-select
            .errored=${this.shouldShowValidationErrorForField('input_dimension')}
            .size=${'large'}
            slot="hoverable"
            .required=${true}
            id="choose_input_dimension"
            name="input_dimension"
            .placeholder=${'Select'}
            .label=${'2. Select the input dimension: '}
            @change=${this.handleInputChange}
            .options=${ [
      {
        label: "One",
        value: "1"
      },
      {
        label: "Two",
        value: "2"
      },
      {
        label: "Three",
        value: "3"
      },
      {
        label: "Four",
        value: "4"
      },
      {
        label: "Five",
        value: "5"
      },
    ]}
          >
          </nh-select>
        </nh-tooltip>
        <nh-tooltip
          class="tooltip-overflow"
          .visible=${this.shouldShowValidationErrorForField('output_dimension')}
          .text=${this.getErrorMessage('output_dimension')}
          .variant=${'danger'}
        >
          <nh-select
          @click=${(e) => e.currentTarget.scrollIntoView()  }
            .errored=${this.shouldShowValidationErrorForField('output_dimension')}
            .size=${'large'}
            slot="hoverable"
            .required=${true}
            id="choose_output_dimension"
            name="output_dimension"
            .placeholder=${'Select'}
            .label=${'3. Select the output dimension: '}
            @change=${this.handleInputChange}
            .options=${ [
      {
        label: "One",
        value: "1"
      },
      {
        label: "Two",
        value: "2"
      },
      {
        label: "Three",
        value: "3"
      },
      {
        label: "Four",
        value: "4"
      },
      {
        label: "Five",
        value: "5"
      },
    ]}
          >
          </nh-select>
        </nh-tooltip>
        
      </form>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-card': NHCard,
    'nh-select': NHSelect,
    'nh-text-input': NHTextInput,
    'nh-tooltip': NHTooltip,
  };

  static get styles() {
    return [
      ...(super.styles as CSSResult[]),
      css`
        /* Layout */
        :host {
          max-width: initial;
          justify-content: flex-start;
          color: var(--nh-theme-fg-default);
          overflow: auto;
        }

        form {
          display: flex;
          flex: 1;
          flex-wrap: wrap;
          align-items: center;
          padding: 0;
          margin: calc(1px * var(--nh-spacing-md)) 0 calc(1px * var(--nh-spacing-xl)) 0;
          gap: calc(1px * var(--nh-spacing-md));
          padding-bottom: 4rem;
        }

        form > * {
          display: flex;
          flex: 1;
          justify-content: center;
        }
        
        @media (min-width: 1350px) {
          form {
              flex-wrap: nowrap;
              padding-bottom: 0;
              margin-bottom: 0;
          }
          :host {
            overflow: hidden;
          }
        }

      /* Scroll bar */

      :host::-webkit-scrollbar-thumb {
        background: var(--nh-theme-bg-element);
        width: 4px;
        border: 4px solid transparent;
      }
      :host::-webkit-scrollbar   {
        width: 8px;
        background: transparent !important;
      }

        .row-2 {
          display: flex;
          justify-content: space-between;
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

        /* Bugfix for custom select */
        .tooltip-overflow {
          --select-height: calc(2.5px * var(--nh-spacing-3xl) - 3px); /* accounts for the label (2*) and borders (-3px) */
          overflow: inherit;
          max-height: var(--select-height);
        }

        /* Radio */

        .field.radio {
          justify-content: center;
          padding-top: calc(1px * var(--nh-spacing-md));
          margin-top: calc(1px * var(--nh-spacing-lg));
        }

        sl-radio-group,
        sl-radio-group::part(base) {
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
          bottom: 1px;
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
      `,
    ];
  }
}
