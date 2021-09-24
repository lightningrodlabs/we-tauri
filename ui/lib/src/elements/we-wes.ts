import { css, html, LitElement, PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { WeStore } from "../we.store";
import { contextProvided } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { weContext } from "../types";
import { classMap } from 'lit/directives/class-map.js';

export class WeWes extends LitElement {

  @contextProvided({ context: weContext })
  _store!: WeStore;

  _wes = new StoreSubscriber(this, () => this._store.wes);

  @property()
  selected: string = "";

  private async handleClick(e: any) {
    this.selected = e.target.id
    this.dispatchEvent(new CustomEvent('we-selected', { detail: this.selected, bubbles: true, composed: true }));
  }

  render() {
    const wes = Object.entries(this._wes.value).map(
      ([key, we]) => html`
<li class="we ${classMap({selected: we.name==this.selected})}"" @click=${this.handleClick} id="${we.name}">
  <img src="${we.logo_url}" />
  <div class="we-name">${we.name}</div>
</li>`

    )

    return html`
<div class="wes">
${wes}
</div>
`;
  }

  static get styles() {
    return css`

.we {
margin-bottom: 25px;
border-radius: 10%;
}
.selected {
border: black 2px solid;
}
.we > img {
border-radius: 50%;
width: 50px;
height: 50px;
object-fit:cover;
pointer-events: none;
}
.wes {
list-style: none;
display: inline-block;
padding: 2px;
text-align: center;
font-size: 70%;
background-color: lightgrey;
padding:6px;
}
.we-name {

}

`;
  }
}
