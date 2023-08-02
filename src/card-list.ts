import { css, CSSResult, html, unsafeCSS } from "lit";
import {property } from "lit/decorators.js";
import { NHComponentShoelace } from "./ancestors/base";
import { sharedStyles } from "./sharedStyles";
import { classMap } from "lit/directives/class-map.js";

export class NHCardList extends NHComponentShoelace {
  @property()
  direction!: 'vertical' | 'horizontal';

  @property()
  type!: 'linear' | 'grid';

  render() {
    return html`
      <div class="list-container ${classMap({
        vertical: this.type == 'linear'&& this.direction === 'vertical',
        grid: this.type === 'grid',
      })}">
        <slot name="header"></slot>
        <slot></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}

      .list-container {
        background-color: var(--nh-theme-bg-canvas);
        padding: calc(1px * var(--nh-spacing-lg));
        gap: calc(1px * var(--nh-spacing-lg));
      }
      .list-container.grid {
        gap: calc(1px * var(--nh-spacing-lg)) calc(1px * var(--nh-spacing-3xl));
        display: grid;
        grid-template-rows: auto;
        grid-template-columns: 1fr 1fr;
      }
      .list-container:not(.grid) {
        display: flex;
      }
      .vertical {
        flex-direction: column;
        max-width: 500px;
      }
    `,
  ];
}
