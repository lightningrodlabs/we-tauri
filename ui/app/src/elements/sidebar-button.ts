import { css, html, LitElement } from "lit";
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
        class="icon ${this.selected ? "selected" : ""}"
        src="${this.logoSrc}"
        @click=${this.handleClick}
        alt="TODO"
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
        width: var(--size, 48px);
        height: var(--size, 48px);
        border-radius: var(--border-radius, 50%);
        /* object-fit: cover; */
      }
      .icon:hover {
        box-shadow: 0 0 0px 4px var(--hover-color, var(--sl-color-primary-200));
        background: var(--hover-color, var(--sl-color-primary-200));
      }
      .selected {
        box-shadow: 0 0 0px 4px var(--hover-color, var(--sl-color-primary-200));
        background: var(--hover-color, var(--sl-color-primary-200));
      }
    `;
  }
}
