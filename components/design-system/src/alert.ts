import { css, CSSResult, html } from 'lit';
import {property } from 'lit/decorators.js';
import { NHComponentShoelace } from './ancestors/base';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';

export type AlertType = 'danger' | 'warning' | 'neutral' | 'success' | 'primary';

export default class NHAlert extends NHComponentShoelace {
  @property()
  open: boolean = true;
  @property()
  type!: AlertType;

  render() {
    return html`
      <sl-alert id="main"
        variant=${this.type} ?open=${this.open}>
        <slot></slot>
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
      #main:part(message){
        padding: 0 !important;
      }
    `,
  ];
}
