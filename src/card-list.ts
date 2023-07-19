import { css, CSSResult, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { NHComponentShoelace } from "neighbourhoods-design-system-components";
import "./polyfill";
import { sharedStyles } from "./sharedStyles";
import { classMap } from "lit/directives/class-map.js";

@customElement("nh-card-list")
export class NHCard extends NHComponentShoelace {
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
        <slot></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}

      .list-container {
        gap: calc(1px * var(--nh-spacing-lg));
      }
      .list-container.grid {
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
