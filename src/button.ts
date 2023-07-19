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
          disabled: !!this.disabled,
          primary: this.variant == "primary",
          light: this.theme == "light",
          dark: this.theme == "dark",
          outline: this.outline,
          'text-sm': this.textSize == "sm",
          'text-md': this.textSize == "md",
          'text-lg': this.textSize == "lg",
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
        color: var(--nh-theme-fg-default);
        padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-xl));
        border-radius: calc(1px * var(--nh-radii-sm));
        background-color: var(--nh-theme-accent-default);
        font-family: var(--nh-font-families-body);
        letter-spacing: var(--nh-letter-spacing-buttons);
      }
      button:focus {
        border: 1px solid var(--nh-theme-accent-default);
      }
      button:hover {
        background-color: var(--nh-theme-accent-muted);
      }
      button:active {
        background-color: var(--nh-theme-accent-emphasis);
      }
      button.disabled {
        color: var(--nh-theme-fg-on-disabled);
        background-color: var(--nh-theme-fg-disabled);
      }
      button.text-sm {
        line-height: var(--nh-line-heights-headlines-default);
        font-weight: var(--nh-font-weights-body-regular);
        font-size: calc(1px * var(--nh-font-size-sm));
      }
      button.text-md {
        line-height: var(--nh-line-heights-headlines-default);
        font-weight: var(--nh-font-weights-body-regular);
        font-size: calc(1px * var(--nh-font-size-md));
      }
      button.text-lg {
        line-height: var(--nh-line-heights-body-default);
        font-weight: var(--nh-font-weights-headlines-bold);
        font-size: calc(1px * var(--nh-font-size-xl));
      }
    `,
  ];
}
