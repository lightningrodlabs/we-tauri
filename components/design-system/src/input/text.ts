import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { SlInput } from '@shoelace-style/shoelace';
import { NHComponent } from '../ancestors/base';

export default class NHTextInput extends NHComponent {
  @property()
  name: string = "Field";
  @property()
  label?: string = "Your field";
  @property()
  size: "medium" | "large" = "medium";
  @property()
  placeholder?: string = "Select your option:";
  @property()
  required: boolean = false;
  @property()
  disabled: boolean = false;
  @property()
  errored: boolean = false;

  @state()
  value?: string = undefined;

  handleInputChange(e: Event) {
    this.value = (e.target as SlInput).value

    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
    <div class="field${classMap({
      'errored': this.errored,
      [this.size]: this.size
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
          <input
            type="text"
            name=${this.name}
            id=${this.name}
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            ?required=${this.required}
            @input=${this.handleInputChange}
            value=${this.value}
          ></input>
      </div>
    `;
  }

  reset() {
    this.value = undefined;
  }

  static elementDefinitions = {
    'sl-input': SlInput,
  }

  static styles: CSSResult[] = [
    css`
      input {
        min-width: 16rem;
        margin-top: calc(1px * var(--nh-spacing-sm));
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-sm));
        color: var(--nh-theme-fg-default);
        background-color: var(--nh-theme-bg-detail); 
        border-radius:  calc(1px * var(--nh-radii-base));
        border: 1px solid var(--nh-theme-accent-disabled);
      }

      /* Sizes */
      .field.medium input {
        --scale: 1px;
      }
      .field.large input {
        --scale: 1.5px;
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
      }
      .field input {
        height: calc(var(--scale) * var(--nh-spacing-3xl));
      }

      .field:hover input{
        background: var(--nh-theme-bg-element);
      }
      .field input:focus-visible{
        outline: 1px solid var(--nh-theme-accent-default);
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

      input, label:not(.reqd), input::placeholder {
        font-size: calc(1px * var(--nh-font-size-base));
        font-family: var(--nh-font-families-body);
        font-weight: var(--nh-font-weights-body-regular);
        line-height: normal;
        color: var(--nh-theme-fg-default);
      }
      
      .field.large input::placeholder, .field.large label:not(.reqd) {
        font-size: calc(1px * var(--nh-font-size-lg));
        font-weight: var(--nh-font-weights-body-bold);
      }

      input::placeholder {
        color: #9E9E9E;
      }

      /* Labels */
      
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
      .field.errored input {
        outline: 2px solid var(--nh-theme-error-default, #E95C7B);
      }
    `,
  ];
}