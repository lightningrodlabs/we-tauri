import { css, CSSResult, html, LitElement, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';
import './polyfill'
import { sharedStyles } from './sharedStyles';

@customElement('nh-card')
export class NHCard extends NHComponentShoelace {
  @property()
  title!: string;
  @property()
  heading!: string;

  render() {
    return html`
    <div class="container">
    ${this.title ? html`<h2 class="title">${this.title}</h2>` : html``}
        <div class="content"
        class=${classMap({
          noheading: !this.heading,
        })}>
        ${this.heading ? html`<h1>${this.heading}</h1>` : html``}
          <slot></slot>
          </div>
          <slot name="footer"></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
    ${unsafeCSS(sharedStyles)}
    
      .container {
        color: var(--nh-theme-fg-default);
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

      .content {
        padding: calc(1px * var(--nh-spacing-xl));
      }
      .content.noheading {
        padding: 0;
      }
      h2.title {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: auto;
        font-size: calc(1px * var(--nh-font-size-sm));
        text-transform: uppercase;
        line-height: calc(var(--nh-line-heights-headlines-lg));
        margin-top: 0;
        margin-left: 3px;
      }
    `,
  ];
}
