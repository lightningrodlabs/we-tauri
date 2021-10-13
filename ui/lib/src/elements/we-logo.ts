import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { derived } from "svelte/store";

import { wesContext } from "../context";
import { unnest } from "../utils/unnest";
import { WesStore } from "../wes-store";

export class WeLogo extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext })
  _store!: WesStore;

  @property()
  weId!: string;

  _selectedWeId = new StoreSubscriber(this, () => this._store.selectedWeId);

  _info = new StoreSubscriber(this, () =>
    unnest(
      derived(this._store.wes, (wes) => wes[this.weId].info),
      (i) => i
    )
  );

  private handleClick(e: any) {
    const selectedWe = e.target.id;
    this._store.selectWe(selectedWe);
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
        class="we ${classMap({ selected: name == this._selectedWeId.value })}"
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
      .selected {
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
