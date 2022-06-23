import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import { SlTooltip, SlSkeleton } from "@scoped-elements/shoelace";

import { property, query } from "lit/decorators.js";
import { weContext } from "../../interior/context";
import { WeStore } from "../../interior/we-store";
import { WeInfo } from "../types";

export class WeLogo extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext })
  @property()
  store!: WeStore;

  _info = new TaskSubscriber(
    this,
    () => this.store.fetchInfo(),
    () => [this.store]
  );

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

  renderLogo(info: WeInfo) {
    return html`<sl-tooltip
      id="tooltip"
      placement="right"
      .content=${info.name}
      hoist
    >
      <img class="we" src="${info.logo_src}" @click=${this.handleClick} />
    </sl-tooltip>`;
  }

  render() {
    return this._info.render({
      pending: () => html` <sl-skeleton></sl-skeleton> `,
      complete: this.renderLogo,
    });
  }

  static get scopedElements() {
    return {
      "sl-tooltip": SlTooltip,
      "sl-skeleton": SlSkeleton,
    };
  }

  static get styles() {
    return css`
      :host {
        display: flex;
      }
      .we {
        cursor: pointer;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        object-fit: cover;
      }
      .we:hover {
        box-shadow: 0 0 5px #ffff;
      }
    `;
  }
}
