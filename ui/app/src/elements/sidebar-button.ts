import { css, html, LitElement } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { customElement, property, query } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";

@customElement("sidebar-button")
export class SidebarButton extends LitElement {
  @property()
  logoSrc!: string;

  @property()
  tooltipText!: string;

  @property()
  placement:
    | "top"
    | "top-start"
    | "top-end"
    | "right"
    | "right-start"
    | "right-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "left-start"
    | "left-end" = "right";

  @property()
  selected = false;

  @query("#tooltip")
  _tooltip!: SlTooltip;

  private handleClick(e: any) {
    this._tooltip.hide();
  }

  render() {
    return html` <sl-tooltip
      hoist
      id="tooltip"
      placement="${this.placement}"
      .content=${this.tooltipText}
    >
      <img
        class="icon"
        src="${this.logoSrc}"
        style="${this.selected
          ? "border: 3px solid black;"
          : "border: 3px solid transparent"}"
        @click=${this.handleClick}
      />
    </sl-tooltip>`;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
      }
      .icon {
        cursor: pointer;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        object-fit: cover;
      }
    `;
  }
}
