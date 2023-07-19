import { unsafeCSS } from 'lit';
import { css, CSSResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';
import { SlAlert } from '@scoped-elements/shoelace';
import { sharedStyles } from './sharedStyles';

export type AlertType = 'danger' | 'warning' | 'neutral' | 'success' | 'primary';

@customElement('nh-alert')
export class NHAlert extends NHComponentShoelace {
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
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}
      #main::part(base) {
        --sl-color-primary-600: var(--nh-theme-accent-muted);
        background-color: var(--nh-theme-menu-sub-title);
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
