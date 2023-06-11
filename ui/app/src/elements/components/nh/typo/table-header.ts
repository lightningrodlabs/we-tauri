import { css, CSSResult, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { NHComponent } from "../base";

@customElement("nh-table-header")
export class NHTableHeader extends NHComponent {
  render() {
    return html`
      <span>
        <slot></slot>
      </span>
    `;
  }

  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
        :host {
          line-height: 27px;
        }
      `
    ];
}