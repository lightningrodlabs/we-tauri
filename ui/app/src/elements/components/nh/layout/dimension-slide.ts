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
        <h2>${this.heading}</h2>
        <slot class="content"></slot>
        <slot class="footer"></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        overflow: hidden;
      }
      :host .content {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
      }

      .container {
        width: 100%;
      }
      
      h2,
      *::slotted(*) {
        margin: 0;
        font-family: var(--nh-font-families-body);
      }
      h2 {
        font-weight: var(--nh-font-weights-body-regular);
        margin-bottom: calc(1px * var(--nh-spacing-xl));
        font-size: calc(1px * var(--nh-font-size-lg));
        line-height: var(--nh-line-heights-body-relaxed);
      }
    `,
  ];
}
