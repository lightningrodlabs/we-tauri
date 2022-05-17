import { contextProvided } from "@holochain-open-dev/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import { SlTooltip, SlSkeleton } from "@scoped-elements/shoelace";

import { property, query } from "lit/decorators.js";
import { weContext } from "../../interior/context";
import { WeStore } from "../../interior/we-store";

export class WeLogo extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext })
  @property()
  store!: WeStore;

  _info = new TaskSubscriber(this, () => this.store.fetchInfo());

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
    const name = this._info.value?.name;
    return html` <sl-tooltip id="tooltip" placement="right" .content=${name}>
      <li class="we" @click=${this.handleClick}>
        ${this._info.loading
          ? html` <sl-skeleton></sl-skeleton> `
          : html` <img src="${this._info.value.logo_src}" /> `}
      </li>
    </sl-tooltip>`;
  }

  static get scopedElements() {
    return {
      "sl-tooltip": SlTooltip,
      "sl-skeleton": SlSkeleton,
    };
  }

  static get styles() {
    return css`
      .we {
        border-radius: 10%;
      }
      .we > img {
        border-radius: 50%;
        width: 50px;
        height: 50px;
        object-fit: cover;
        pointer-events: none;
      }
    `;
  }
}
