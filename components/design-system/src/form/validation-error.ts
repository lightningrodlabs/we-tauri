import { html, css, CSSResult } from 'lit';
import { property } from 'lit/decorators.js';
import { NHComponent } from '../ancestors/base';

export class NHValidationError extends NHComponent {
  @property() message?: string;

  
  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`

    :host {
      display: flex;
      box-sizing: border-box;

      font-weight: var(--nh-font-weights-body-regular);
      font-family: var(--nh-font-families-body);
      font-size: calc(1px * var(--nh-font-size-md));

      margin: calc(1px * var(--nh-spacing-sm)) 0;
      padding: calc(1px * var(--nh-spacing-lg));
      color: var(--nh-theme-fg-default); 
      background-color: #2D040D;
      border: 1px solid #E95C7B;
      border-radius: calc(1px * var(--nh-radii-sm));
    }
  `];

  render() {
    return html`${this.message ? html`<span>${this.message}</span>` : ''}`;
  }
}