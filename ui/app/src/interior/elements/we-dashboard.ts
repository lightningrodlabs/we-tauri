import { contextProvided } from "@lit-labs/context";
import { ProfilePrompt } from "@holochain-open-dev/profiles";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress, Button, Fab } from "@scoped-elements/material-web";
import { css, html, LitElement, PropertyValues } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import { query, state } from "lit/decorators.js";

import { weContext } from "../context";
import { WeStore } from "../we-store";
import { CreateGameDialog } from "./create-game-dialog";
import { WeMembers } from "./we-members";

export class WeDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  _info = new TaskSubscriber(this, () => this._store.fetchInfo());

  _games = new TaskSubscriber(this, () => this._store.fetchAllGames());

  _selectedGameId; // = new StoreSubscriber(this, () => this._store.selectedGameId);

  @query("#game-dialog")
  _gameDialog!: CreateGameDialog;

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
    if (!this._selectedGameId) return html`<we-members></we-members>`;
    else
      return html`<we-game .gameHash=${this._selectedGameId.value}></we-game>`;
  }

  renderGamesList() {
    return html`
      <div class="column">
        <we-games></we-games>

        <mwc-fab icon="add" @click=${() => this._gameDialog.open()}></mwc-fab>
      </div>
    `;
  }

  render() {
    return html`
      <profile-prompt style="flex: 1;">
        ${this.renderGamesList()}

        <div class="content-pane">${this.renderContent()}</div>

        <div class="players">${this.renderPlayers()}</div>

        <create-game-dialog id="game-dialog"></create-game-dialog>
      </profile-prompt>
    `;
  }

  static get scopedElements() {
    return {
      "create-game-dialog": CreateGameDialog,
      "profile-prompt": ProfilePrompt,
      "we-members": WeMembers,
      "mwc-button": Button,
      "mwc-fab": Fab,
      "mwc-circular-progress": CircularProgress,
    };
  }

  static get styles() {
    return css`
      :host {
        display: flex;
      }

      .we-name {
        text-align: center;
        border-bottom: solid 1px gray;
        margin-bottom: 5px;
        width: 100%;
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
