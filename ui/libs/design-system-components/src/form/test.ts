import { classMap } from 'lit/directives/class-map.js';
import { state } from 'lit/decorators.js';
import { CSSResult, TemplateResult, css, html } from 'lit';
import { NHBaseForm } from "../ancestors/base-form";
import { ObjectSchema, object, string } from 'yup';
import { SlInput, SlRadioGroup } from '@shoelace-style/shoelace';
import NHValidationError from './validation-error';
import NHButton from '../button';

export default class CreateDimensionForm extends NHBaseForm {
  
  protected get validationSchema(): ObjectSchema<any> {
    return object({
      dimensionName: string().min(3).required(),
    });
  }

  @state()
  protected _model: any = { dimensionName: "", computed: true, range_eh: undefined };

  protected async handleValidSubmit() {
      console.log('valid! :>> ');
  }

  private hasErrors() {
    this.handleValidSubmit()
    return Object.keys(this.errors).length > 0;
  }
  
  static elementDefinitions = {
      'sl-radio-group': SlRadioGroup,
      'sl-input': SlInput,
      'nh-button': NHButton,
      'nh-validation-error': NHValidationError,
  }

  render() : TemplateResult {
    return html`
      <form @submit=${(e: Event) => this.handleSubmit(e)}>
        <sl-input
          label="Dimension Name"
          name="dimensionName"
          .value=${this._model.dimensionName}
          @input=${this.handleInputChange}
        ></sl-input>
        
        <nh-validation-error
          class="${classMap({
            // hidden: !this.shouldShowValidationErrorForField('dimensionName'),
          })}"
          .message=${this.getErrorMessage('dimensionName')}
        ></nh-validation-error>
        <nh-button @click=${this.handleSubmit} type="submit">Create</nh-button>
      </form>

      ${this.isFormUntouched() && this.hasErrors() ? html`<p>Please fill in the form.</p>` : ''}
    
    `;
  }
  static styles: CSSResult[] = [
    ...super.styles,
    css`      
        :host, form, form > * {
          width: 100%;
        }
        sl-input::part(base) {
          padding: calc(1px * var(--nh-spacing-sm));
          color:  var(--nh-theme-fg-default);
          background: var(--nh-theme-bg-element);
        }
        .hidden {
          display: none;  
        }
    `,
  ];
}