import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { NHComponentShoelace } from '../ancestors/base';

export type OptionConfig = {
  label: string,
  value: string,
}

export default class NHSlide extends NHComponentShoelace {
  @property()
  options: OptionConfig[] = [];
  // @property()
  // visible: boolean = true;

  render() {
    return html`
      <div class="custom-select${classMap({
        // visible: this.visible,
      })}">
        <div class="select-btn">
            <span class="sBtn-text">Select your option</span>
            <i class="bx bx-chevron-down"></i>
        </div>
        <ul class="options">
          ${ this.options.map((option: OptionConfig) => 
            html`<li class="option">
              <span class="option-text" data-value=${option.value}>${option.label}</span>
            </li>`
            )
          }
        </ul>
      </div>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    const optionMenu = this.renderRoot.querySelector(".custom-select") as HTMLElement;
    const selectBtn = optionMenu?.querySelector(".select-btn"),
        options = optionMenu?.querySelectorAll(".option"),
        sBtn_text = optionMenu?.querySelector(".sBtn-text");

    selectBtn!.addEventListener("click", () => optionMenu.classList.toggle("active"));       
    options.forEach((option) =>{
        (option as any).addEventListener("click", ()=>{
            let selectedOption = (option.querySelector(".option-text") as any).innerText;
            (sBtn_text as HTMLElement).innerText = selectedOption;
            optionMenu.classList.remove("active");
        });
    });

  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .custom-select{
        width: 100%;
        max-width: 16rem;
      }
      .custom-select .select-btn{
        display: flex;
        cursor: pointer;
        align-items: center;
        justify-content: space-between;
      }
      .custom-select .options::-webkit-scrollbar-thumb   {
        background: var(--nh-theme-bg-detail);
        width: 2px;
        border: 2px solid transparent;
      }
      .custom-select .options::-webkit-scrollbar   {
        width: 8px;
        background: transparent !important;
      }

      .custom-select .options{
        max-height: 12rem;
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
      }
      .options .option, .custom-select .select-btn{
        background-color: var(--nh-theme-bg-canvas);
        box-sizing: border-box;
        height: calc(1.5px * var(--nh-spacing-3xl));
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
      }

      .options .option{
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
      .options .option:hover{
          background: var(--nh-theme-accent-default);
      }
    `,
  ];
}