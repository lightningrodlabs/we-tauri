import { css, CSSResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { NHComponent } from 'neighbourhoods-design-system-components';

@customElement('nh-card')
export class NHCard extends NHComponent {
  @property()
  heading!: string;

  render() {
    return html`
      <div class="container">
        <h1>${this.heading}</h1>
        <slot></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .container {
        border-radius: calc(1px * var(--nh-radii-xl));
        background-color: var(--nh-theme-bg-subtle);
        padding: calc(1px * var(--nh-spacing-xl));
      }
      h1, *::slotted(*) {
        margin: 0;
        font-family: var(--nh-font-families-body);
      }
      h1 {
        font-weight: var(--nh-font-weights-body-regular);
        margin-bottom: calc(1px * var(--nh-spacing-xl));
      }
    `,
  ];
}
