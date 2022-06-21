import { contextProvided } from "@lit-labs/context";
import { ProfilePrompt } from "@holochain-open-dev/profiles";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  CircularProgress,
  Button,
  Fab,
  Snackbar,
} from "@scoped-elements/material-web";
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
import { classMap } from "lit/directives/class-map.js";
import { sharedStyles } from "../../sharedStyles";

export class WeDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  _info = new TaskSubscriber(
    this,
    ([store]) => store.fetchInfo(),
    () => [this._store]
  );

  // _allGames = new TaskSubscriber(this, () => this._store.fetchAllGames());
  // _allGames = new StoreSubscriber(this, () => this._store.allGames);

  _gamesIAmPlaying = new TaskSubscriber(
    this,
    ([s]) => s.fetchGamesIAmPlaying(),
    () => [this._store]
  );

  _unjoinedGames = new StoreSubscriber(this, () => this._store.unjoinedGames);

  @property()
  _selectedGameId: EntryHashB64 | undefined = undefined;

  @query("#game-dialog")
  _gameDialog!: CreateGameDialog;

  renderJoinErrorSnackbar() {
    return html`
      <mwc-snackbar
        id="join-error-snackbar"
        labelText="Joining failed! (See console for details)"
      >
      </mwc-snackbar>
    `;
  }

  async joinGame(gameHash: EntryHashB64) {
    await this._store
      .joinGame(gameHash)
      .then(() => {})
      .catch((e) => {
        (
          this.shadowRoot?.getElementById("join-error-snackbar") as Snackbar
        ).show();
        console.log("Joining error:", e);
      });
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
            @click=${() => {
              this._selectedGameId = undefined;
            }}
          ></mwc-fab>
          ${Object.entries(gamesIAmPlaying).map(([gameHash, playingGame]) => {
            console.log("playing game: ", playingGame);
            if (!playingGame.game.logoSrc) {
              return html`
                <sl-tooltip
                  id="tooltip"
                  placement="right"
                  .content=${playingGame.game.name}
                >
                  <div
                    class="game-logo-placeholder ${classMap({
                      highlighted: gameHash === this._selectedGameId,
                    })}"
                    @click=${() => {
                      this._selectedGameId = gameHash;
                    }}
                  >
                    ${playingGame.game.name[0]}
                  </div>
                </sl-tooltip>
              `;
            } else {
              return html`
                <sl-tooltip
                  id="tooltip"
                  placement="right"
                  .content=${playingGame.game.name}
                >
                  <img
                    class="game-logo ${classMap({
                      highlighted: gameHash === this._selectedGameId,
                    })}"
                    src=${playingGame.game.logoSrc}
                    @click=${() => {
                      this._selectedGameId = gameHash;
                    }}
                  />
                </sl-tooltip>
              `;
            }
          })}
        </div>
      `;
    } else {
      return html`
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      `;
    }
  }

  // Renders a list of the games of the we which the agent hasn't joined yet.
  renderNewGamesList() {
    const unjoinedGames = this._unjoinedGames.value;
    if (Object.entries(unjoinedGames).length > 0) {
      return html`
        ${Object.entries(unjoinedGames).map(([gameHash, game]) => {
          return html`
            <h2 style="margin-top: 100px;">
              New Games you haven't joined yet:
            </h2>
            <div
              style="background: #c6fcba; border-radius: 8px; padding: 10px;"
            >
              <mwc-card class="game-card">
                <div style="height: 145px;">
                  <h2 style="padding: 5px; margin:0;">${game.name}</h2>
                  <div style="height: 70px; overflow-y: auto; padding: 5px;">
                    ${game.description}
                  </div>
                </div>
                <mwc-button
                  outlined
                  @click=${() => {
                    this.joinGame(gameHash);
                  }}
                  >JOIN</mwc-button
                >
              </mwc-card>
            </div>
          `;
        })}
      `;
    }
  }

  renderContent() {
    console.log(this._selectedGameId);

    if (!this._selectedGameId) {
      return html`
        ${this.renderJoinErrorSnackbar()}
        <div class="column">
          <h2>Members</h2>
          <we-members></we-members>
          ${this.renderNewGamesList()}
          <h2 style="margin-top: 100px;">hApps available on the DevHub</h2>
          <div style="background: #ecebff; border-radius: 8px; padding: 10px;">
            <installable-games></installable-games>
          </div>
        </div>
      `;
    } else {
      return html` ${this.renderJoinErrorSnackbar()}
        <we-game-renderer
          id="${this._selectedGameId}"
          .gameHash=${this._selectedGameId}
        ></we-game-renderer>`;
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
    const localStyles = css`
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

      .game-logo:hover {
        box-shadow: 0 0 5px #0000;
      }

      .game-logo-placeholder {
        text-align: center;
        font-size: 35px;
        cursor: pointer;
        margin-top: 8px;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        object-fit: cover;
        background: white;
      }

      .game-logo-placeholder:hover {
        box-shadow: 0 0 5px #0000;
      }

      .game-card {
        width: 300px;
        height: 180px;
        margin: 10px;
      }

      .highlighted {
        border: #303f9f 4px solid;
      }
    `;

    return [sharedStyles, localStyles];
  }
}
