import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html, TemplateResult } from 'lit';
import {property, query } from 'lit/decorators.js';
import { NHComponentShoelace } from './ancestors/base';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';

export type AlertType = 'danger' | 'warning' | 'neutral' | 'success' | 'primary';

export default class NHAlert extends NHComponentShoelace {
  @property()
  open: boolean = true;
  @property()
  closable: boolean = true;
  @property()
  isToast: boolean = false;

  @property()
  title!: string;
  @property()
  description!: string;
  @property()
  type: AlertType = "neutral";

  @query('sl-alert')
  alert!: SlAlert;

  openToast() {
    this.alert.toast()
  }

  render() : TemplateResult {
    return html`
      <sl-alert id="main"
        class="alert ${classMap({ [this.type]: !!this.type, 'toast': !!this.isToast })}"
        variant=${this.type}
        ?open=${this.open}
        ?closable=${this.closable}
        duration=${this.isToast ? 3000 : Infinity}
      >
        <span class="title">${this.title}</span>
        <span class="description">${this.description}</span>
      </sl-alert>
    `;
  }

  static get elementDefinitions() {
    return {
      'sl-alert': SlAlert,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      #main::part(message) {
        --sl-spacing-large: calc(1px * var(--nh-spacing-md));
      }
      #main::part(base) {
        --nh-menu-sub-title: #eeebef;

        color: var(--nh-theme-bg-backdrop);
        --sl-color-primary-600: var(--nh-theme-accent-muted);
        background-color: var(--nh-menu-sub-title);
        margin-bottom: calc(1px * var(--nh-spacing-xl));
        border-width: 0;
        --sl-panel-border-width: calc(1px * var(--nh-spacing-md));
        --sl-font-size-small: calc(1px * var(--nh-font-size-sm));
      }

      .danger#main::part(base) {
        border-radius: calc(1px * var(--nh-radii-sm));
        border: 1px solid var(--nh-theme-error-default, #E95C7B);
        background: var(--nh-theme-error-subtle, #2D040D); 
        color: var(--nh-theme-fg-default); 
      }
      .success#main::part(base) {
        border-radius: calc(1px * var(--nh-radii-sm));
        border: 1px solid var(--nh-theme-success-default, #5DC389);
        background: var(--nh-theme-success-subtle, #052211);
        color: var(--nh-theme-fg-default); 
      }
      #main::part(message) {
        font-family: var(--nh-font-families-body);
        font-weight: var(--nh-font-weights-body-regular);
        font-size: 1rem;
        line-height: 150%; /* 1.5rem */ 
        
        display: flex;
        flex-direction: column;
        gap: calc(1px * var(--nh-spacing-md));
      }
      .title {
        font-family: "Open Sans", "Work Sans";
        font-size: 1.25rem;
        font-weight: var(--nh-font-weights-headlines-regular);
        line-height: normal; 
        display: flex !important;
        flex: 1;
      }
      /* Close btn */
      #main::part(close-button) {
        display: flex;
        align-items: flex-start;
        padding-left: .75rem;
      }
      #main::part(close-button__base) {
        position:absolute;
        display: none;
      }
      
      #main::part(close-button)::before {
        content: 'Close';
        font-family: var(--nh-font-families-body);
        font-size: 1rem;
        padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-lg));
        border-radius: calc(1px * var(--nh-radii-sm));
        border: 1px solid var(--nh-theme-success-default, #5DC389);
        right: .75rem;
        top: .75rem;
        position: relative;
        cursor: pointer;
      }

      .success#main::part(close-button)::before {
        border: 1px solid var(--nh-theme-success-default, #5DC389);
      }
      .danger#main::part(close-button)::before {
        border: 1px solid var(--nh-theme-danger-default, #E95C7B);
      }
      .success#main::part(close-button):hover::before {
        color: #5DC389;
      }
      .danger#main::part(close-button):hover::before {
        color: #E95C7B;
      }

    `,
  ];
}
