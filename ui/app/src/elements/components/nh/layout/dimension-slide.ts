import { css, CSSResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';

@customElement('nh-dimension-slide')
export class NHDimensionSlide extends NHComponentShoelace {
  @property()
  heading!: string;

  render() {
    return html`
      <div class="container">
        <h1>Dimension: ${this.heading}</h1>
        <slot></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`

    :host {
      overflow: hidden;
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
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
