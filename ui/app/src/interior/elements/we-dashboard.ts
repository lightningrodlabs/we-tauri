import { contextProvided } from "@lit-labs/context";
import { ListProfiles, ProfilePrompt } from "@holochain-open-dev/profiles";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListAgentsByStatus } from "@holochain-open-dev/peer-status";
import {
  CircularProgress,
  Button,
  Fab,
  Snackbar,
  IconButtonToggle,
  LinearProgress,
  Card,
} from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";

import { weContext } from "../context";
import { WeStore } from "../we-store";
import { CreateGameDialog } from "./create-game-dialog";
import { InstallableGames } from "./installable-games";
import { WeGameRenderer } from "./we-game-renderer";
import { EntryHashB64, serializeHash } from "@holochain-open-dev/core-types";
import { SlTooltip } from "@scoped-elements/shoelace";
import { classMap } from "lit/directives/class-map.js";
import { sharedStyles } from "../../sharedStyles";
import { InvitationsBlock } from "./invitations-block";
import { Game, PlayingGame } from "../types";

export class WeDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  _info = new TaskSubscriber(
    this,
    ([store]) => store.fetchInfo(),
    () => [this._store]
  );

  _allGames = new TaskSubscriber(
    this,
    () => this._store.fetchAllGames(),
    () => [this._store]
  );

  _allMembers = new TaskSubscriber(
    this,
    () => this._store.profilesStore.fetchAllProfiles(),
    () => [this._store]
  );

  @property()
  _selectedGameId: EntryHashB64 | undefined = undefined;

  @state()
  private _showGameDescription: boolean = false;

  @state()
  private _loading: boolean = true;

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

  renderInstallingProgress() {
    return html`
      <mwc-snackbar
        id="installing-progress"
        timeoutMs="-1"
        labelText="Installing..."
      >
      </mwc-snackbar>
    `;
  }

  renderSuccessSnackbar() {
    return html`
      <mwc-snackbar
        id="installation-success"
        labelText="Installation successful"
      ></mwc-snackbar>
    `;
  }

  protected async firstUpdated() {
    await this._store.fetchGamesIAmPlaying();
    await this._store.fetchInfo();
    this._loading = false;
  }

  toggleGameDescription() {
    this._showGameDescription = !this._showGameDescription;
  }

  async joinGame(gameHash: EntryHashB64) {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    await this._store
      .joinGame(gameHash)
      .then(() => {
        (
          this.shadowRoot?.getElementById("installing-progress") as Snackbar
        ).close();
        (
          this.shadowRoot?.getElementById("installation-success") as Snackbar
        ).show();
        this.requestUpdate(); // to show the newly installed game in case user is still on same page
      })
      .catch((e) => {
        (
          this.shadowRoot?.getElementById("installing-progress") as Snackbar
        ).close();
        (
          this.shadowRoot?.getElementById("join-error-snackbar") as Snackbar
        ).show();
        console.log("Joining error:", e);
      });
  }

  renderGamesList(allGames: Record<EntryHashB64, Game>) {
    if (allGames) {
      return html`
        <div class="column we-sidebar">
          <sl-tooltip
            hoist
            placement="right"
            .content="${this._info.value?.name} Home"
          >
            <mwc-fab
              icon="home"
              style="--mdc-theme-secondary: #303F9F"
              @click=${() => {
                this._selectedGameId = undefined;
              }}
            ></mwc-fab>
          </sl-tooltip>

          ${Object.entries(allGames)
            .sort(([a_hash, a_game], [b_hash, b_game]) =>
              a_game.name.localeCompare(b_game.name)
            )
            .map(([gameHash, game]) => {
              if (!game.logoSrc) {
                return html`
                  <sl-tooltip
                    id="tooltip"
                    placement="right"
                    .content=${game.name}
                  >
                    <div
                      class="game-logo-placeholder ${classMap({
                        highlighted: gameHash === this._selectedGameId,
                      })}"
                      @click=${() => {
                        this._selectedGameId = gameHash;
                      }}
                    >
                      ${game.name[0]}
                    </div>
                  </sl-tooltip>
                `;
              } else {
                return html`
                  <sl-tooltip
                    id="tooltip"
                    placement="right"
                    .content=${game.name}
                  >
                    <img
                      class="game-logo ${classMap({
                        highlighted: gameHash === this._selectedGameId,
                      })}"
                      src=${game.logoSrc}
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

  renderContent() {
    if (!this._selectedGameId) {
      return html`
        <div class="column" style="flex: 1; margin: 24px;">
          <div class="row center-content" style="margin-top: 56px">
            <div class="column center-content">
              <img
                class="logo-large"
                style=" width: 150px; height: 150px;"
                src=${this._info.value!.logo_src}
              />
              <div
                style="font-size: 1.4em; margin-top: 30px; font-weight: bold;"
              >
                ${this._info.value?.name}
              </div>
            </div>

            <invitations-block style="margin-left: 50px;"></invitations-block>
          </div>

          <div class="row title" style="margin-top: 80px;">
            <span style="align-self: start">Applets Library</span>
          </div>

          <hr style="width: 100%" />

          <div class="row installable-games-container">
            <installable-games></installable-games>
          </div>
        </div>
      `;
    } else if (this._store.isInstalled(this._selectedGameId)) {
      return html` <we-game-renderer
        style="flex: 1"
        id="${this._selectedGameId}"
        .gameHash=${this._selectedGameId}
      ></we-game-renderer>`;
    } else {
      const game = this._store.getGameInfo(this._selectedGameId)!;
      return html`
        <div class="column center-content">
          ${!game.logoSrc
            ? html`<div
                class="logo-placeholder-large"
                style="width: 100px; height: 100px;"
              >
                ${game.name[0]}
              </div>`
            : html`<img class="logo-large" src=${game.logoSrc!} />`}
          <div class="row center-content" style="margin-top: 20px;">
            <div
              style="font-size: 1.4em; margin-left: 50px; margin-right: 5px;"
            >
              ${game.name}
            </div>
            <mwc-icon-button-toggle
              onIcon="expand_less"
              offIcon="expand_more"
              @click=${this.toggleGameDescription}
            ></mwc-icon-button-toggle>
          </div>
          ${this._showGameDescription
            ? html`<div
                style="margin-top: 10px; font-size: 1em; max-width: 800px; color: #656565;"
              >
                ${game.description}
              </div>`
            : html``}
          <div style="margin-top: 70px; font-size: 1.2em; text-align: center;">
            This game has been added by someone else from your group.
          </div>
          <div style="margin-top: 10px; font-size: 1.2em; text-align: center;">
            You haven't installed it yet.
          </div>
          <mwc-button
            style="margin-top: 50px;"
            raised
            @click=${() => this.joinGame(this._selectedGameId!)}
            >INSTALL</mwc-button
          >
        </div>
      `;
    }
  }

  render() {
    if (this._loading) {
      return html`
        <div class="center-content">
          <mwc-circular-progress
            style="margin-top: 100px;"
          ></mwc-circular-progress>
        </div>
      `;
    }

    return html`
      <profile-prompt style="flex: 1; display: flex;">
        <div slot="hero">
          <div>
            <div class="column center-content">
              <img
                class="we-logo"
                style="margin-top: 30px;"
                src=${this._info.value?.logo_src!}
              />
              <div
                style="font-weight: bold; margin-top: 20px; font-size: 1.2em;"
              >
                ${this._info.value?.name}
              </div>
              <div
                style="margin-bottom: 45px; margin-top: 55px; font-size: 1.3em;"
              >
                How would you like to appear in this group?
              </div>
            </div>
          </div>
        </div>

        ${this.renderJoinErrorSnackbar()} ${this.renderInstallingProgress()}
        ${this.renderSuccessSnackbar()}

        <div class="row" style="flex: 1">
          ${this._allGames.render({
            complete: (games) => this.renderGamesList(games),
            pending: () => html`
              <mwc-circular-progress indeterminate></mwc-circular-progress>
            `,
          })}
          ${this.renderContent()}

          <div class="members-sidebar">
            ${this._allMembers.render({
              complete: (profiles) =>
                html`<list-agents-by-status
                  .agents=${Object.keys(profiles).filter(
                    (agentPubKey) =>
                      agentPubKey !== serializeHash(this._store.myAgentPubKey)
                  )}
                ></list-agents-by-status>`,
              pending: () => html`
                <mwc-circular-progress indeterminate></mwc-circular-progress>
              `,
            })}
          </div>
        </div>

        <create-game-dialog id="game-dialog"></create-game-dialog>
      </profile-prompt>
    `;
  }

  static get scopedElements() {
    return {
      "create-game-dialog": CreateGameDialog,
      "profile-prompt": ProfilePrompt,
      "installable-games": InstallableGames,
      "mwc-button": Button,
      "mwc-fab": Fab,
      "mwc-card": Card,
      "mwc-circular-progress": CircularProgress,
      "we-game-renderer": WeGameRenderer,
      "sl-tooltip": SlTooltip,
      "invitations-block": InvitationsBlock,
      "mwc-icon-button-toggle": IconButtonToggle,
      "mwc-linear-progress": LinearProgress,
      "list-agents-by-status": ListAgentsByStatus,
    };
  }

  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }

      .we-sidebar {
        padding: 8px;
        align-items: center;
        background: #9ca5e3;
      }

      .we-name {
        text-align: center;
        border-bottom: solid 1px gray;
        margin-bottom: 5px;
        width: 100%;
      }

      .we-logo {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        object-fit: cover;
      }

      .members-sidebar {
        width: 224px;
        background-color: #ecebff;
        padding: 24px;
      }

      .members-title {
        font-size: 1em;
        font-weight: 600;
        text-align: right;
        margin: 25px 25px 20px 25px;
        color: #1b245d;
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
        box-shadow: 0 0 10px #0000;
        background: gray;
      }

      .logo-large {
        border-radius: 50%;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }

      .logo-placeholder-large {
        text-align: center;
        font-size: 70px;
        border-radius: 50%;
        border: 4px solid black;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }

      .game-card {
        width: 300px;
        height: 180px;
        margin: 10px;
      }

      .highlighted {
        border: #303f9f 4px solid;
      }

      .installable-games-container {
        padding: 10px;
        width: 100%;
      }
    `;

    return [sharedStyles, localStyles];
  }
}
