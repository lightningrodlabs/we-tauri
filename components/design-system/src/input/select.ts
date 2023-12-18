import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { NHComponentShoelace } from '../ancestors/base';

export default class NHSlide extends NHComponentShoelace {
  @property()
  text: string = "Tooltip Text";
  @property()
  visible: boolean = true;

  render() {
    return html`
      <div class="custom-select${classMap({
        visible: this.visible,
      })}">
        <div class="select-btn">
            <span class="sBtn-text">Select your option</span>
            <i class="bx bx-chevron-down"></i>
        </div>
        <ul class="options">
            <li class="option">
                <i class="bx bxl-github" style="color: #171515;"></i>
                <span class="option-text">Github</span>
            </li>
            <li class="option">
                <i class="bx bxl-instagram-alt" style="color: #E1306C;"></i>
                <span class="option-text">Instagram</span>
            </li>
            <li class="option">
                <i class="bx bxl-linkedin-square" style="color: #0E76A8;"></i>
                <span class="option-text">Linkedin</span>
            </li>
            <li class="option">
                <i class="bx bxl-facebook-circle" style="color: #4267B2;"></i>
                <span class="option-text">Facebook</span>
            </li>
            <li class="option">
                <i class="bx bxl-twitter" style="color: #1DA1F2;"></i>
                <span class="option-text">Twitter</span>
            </li>
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
        width: 380px;
        margin: 140px auto;
      }
      .custom-select .select-btn{
          display: flex;
          height: 55px;
          background: #fff;
          padding: 20px;
          font-size: 18px;
          font-weight: 400;
          border-radius: 8px;
          align-items: center;
          cursor: pointer;
          justify-content: space-between;
          box-shadow: 0 0 5px rgba(0,0,0,0.1);
      }
      .select-btn i{
          font-size: 25px;
          transition: 0.3s;
      }
      .custom-select.active .select-btn i{
          transform: rotate(-180deg);
      }
      .custom-select .options{
          position: relative;
          padding: 20px;
          margin-top: 10px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 0 3px rgba(0,0,0,0.1);
          display: none;
      }
      .custom-select.active .options{
          display: block;
      }
      .options .option{
          display: flex;
          height: 55px;
          cursor: pointer;
          padding: 0 16px;
          border-radius: 8px;
          align-items: center;
          background: #fff;
      }
      .options .option:hover{
          background: #F2F2F2;
      }
      .option i{
          font-size: 25px;
          margin-right: 12px;
      }
      .option .option-text{
          font-size: 18px;
          color: #333;
      }
    `,
  ];
}