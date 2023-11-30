import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { NHComponent } from '../ancestors/base';

export class NHValidationError extends NHComponent {
  @property() message?: string;

  static styles = css`
    :host {
      display: block;
      color: red; // Customize as needed
    }
  `;

  render() {
    return html`${this.message ? html`<span>${this.message}</span>` : ''}`;
  }
}