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
import { InstallableGames } from "./installable-games";

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
    if (!this._selectedGameId) {
      return html`
        <div class="column">
          <h2>Members</h2>
          <we-members></we-members>
          <h2 style="margin-top: 100px;">hApps available on the DevHub</h2>
          <div style="background: #ecebff; border-radius: 8px; padding: 10px;" >
            <installable-games></installable-games>
          </div>
    </div>
        `;
    } else {
      return html`<we-game .gameHash=${this._selectedGameId.value}></we-game>`;
    }
  }

  renderGamesList() {
    return html`
      <div class="column we-sidebar">
        <we-games></we-games>

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
      "installable-games": InstallableGames,
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

      h2 {
        font-family: Arial, Helvetica, sans-serif;
      }

      .we-sidebar {
        padding: 8px;
        background: #9ca5e3;
        position: fixed;
        top: 0;
        height: 100vh;
        z-index: 1;
      }

      .we-name {
        text-align: center;
        border-bottom: solid 1px gray;
        margin-bottom: 5px;
        width: 100%;
      }

      .content-pane {
        flex-grow: 1;
        padding: 30px;
        margin-left: 72px;
        margin-right: 40px;
        width: 100%;
      }
      .players {
        position: fixed;
        top: 0;
        right: 0;
        width: 40px;
        background-color: lightgrey;
        height: 100vh;
        padding: 2px;
      }
    `;
  }
}
