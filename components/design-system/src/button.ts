import { css, CSSResult, html } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponent } from "./ancestors/base";
import SlSpinner from "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

export default class NHButton extends NHComponent {
  @property()
  label!: string;
  @property()
  iconImageB64!: string;
  @property()
  disabled: boolean = false;
  @property()
  loading: boolean = false;
  @property()
  theme: string = "dark";
  @property()
  size: "stretch" | "lg" | "md" | "sm" | "icon"| "icon-lg"| "icon-sm" = "md";
  @property()
  variant:
    | "primary"
    | "success"
    | "neutral"
    | "warning"
    | "danger" =  "neutral";
  @property()
  clickHandler!: () => void;
  
    render() {
      return html`
        <button
          type="button"
          @click=${() => this.clickHandler()}
          ?disabled=${this.disabled}
          class="btn${classMap({
            disabled: this.disabled,
            light: this.theme == "light",
            dark: this.theme == "dark",
            [this.variant]: !!this.variant,
            [this.size]: !!this.size
          })}"
        >
        ${this.loading
          ?  html`<div class="button-inner" style="position: relative; cursor: wait;"><span style="opacity: 0;">${this.label}</span><sl-spinner style="position: absolute; left: calc(50% - 0.75rem); font-size: 1.5rem; --track-width: 3px; --track-color: var(--nh-theme-accent-default); --indicator-color: var(--nh-theme-accent-subtle);"></sl-spinner></div>`
          :  html`<div class="button-inner">
          ${this.iconImageB64
            ? html`<img alt="button icon" src=${`data:image/svg+xml;base64,${this.iconImageB64}`} />`
            : null}<span>${this.label}</span>
        </div>`
        }
        </button>
      `;
    }

    static get elementDefinitions() {
      return {
        "sl-spinner": SlSpinner,
      };
    }
  
    static styles: CSSResult[] = [
      super.styles as CSSResult,
      css`
        button {
          color: var(--nh-theme-fg-default);
          padding: calc(1px * var(--nh-spacing-md))
            calc(1px * var(--nh-spacing-xl));
          border-radius: calc(1px * var(--nh-radii-sm));
          font-family: var(--nh-font-families-body);
          font-weight: 600;
          letter-spacing: var(--nh-letter-spacing-buttons);
          background-color: var(--nh-theme-accent-default);
          border: 1px solid transparent;
          cursor: pointer;
        }
        button.icon, button.icon-sm {
          background-color: var(--nh-theme-bg-detail);
          width: 45px;
          height: 45px;
          padding: 0;
          border: 0;
        }
        button.icon-sm { 
          width: 24px;
          height: 24px;
        }
        button.primary {
          background-color: var(--nh-theme-accent-default);
        }
        button.secondary, button.secondary:hover {
          background-color: transparent;
          border: 2px solid var(--nh-theme-accent-default);
          color: var(--nh-theme-accent-default);
        }
        button:active {
          background-color: var(--nh-theme-accent-emphasis);
        }
        button.disabled {
          color: var(--nh-theme-fg-on-disabled);
          background-color: var(--nh-theme-fg-disabled);
        }
        button.success {
          color: var(--nh-theme-fg-on-disabled);
          background-color: var(--nh-theme-success-default);
        }
        button.warning {
          color: var(--nh-theme-bg-backdrop);
          background-color: var(--nh-theme-warning-default);
        }
        button.danger {
          color: var(--nh-theme-bg-backdrop);
          background-color: var(--nh-theme-error-default);
        }
        button.neutral {
          color: var(--nh-theme-fg-default);
          background-color: var(--nh-theme-bg-detail);
        }
        button.stretch {
          width: 100%;
        }
        button.lg {
          width: 145px;
        }
        button.md {
          width: 88px;
        }
        button.sm {
          width: 62px;
        }
        .button-inner {
          gap: calc(1px * var(--nh-spacing-md));
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .button-inner img {
          width: calc(1px * var(--nh-spacing-xl));
        }
        button.icon .button-inner img {
          with: auto;
        }
        button.primary.icon, button.danger.icon {
          height: 32px;
          width: 32px;
        }
        button.icon-sm .button-inner img {
          width: 16px;
          height: 16px;
        }
        button.primary.icon img {
          height: 50%;
          width: 40px;
        }
        
        button.icon .button-inner, button.icon-sm .button-inner {
          display: grid;
          gap: 0;
          height: 100%;
          place-content: center;
          cursor: pointer;
        }
        button.icon-lg .button-inner img {
          width: 80%;
          margin: 0 auto;
        }
        button:focus {
          border: 1px solid var(--nh-theme-accent-default);
        }
        button.secondary:hover {
          border-color: var(--nh-theme-accent-muted);
          color: var(--nh-theme-accent-muted);
        }
        button:hover, button.primary.icon:hover {
          background-color: var(--nh-theme-accent-muted);
        }
        button.success:hover {
          background-color: var(--nh-theme-success-muted);
        }
        button.warning:hover {
          background-color: var(--nh-theme-warning-muted);
        }
        button.danger:hover {
          background-color: var(--nh-theme-error-muted);
        }
        button.neutral:hover {
          background-color: var(--nh-theme-bg-element);
        }
        button.icon:hover {
          background-color: var(--nh-theme-bg-element);
        }
        button:active {
          background-color: var(--nh-theme-accent-emphasis);
        }
        button.disabled:hover {
          color: var(--nh-theme-fg-on-disabled);
          background-color: var(--nh-theme-fg-disabled);
          border: 1px solid var(--nh-theme-fg-disabled);
          cursor: initial;
        }
        button.sm {
          line-height: var(--nh-line-heights-headlines-default);
          font-weight: var(--nh-font-weights-headlines-bold);
          font-size: calc(1px * var(--nh-font-size-sm));
        }
        button.md, button.stretch {
          line-height: var(--nh-line-heights-headlines-default);
          font-weight: var(--nh-font-weights-headlines-bold);
          font-size: calc(1px * var(--nh-font-size-md));
        }
        button.lg {
          line-height: var(--nh-line-heights-body-default);
          font-weight: var(--nh-font-weights-headlines-bold);
          font-size: calc(1px * var(--nh-font-size-xl));
        }
      `,
    ];
  }
  
