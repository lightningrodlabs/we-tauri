import { contextProvided } from "@lit-labs/context";
import { ProfilePrompt } from "@holochain-open-dev/profiles";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress, Button, Fab } from "@scoped-elements/material-web";
import { css, html, LitElement, PropertyValues } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";
import { get } from "svelte/store";

import { weContext } from "../context";
import { WeStore } from "../we-store";
import { CreateGameDialog } from "./create-game-dialog";
import { WeMembers } from "./we-members";
import { InstallableGames } from "./installable-games";
import { WeGameRenderer } from "./we-game-renderer";
import { EntryHashB64 } from "@holochain-open-dev/core-types";
import { SlTooltip } from "@scoped-elements/shoelace";

export class WeDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  _info = new TaskSubscriber(this, () => this._store.fetchInfo());

  _games = new TaskSubscriber(this, () => this._store.fetchAllGames());

  _gamesIAmPlaying = new TaskSubscriber(this, () => this._store.fetchGamesIAmPlaying());


  @property()
  _selectedGameId: EntryHashB64 | undefined = undefined;

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

  renderGamesList() {
    const gamesIAmPlaying = this._gamesIAmPlaying.value;

    if (gamesIAmPlaying) {
      return html`
        <div class="column we-sidebar">
          <mwc-fab
            icon="home"
            @click=${() => { this._selectedGameId = undefined } }
          ></mwc-fab>
          ${Object.entries(gamesIAmPlaying).map(
            ([gameHash, playingGame]) =>
              html`
                <sl-tooltip
                  id="tooltip"
                  placement="right"
                  .content=${playingGame.game.name}
                >
                  <img class="game-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=" @click=${() => { this._selectedGameId = gameHash }} />
                </sl-tooltip>
            `
          )}
        </div>
      `;
    } else {
      return html `
      <mwc-circular-progress indeterminate></mwc-circular-progress>
    `
    }
  }

  renderContent() {
    console.log(this._selectedGameId);
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
      return html`<we-game-renderer id="${this._selectedGameId}" .gameHash=${this._selectedGameId}></we-game-renderer>`;
    }
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
      "we-game-renderer": WeGameRenderer,
      "sl-tooltip": SlTooltip,
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
        align-items: center;
        background: #9ca5e3;
        position: fixed;
        top: 0;
        height: 100vh;
        z-index: 1;
        width: 58px;
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

      .game-logo {
          cursor: pointer;
          margin-top: 8px;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          object-fit: cover;
          background: white;
        }
    `;
  }
}
