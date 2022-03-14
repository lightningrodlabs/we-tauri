import { contextProvided } from "@holochain-open-dev/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { weContext } from "../context";
import { WeStore } from "../we-store";

export class WeLogo extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext })
  @property()
  store!: WeStore;
  
  @property()
  highlighted: boolean = false

  _info = new StoreSubscriber(this, () => this.store.info);

  async firstUpdated() {
    await this.store.fetchWeInfo();
  }


  private handleClick(e: any) {
    const selectedWe = e.target.id;
    this.shadowRoot!.querySelector("sl-tooltip")!.open = false;
    this.dispatchEvent(
      new CustomEvent("we-selected", {
        detail: selectedWe,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const name = this._info.value.name;
    return html` <sl-tooltip placement="right" .content=${name}>
      <li
        class="we ${classMap({ highlighted: this.highlighted })}"
        @click=${this.handleClick}
        id="${name}"
      >
        <img src="${this._info.value.logo_url}" />
      </li>
    </sl-tooltip>`;
  }

  static get styles() {
    return css`
      .we {
        border-radius: 10%;
      }
      .highlighted {
        border: black 2px solid;
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
