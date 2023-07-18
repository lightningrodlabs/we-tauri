import { css, CSSResult, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponentShoelace } from "neighbourhoods-design-system-components";
import "./polyfill";
import { sharedStyles } from "./sharedStyles";

@customElement("nh-card-list")
export class NHCard extends NHComponentShoelace {
  // @property()
  // title!: string;

  render() {
    return html`
      <div class="list-container">
        <slot></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}

      .list-container {

      }
    `,
  ];
}
