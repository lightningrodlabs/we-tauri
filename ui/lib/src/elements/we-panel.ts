import { contextProvided, provide } from "@lit-labs/context";
import { Button } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { query } from "lit/decorators.js";
import { weContext, wesContext } from "../context";
import { GEAR_ICON_URL } from "../types";
import { WeStore } from "../we-store";
import { WesStore } from "../wes-store";
import { CreateGameDialog } from "./create-game-dialog";
import { WeGames } from "./we-games";
import { WePlayer } from "./we-player";

export class WePanel extends LitElement {
  @contextProvided({ context: weContext })
  _store!: WeStore;

  _info = new StoreSubscriber(this, () => this._store.info);
  _players = new StoreSubscriber(this, () => this._store.players);
  _selectedGameId = new StoreSubscriber(this, () => this._store.selectedGameId);

  @query("#game-dialog")
  _gameDialog!: CreateGameDialog;

  async openGameDialog() {
    this._gameDialog.open();
  }

  async refresh() {
    await Promise.all([this._store.fetchGames(), this._store.fetchPlayers()]);
  }

  renderPlayers() {
    return Object.entries(this._players).map(([player, props]) => {
      return html`
        <we-player
          .hash=${player}
          .props=${props}
          .size=${32}
          .me=${player == this._store.myAgentPubKey}
        ></we-player>
      `;
    });
  }

  renderContent() {
    if (!this._selectedGameId)
      return html`<mwc-button
          icon="add_circle"
          @click=${() => this.openGameDialog()}
          >Add hApp</mwc-button
        >
        <mwc-button icon="refresh" @click=${() => this.refresh()}
          >Refresh</mwc-button
        >`;
    else return "Content goes here";
  }

  render() {
    return html` <div class="games-list">
        <div class="we-name">${this._info.value.name}</div>
        <we-games></we-games>
        <img
          class="game-admin"
          @click=${() => this._store.selectGame(undefined)}
          src="${GEAR_ICON_URL}"
        />
      </div>

      <div class="content-pane">${this.renderContent()}</div>

      <div class="players">${this.renderPlayers()}</div>

      <create-game-dialog id="game-dialog"></create-game-dialog>`;
  }

  static get scopedElements() {
    return {
      "create-game-dialog": CreateGameDialog,
      "we-player": WePlayer,
      "mwc-button": Button,
      "we-games": WeGames,
    };
  }

  static get styles() {
    return css`
      :host {
        display: contents;
      }
      .games-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 5px;
        background-color: lightgrey;
      }
      we-games {
        flex-grow: 0;
      }
      .we-name {
        text-align: center;
        border-bottom: solid 1px gray;
        margin-bottom: 5px;
        width: 100%;
      }
      .game-admin {
        height: 50px;
        width: 50px;
        padding: 5px;
        flex-grow: 0;
        border-top: solid 1px gray;
      }
      .content-pane {
        flex-grow: 1;
        padding: 10px;
      }
      .players {
        width: 40px;
        background-color: lightgrey;
        height: 100vh;
        padding: 2px;
      }
    `;
  }
}
