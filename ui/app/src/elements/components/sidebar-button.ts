






import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { SlTooltip, SlSkeleton } from "@scoped-elements/shoelace";

import { property, query } from "lit/decorators.js";

export class SidebarButton extends ScopedElementsMixin(LitElement) {

  @property()
  logoSrc!: string;

  @property()
  tooltipText!: string;

  @property()
  placement: "top" | "top-start" | "top-end" | "right" | "right-start" | "right-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end" = "right";

  @query("#tooltip")
  _tooltip!: SlTooltip;

  private handleClick(e: any) {
    this._tooltip.hide();
    this.dispatchEvent(
      new Event("click", {
        composed: true,
        bubbles: true,
      })
    );
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
        overflow: hidden;
      }
      .icon {
        cursor: pointer;
        width: 50px;
        height: 50px;
        object-fit: cover;
      }
    `;
  }
}

