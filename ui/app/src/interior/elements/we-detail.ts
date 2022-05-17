import { contextProvided, provide } from "@holochain-open-dev/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress, Button } from "@scoped-elements/material-web";
import { css, html, LitElement, PropertyValues } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import { query, state } from "lit/decorators.js";

import { weContext } from "../context";
import { WeStore } from "../we-store";
import { CreateGameDialog } from "./create-game-dialog";

export class WeDetail extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, multiple: true })
  @state()
  _store!: WeStore;

  _info = new TaskSubscriber(this, () => this._store.fetchInfo());
  _selectedGameId; // = new StoreSubscriber(this, () => this._store.selectedGameId);

  @query("#game-dialog")
  _gameDialog!: CreateGameDialog;

  async openGameDialog() {
    this._gameDialog.open();
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);
    if (changedValues.has("_store")) {
      this.refresh();
    }
  }

  async refresh() {
    //    await Promise.all([this._store.fetchGames(), this._store.fetchPlayers()]);
  }

  renderPlayers() {
    return html``;
  }

  renderContent() {
    if (!this._selectedGameId)
      return html`<mwc-button
          icon="add_circle"
          @click=${() => this.openGameDialog()}
          >Add Game</mwc-button
        >
        <mwc-button icon="refresh" @click=${() => this.refresh()}
          >Refresh</mwc-button
        >`;
    else
      return html`<we-game .gameHash=${this._selectedGameId.value}></we-game>`;
  }

  render() {
    if (this._info.loading)
      return html`
        <div class="column center-content" style="flex: 1;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `;

    return html` <div class="games-list">
        <div class="we-name">${this._info.value.name}</div>
        <we-games></we-games>
        <img class="game-admin" />
      </div>

      <div class="content-pane">${this.renderContent()}</div>

      <div class="players">${this.renderPlayers()}</div>

      <create-game-dialog id="game-dialog"></create-game-dialog>`;
  }

  static get scopedElements() {
    return {
      "create-game-dialog": CreateGameDialog,
      "mwc-button": Button,
      "mwc-circular-progress": CircularProgress,
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
