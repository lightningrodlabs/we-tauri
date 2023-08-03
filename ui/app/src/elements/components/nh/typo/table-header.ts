import { css, CSSResult, html } from "lit";
import { customElement } from "lit/decorators.js";
import { NHComponent } from '@neighbourhoods/design-system-components';

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