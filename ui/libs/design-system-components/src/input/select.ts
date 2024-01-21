import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { NHComponentShoelace } from '../ancestors/base';
import { b64images } from '@neighbourhoods/design-system-styles';

export type OptionConfig = {
  label: string,
  value: string,
  imageB64?: string,
}

export default class NHSelect extends NHComponentShoelace {
  @property()
  name: string = "Field";
  @property()
  label?: string = "Your field";
  @property()
  options: OptionConfig[] = [];
  @property()
  placeholder?: string = "Select your option:";
  @property()
  size: "medium" | "large" = "medium";
  @property()
  required: boolean = false;
  @property()
  disabled: boolean = false;
  @property()
  errored: boolean = false;

  @state()
  value?: string = undefined;
  @state()
  labelValue?: string = undefined;
  @state()
  image?: string = undefined;
  @state()
  open: boolean = false;
  
  @query(".custom-select")
  _optionMenu!: HTMLElement;

  handleSelected(option: OptionConfig) {
    this.value = option.value
    this.labelValue = option.label
    this.image = option?.imageB64

    this._optionMenu.classList.remove("active");

    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
      })
    );
  } 

  render() : TemplateResult {
    return html`
    <div class="field${classMap({
      [this.size]: this.size,
      ['with-icons']: this.options?.some((option: OptionConfig) => option?.imageB64),
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
        <div data-open=${this.open} class="field custom-select${classMap({
          'errored': this.errored,
          //@ts-ignore
          ['not-null']: !!this.value
        })}">
          <div class="select-btn" @click=${() => { this.open = !this.open; this._optionMenu.classList.toggle("active")}}>
          ${
            this.options?.some((option: OptionConfig) => option?.imageB64)
              ? html`<div class="flex">
                ${this?.image ? html `<span class="option-image"><img
                    class="icon"
                    alt=${this.value}
                    src=${`data:image/png;base64,${this?.image || b64images.icons.refresh}`}
                  /></span>` : null}
                  <span>${this.value || this.placeholder}</span>
              </div>`
              : html`<span>${this.labelValue || this.placeholder}</span>`
          }
              <svg class="chevron-down" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" data-slot="icon" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
          </div>
          <ul class="options">
            ${ this.options?.length
              ? this.options.map((option: OptionConfig) =>
                option?.imageB64 && option.imageB64 !== ''
                  ? html`<li class="option" @click=${() => this.handleSelected(option)}>
                    <span class="option-image"><img
                      class="icon"
                      alt=${option.value}
                      src=${`data:image/png;base64,${option?.imageB64 || b64images.icons.refresh}`}
                    /></span>
                    <span class="option-text" data-value=${option.value}>${option.label}</span>
                  </li>`
                  : html`<li class="option" @click=${() => this.handleSelected(option)}>
                          <span class="option-text" data-value=${option.value}>${option.label}</span>
                        </li>`
                )
              : html`<li class="option">
                <span class="option-text" data-value=${undefined}>No options available</span>
              </li>`
            }
          </ul>
        </div>
    </div>
    `;
  }

  reset() {
    this.value = undefined;
    this.labelValue = undefined;
    this.image = undefined;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        --select-height: calc(2 * 1.5px * var(--nh-spacing-3xl) - 3px); /* accounts for the label (2*) and borders (-3px) */
        overflow: inherit;
        max-height: var(--select-height);
      }

      .custom-select{
        width: 100%;
        min-width: 18rem;
        max-width: 100%;
        border-radius: calc(1px * var(--nh-radii-base));
        overflow: hidden;
        margin-top: calc(1px * var(--nh-spacing-sm));
      }
      .custom-select .select-btn{
        display: flex;
        cursor: pointer;
        align-items: center;
        justify-content: space-between;
        border: 1px solid var(--nh-theme-accent-disabled);
        border-radius: calc(1px * var(--nh-radii-base));
      }
      .custom-select.active .select-btn {
        border-bottom: 0;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }

      .custom-select .options {
        border-radius: calc(1px * var(--nh-radii-base));
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        max-height: 8rem;
        overflow: auto;
        background-color: var(--nh-theme-bg-canvas); 

        margin-top: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-md));
        display: none;
        padding: 0;
        box-sizing: border-box;
        position: relative;
        width: 100%;
        overflow-x: hidden;
      }
      .custom-select.active .options{
        display: block;
        z-index: 5;
      }

      .options .option, .custom-select .select-btn{
        box-sizing: border-box;
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
      }

      .options .option{
        background-color: var(--nh-theme-bg-canvas);
        display: flex;
        align-items: center;
        cursor: pointer;

        width: 100%;
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
        background-color: var(--nh-theme-bg-canvas); 
        color: var(--nh-theme-fg-default); 
      }

      .select-btn span {
        margin-right: 8px;
      }

      /* Layout */

      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .field {
        margin-top: calc(1px * var(--nh-spacing-md));
        flex-direction: column;
      }
      .option {
        display: flex;
      }
      .field.with-icons .option {
        justify-content: space-between;
      }
      .field.with-icons .flex {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex: 1;
        padding: 0;
        padding-right: 12px;
      }
      .field.with-icons .flex .option-image {
        padding-left: 12px;
      }

      .field.with-icons .select-btn {
        justify-content: space-between;
      }
      .icon {
        height: 48px;
        padding-top: 8px;
      }

      /* Typo */

      label:not(.reqd), .option .option-text, .select-btn {
        font-size: calc(1px * var(--nh-font-size-base));
        font-family: var(--nh-font-families-body);
        font-weight: var(--nh-font-weights-body-regular);
        line-height: normal;
        color: var(--nh-theme-fg-default);
      }

      .custom-select:not(.not-null) .select-btn {
        color: #9E9E9E; 
      }
      
      .field.large label:not(.reqd) {
        margin-top: 1rem;
        height: 2rem;
        display: flex;
        align-items: flex-end;
      } 

      .field.large label:not(.reqd), .field.large .option-text {
        font-size: calc(1px * var(--nh-font-size-lg));
        font-weight: var(--nh-font-weights-body-bold);
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

      /* Sizes */

      .field.medium .select-btn {
        --scale: 1.5px;
      }
      .field.large .select-btn {
        --scale: 2px;
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-xl));
      }
      .field .select-btn {
        height: calc(var(--scale) * var(--nh-spacing-3xl));
      }

      .field.medium .select-btn {
        font-size: calc(1px * var(--nh-font-size-base));
        font-weight: var(--nh-font-weights-body-regular);
      }
      .field.large .select-btn {
        font-size: calc(1px * var(--nh-font-size-lg));
        font-weight: var(--nh-font-weights-body-bold);
      }
      .field.large  .options {
        width: initial;
      }
      .field.with-icons .option {
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-3xl));
      }
      .field.large  .options .option {
        --scale: 2px;
        height: calc(var(--scale) * var(--nh-spacing-3xl));
      }

      .chevron-down {
        height: 16px;
        width: 16px;
        color: var(--nh-theme-accent-emphasis);
      }

      /* Colors */

      .select-btn {
        background: var(--nh-theme-bg-detail);
      }
      .custom-select.active .select-btn:hover{
        background: var(--nh-theme-bg-element);
      }
      .select-btn:hover{
        background: var(--nh-theme-bg-element);
      }
      .options .option:hover{
        background: var(--nh-theme-accent-default);
      }

      .field.errored.custom-select:not(.not-null):not(.active) {
        outline: 2px solid var(--nh-theme-error-default, #E95C7B);
      }

      /* Scroll bar */

      .custom-select .options::-webkit-scrollbar-thumb {
        background: var(--nh-theme-bg-element);
        width: 2px;
        border: 2px solid transparent;
      }
      .custom-select .options::-webkit-scrollbar   {
        width: 8px;
        background: transparent !important;
      }
    `,
  ];
}