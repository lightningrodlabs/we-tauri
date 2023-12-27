import { NHBaseForm, NHButton, NHCard, NHTextInput, NHTooltip } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult } from "lit";
import { SlCheckbox, SlInput, SlRadio, SlRadioGroup } from "@scoped-elements/shoelace";
import { object, string, number, ObjectSchema } from 'yup';
import { SensemakerStore } from "@neighbourhoods/client";
import { property, state } from "lit/decorators.js";

export default class AssessmentWidgetConfigForm extends NHBaseForm {
  @property()
  sensemakerStore!: SensemakerStore;

  /* Concrete implementations of the abstract BaseForm interface */  
  // Form model
  @state()
  protected _model = { 
    name: ""
  };

  // Full concrete implementation of form schema
  protected get validationSchema() : ObjectSchema<any> { 
    return object({
    name: string().min(1, "Must be at least 1 characters").required("Enter a dimension name, e.g. Likes"),
  })};

  // Extra form state, not in the model
  //..

  @property()
  submitBtn!: NHButton;

  // Form submit handler
  async handleValidSubmit() {
    this.submitBtn.loading = true;
    this.submitBtn.requestUpdate("loading");

    return await this.createEntries()
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
    const inputControl = (e.target as any);
    //..
  }

  async resetForm() {
    super.reset();

    this.submitBtn.loading = false;
    await this.submitBtn.updateComplete;
    await this.updateComplete
  }

  render() {
    return html`
      <form method="post" action="" autoComplete="off">
        <nh-tooltip  .visible=${this.shouldShowValidationErrorForField('name')} .text=${this.getErrorMessage('name')} .variant=${"danger"}>
          <nh-text-input
            .errored=${this.shouldShowValidationErrorForField('name')}
            .size=${"medium"}
            slot="hoverable"
            .label=${"name"}
            .required=${true}
            .placeholder=${"name"}
            .name=${"name"}
            .disabled=${false}
            .value=${this._model.name}
            @change=${(e: CustomEvent) => this.handleInputChange(e)}>
          </nh-text--input>
        </nh-tooltip>
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
    "nh-tooltip": NHTooltip
  }

  static get styles() {
    return [
      ...super.styles as CSSResult[],
      css`
        /* Layout */
        :host {
          display: flex;
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