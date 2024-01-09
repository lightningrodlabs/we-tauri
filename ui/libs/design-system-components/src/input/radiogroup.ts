import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { SlInput, SlRadio, SlRadioGroup } from '@shoelace-style/shoelace';
import { NHComponent } from '../ancestors/base';

export default class NHRadioGroup extends NHComponent {
  @property()
  name: string = "Field";
  @property()
  label?: string = "Your field";
  @property()
  options?: string[] = ["Cheese", "Crackers"];
  @property()
  size: "medium" | "large" = "medium";
  @property()
  direction: "horizontal" | "vertical" = "horizontal";
  @property()
  placeholder?: string = "Select your option:";
  @property()
  required: boolean = false;
  @property()
  disabled: boolean = false;
  @property()
  errored: boolean = false;

  @state()
  value?: string = '';
  @query('input')
  _radioGroup!: SlRadioGroup;

  handleInputChange(e: Event) {
    this.value = ((e.target as SlRadio).parentElement as SlRadioGroup).value

    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() : TemplateResult {
    return html`
      <div class="field radio${classMap({
        'errored': this.errored,
        [this.size]: this.size,
        [this.direction]: this.direction,
        'disabled': !!this.disabled
      })}">
        <div class="row">
            <label
              for=${this.name}
            >${this.label}</label>

          ${ this.required
            ? html`<label
              class="reqd"
              for=${this.name}
              name=${this.name}
              data-name=${this.name}
            >⁎</label>`
            : null
          }
        </div>
        <sl-radio-group @sl-change=${(e: CustomEvent) => this.handleInputChange(e)} data-name=${this.name} value=${this.value}>
          ${
            this.options?.map((option: string) => 
              html`<sl-radio .checked=${this.value == option} value=${option}>${option}</sl-radio>`
            )
          }
        </sl-radio-group>
      </div>
    `;
  }

  reset() {
    this.value = '';
  }

  static elementDefinitions = {
    "sl-input": SlInput,
    "sl-radio": SlRadio,
    "sl-radio-group": SlRadioGroup,
  }

  static styles: CSSResult[] = [
    css`
      .field.radio {
        min-width: 6rem;
        justify-content: center;  
        margin-top: calc(1px * var(--nh-spacing-lg));
      }

      sl-radio-group, sl-radio-group::part(base) {
        width: 100%;
      }
        
      sl-radio-group::part(base) {
        flex-direction: row;
        display: flex;
        justify-content: space-around;
        gap: calc(1px * var(--nh-spacing-md));
      }

      sl-radio-group::part(form-control) {
        padding: calc(1px * var(--nh-spacing-sm)) 0;
      }

      sl-radio-group::part(form-control-input) {
        display: flex;
        gap: calc(1px * var(--nh-spacing-md));
        padding: calc(1px * var(--nh-spacing-sm));
        flex-direction: row;
      }
      
      .vertical sl-radio-group::part(form-control-input) {
        flex-direction: column;
      }

      sl-radio:hover::part(control) {
        background-color: var(--nh-theme-bg-detail); 
      }

      sl-radio::part(control) {
        color: var(--nh-theme-accent-default);
        border-color: var(--nh-theme-accent-default);
        background-color: var(--nh-theme-bg-detail);
        width: 1rem;
        height: 1rem;
        display: inline-block;
        top: 4px;
        left: 2px;
      }

      sl-radio {
        margin-bottom: 0 !important;
      }

      /* Layout */

      .field, .row {
        display: flex;
      }

      .field {
        margin-top: calc(1px * var(--nh-spacing-md));
        flex-direction: column;
      }

      .row {
        justify-content: space-between;
        align-items: center;
      }

      /* Typo */

      input, label:not(.reqd),  sl-radio::part(label) {
        font-size: calc(1px * var(--nh-font-size-base));
        font-family: var(--nh-font-families-body);
        font-weight: var(--nh-font-weights-body-regular);
        line-height: normal;
        color: var(--nh-theme-fg-default);
      }
      
      .field.large sl-radio::part(base), .field.large sl-radio::part(label) {
        font-size: calc(1px * var(--nh-font-size-lg));
        font-weight: var(--nh-font-weights-body-bold);
      }

      /* Labels */
      
      sl-radio::part(label) {
        color: var(--nh-theme-fg-default);
        padding-left: 4px;
      }

      label {
        padding: 0;
      }
    
      label.reqd {
        height: 100%;
        align-items: center;
        padding-left: 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-error-default);
      }

      /* Error state */
      .field.errored sl-radio-group::part(form-control-input) {
        outline: 2px solid var(--nh-theme-error-default, #E95C7B);
        border-radius: 4px;
      }

      /* Disabled state */
      .field.disabled sl-radio-group {
        background-color: var(--nh-theme-input-fg-disabled); 
        border-color: var(--nh-theme-input-border-disabled);
      }
      .field.disabled:hover sl-radio-group {
        background: var(--nh-theme-input-fg-disabled);
        border-color: var(--nh-theme-input-border-disabled);
        cursor: not-allowed;
      }
    `,
  ];
}