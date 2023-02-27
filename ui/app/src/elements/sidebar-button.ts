import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { SlTooltip } from "@scoped-elements/shoelace";

import { property, query } from "lit/decorators.js";

export class SidebarButton extends ScopedElementsMixin(LitElement) {
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

  @query("#tooltip")
  _tooltip!: SlTooltip;

  private handleClick(e: any) {
    this._tooltip.hide();
  }

  render() {
    return html`<sl-tooltip
      hoist
      id="tooltip"
      placement="${this.placement}"
      .content=${this.tooltipText}
    >
      <img class="icon" src="${this.logoSrc}" @click=${this.handleClick} />
    </sl-tooltip>`;
  }

  static get scopedElements() {
    return {
      "sl-tooltip": SlTooltip,
    };
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
