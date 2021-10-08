import { css, html, LitElement, PropertyValues } from "lit";
import { WesStore } from "../wes-store";
import { contextProvided } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { wesContext } from "../context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { WeLogo } from "./we-logo";

export class WeWes extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext })
  _store!: WesStore;

  _wes = new StoreSubscriber(this, () => this._store.wes);

  render() {
    const wes = Object.entries(this._wes.value).map(
      ([key, we]) => html` <we-logo .weId=${key}></we-logo> `
    );

    return html` <div class="wes">${wes}</div> `;
  }

  static get scopedElements() {
    return {
      "we-logo": WeLogo,
    };
  }

  static get styles() {
    return css`
      .wes {
        list-style: none;
        display: inline-block;
        text-align: center;
        font-size: 70%;
      }
    `;
  }
}
