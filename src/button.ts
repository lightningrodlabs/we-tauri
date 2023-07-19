import { css, CSSResult, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponent } from "neighbourhoods-design-system-components";
import "./polyfill";
import { sharedStyles } from "./sharedStyles";

@customElement("nh-button")
export class NHButton extends NHComponent {
  @property()
  label!: string;
  @property()
  iconImageB64!: string;
  @property()
  outline: boolean = false;
  @property()
  disabled: boolean = false;
  @property()
  theme: string = "dark";
  @property()
  textSize: string = "md";
  @property()
  variant: "primary" | "success" | "neutral" | "warning" | "danger" | "default" = "default";

  render() {
    return html`
      <button
        disabled=${this.disabled}
        class="btn${classMap({
          primary: this.theme == "primary",
          light: this.theme == "light",
          dark: this.theme == "dark",
          outline: this.outline,
          'text-sm': this.textSize == "sm",
        })}"
      >
        ${this.label}
      </button>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}

      button {
        padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-xl));
        border-radius: calc(1px * var(--nh-radii-sm));
        background-color: var(--nh-theme-accent-default);
        color: var(--nh-theme-fg-default);
        font-family: var(--nh-font-families-body);
        font-size: calc(1px * var(--nh-font-size-xl));
        font-weight: var(--nh-font-weights-headlines-bold);
        line-height: var(--nh-line-heights-body-default);
        letter-spacing: var(--nh-letter-spacing-buttons);
      }
      button.text-sm {
        color: var(--nh-theme-fg-default);
        line-height: var(--nh-line-heights-headlines-default);
        font-weight: var(--nh-font-weights-body-regular);
        font-size: calc(1px * var(--nh-font-size-sm));
      }
    `,
  ];
}
