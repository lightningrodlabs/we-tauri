import { css, html, LitElement, PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import { WeStore } from "../we-store";
import { contextProvided } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { weContext } from "../context";
import { classMap } from "lit/directives/class-map.js";

export class WeGames extends LitElement {
  @contextProvided({ context: weContext })
  _store!: WeStore;

  _games = new StoreSubscriber(this, () => this._store.games);
  _selectedGame = new StoreSubscriber(this, () => this._store.selectedGameId);

  private async handleClick(e: any) {
    this._store.selectGame(e.target.id);
  }

  render() {
    const games = Object.entries(this._games).map(
      ([key, game]) => html` <li
        class="game ${classMap({
          selected: key == this._selectedGame.value,
        })}"
        @click=${this.handleClick}
        id="${key}"
      >
        <img src="${game.logo_url}" />
        <div>${game.name}</div>
      </li>`
    );

    return html` <div class="games">${games}</div> `;
  }

  static get styles() {
    return css`
      .game {
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
        display: flex;
        flex-direction: column;
        list-style: none;
        margin: 2px;
        text-align: center;
        font-size: 70%;
      }
    `;
  }
}
