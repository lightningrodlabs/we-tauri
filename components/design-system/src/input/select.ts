import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html, PropertyValueMap } from 'lit';
import { property, state } from 'lit/decorators.js';
import { NHComponentShoelace } from '../ancestors/base';

export type OptionConfig = {
  label: string,
  value: string,
}

export default class NHSelect extends NHComponentShoelace {
  @property()
  options: OptionConfig[] = [];
  @state()
  placeholder?: string = "Select your option:";
  @property()
  size: "medium" | "large" = "medium";
  @state()
  value?: string = undefined;
  @state()
  open: boolean = false;

  handleSelected(option: OptionConfig) {
    this.value = option.value

    this.dispatchEvent(
      new CustomEvent("option-selected", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div data-open=${this.open} class="field custom-select${classMap({
        [this.size]: this.size,
        //@ts-ignore
        ['not-null']: this.value
      })}">
        <div class="select-btn">
            <span>${this.value || this.placeholder}</span>
            <svg class="chevron-down" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" data-slot="icon" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
        </div>
        <ul class="options">
          ${ this.options.map((option: OptionConfig) => 
            html`<li class="option" @click=${() => this.handleSelected(option)}>
              <span class="option-text" data-value=${option.value}>${option.label}</span>
            </li>`
            )
          }
        </ul>
      </div>
    `;
  }

  reset() {
    this.value = undefined;
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    const optionMenu = this.renderRoot.querySelector(".custom-select") as HTMLElement;
    const selectBtn = optionMenu?.querySelector(".select-btn"),
        options = optionMenu?.querySelectorAll(".option");

    selectBtn!.addEventListener("click", () => { this.open = !this.open; optionMenu.classList.toggle("active")});
    options.forEach((option) =>{
        (option as any).addEventListener("click", ()=>{
            let selectedOption = (option.querySelector(".option-text") as any).innerText;
            this.value = selectedOption;
            optionMenu.classList.remove("active");
        });
    });
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        overflow: inherit;
      }

      .custom-select{
        width: 100%;
        min-width: 16rem;
        max-width: 100%;
        border-radius: calc(1px * var(--nh-radii-base));
        overflow: hidden;
      }
      .custom-select .select-btn{
        display: flex;
        cursor: pointer;
        align-items: center;
        justify-content: space-between;
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
        width: 100%;
        position: relative;
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
      .option .option-text, .select-btn{
        line-height: var(--nh-line-heights-body-default);
        font-family: var(--nh-font-families-headlines);
        font-size: calc(1px * var(--nh-font-size-md));
        font-weight: var(--nh-font-weights-body-regular);
        color: var(--nh-theme-fg-default); 
      }
      .select-btn span {
        margin-right: 8px;
      }

      /* Sizes */
      .field.medium .select-btn {
        --scale: 1px;
      }
      .field.large .select-btn {
        --scale: 1.5px;
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
      }
      .field .select-btn {
        height: calc(var(--scale) * 40px);
      }

      .field.medium .select-btn {
        font-size: calc(1px * var(--nh-font-size-base));
        font-weight: var(--nh-font-weights-body-regular);
      }
      .field.large .select-btn {
        font-size: calc(1px * var(--nh-font-size-lg));
        font-weight: var(--nh-font-weights-body-bold);
      }

      .chevron-down {
        height: 16px;
        width: 16px;
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

      :host(.untouched) .custom-select:not(.not-null):not(.active) {
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