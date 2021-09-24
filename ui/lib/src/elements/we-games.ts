import { css, html, LitElement, PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { WeStore } from "../we.store";
import { contextProvided } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { weContext } from "../types";
import { classMap } from 'lit/directives/class-map.js';

export class WeGames extends LitElement {

  @contextProvided({ context: weContext })
  _store!: WeStore;

  _games = new StoreSubscriber(this, () => this._store.games);

  @property()
  selected: string = "";

  private async handleClick(e: any) {
    this.selected = e.target.id
    this.dispatchEvent(new CustomEvent('game-selected', { detail: this.selected, bubbles: true, composed: true }));
  }

  render() {
    const games = Object.entries(this._games.value).map(
      ([key, game]) => html`
<li class="game ${classMap({selected: game.name==this.selected})}"" @click=${this.handleClick} id="${game.name}"><img src="${game.logo_url}"><div>${game.name}</div></li>`

    )

    return html`
<div class="games">
${games}
</div>
`;
  }

  static get styles() {
    return css`

.game {
margin-bottom: 25px;
border-radius: 10%;
}
.selected {
border: black 2px solid;
}
.game > img {
border-radius: 30%;
width: 60px;
pointer-events: none;
}
.games {
list-style: none;
display: inline-block;
margin: 2px;
text-align: center;
font-size: 70%;
}
`;
  }
}
