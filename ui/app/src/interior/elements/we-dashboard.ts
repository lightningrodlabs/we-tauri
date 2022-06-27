import { contextProvided } from "@lit-labs/context";
import { ListProfiles, ProfilePrompt } from "@holochain-open-dev/profiles";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
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
import { EntryHashB64 } from "@holochain-open-dev/core-types";
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
      timeoutMs=-1
      labelText="Installing..."
      style="text-align: center"
    >
    </mwc-snackbar>
    `
  }

  renderSuccessSnackbar() {
    return html`
      <mwc-snackbar id="installation-success" labelText="Installation successful" style="text-align: center"></mwc-snackbar>
    `
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

  renderPlayers() {
    return html`
      <div class="column">
        <div class="default-font members-title">
          MEMBERS
          <mwc-icon style="position: relative; top: 0.25em; --mdc-icon-size: 1.7em; margin-left: 6px; display: none;">groups</mwc-icon>
        </div>
        <list-profiles style="width= 100%;"></list-profiles>
      </div>
  `;
  }


  renderGamesList(allGames: Record<EntryHashB64, Game>) {
    if (allGames) {
      return html`
        <div class="column we-sidebar flex-scrollable-container" style="left: 78px;">
          <sl-tooltip hoist placement="right" .content="${this._info.value?.name} Home">
            <mwc-fab
              icon="home"
              style="--mdc-theme-secondary: #303F9F"
              @click=${() => {
                this._selectedGameId = undefined
              }}
            ></mwc-fab>
          </sl-tooltip>

          ${Object.entries(allGames)
            .sort(([a_hash, a_game], [b_hash, b_game]) => a_game.name.localeCompare(b_game.name))
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
            })
          }
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
        <div class="column center-content">

          <img class="logo-large" style=" width: 150px; height: 150px;" src=${this._info.value!.logo_src}>
          <div class="default-font" style="font-size: 1.4em; margin-top: 30px; font-weight: bold;">${this._info.value?.name}</div>

          <div class="column center-content" style="margin-top: 50px; width: 100%;">
            <invitations-block></invitations-block>

            <mwc-card style="margin-top: 20px;">
              <div style="margin: 20px;">
                <div class="row title"><img src="https://drive.switch.ch/index.php/s/LePJamPcyx10AXO/download" style="height: 1.6em;"><span style="margin-left: 15px;">hApps available on the DevHub</span></div>
                <div class="row installable-games-container">
                  <installable-games></installable-games>
                </div>
              </div>
            </mwc-card>
          </div>
        </div>
      `;
    } else if (this._store.isInstalled(this._selectedGameId)) {
      return html`
        <we-game-renderer
          id="${this._selectedGameId}"
          .gameHash=${this._selectedGameId}
        ></we-game-renderer>`;
    } else {
      const game = this._store.getGameInfo(this._selectedGameId)!;
      return html`
        <div class="column center-content">
          ${!game.logoSrc
            ? html`<div class="logo-placeholder-large" style="width: 100px; height: 100px;">${game.name[0]}</div>`
            : html`<img class="logo-large" src=${game.logoSrc!}>`
          }
          <div class="row center-content" style="margin-top: 20px;">
            <div class="default-font" style="font-size: 1.4em; margin-left: 50px; margin-right: 5px;">${game.name}</div>
            <mwc-icon-button-toggle onIcon="expand_less" offIcon="expand_more" @click=${this.toggleGameDescription}></mwc-icon-button-toggle>
          </div>
          ${this._showGameDescription
              ? html`<div class="default-font" style="margin-top: 10px; font-size: 1em; max-width: 800px; color: #656565;">${game.description}</div>`
              : html``
            }
          <div class="default-font" style="margin-top: 70px; font-size: 1.2em; text-align: center;">This game has been added by someone else from your group.</div>
          <div class="default-font" style="margin-top: 10px; font-size: 1.2em; text-align: center;">You haven't installed it yet.</div>
          <mwc-button style="margin-top: 50px;" raised @click=${() => this.joinGame(this._selectedGameId!)}>INSTALL</mwc-button>
        </div>
      `
    }
  }

  render() {

    if (this._loading) {
      return html`
        <div class="center-content">
          <mwc-circular-progress style="margin-top: 100px;"></mwc-circular-progress>
    </div>
    `;
    }

    return html`
      <profile-prompt style="flex: 1; display: flex;">

        <div slot="hero">
          <div class="default-font">
            <div class="column center-content">
              <img class="we-logo" style="margin-top: 30px;" src=${this._info.value?.logo_src!}>
              <div style="font-weight: bold; margin-top: 20px; font-size: 1.2em;">${this._info.value?.name}</div>
              <div style="margin-bottom: 45px; margin-top: 55px; font-size: 1.3em;">How would you like to appear in this group?</div>
            </div>
          </div>
        </div>


        ${this.renderJoinErrorSnackbar()}
        ${this.renderInstallingProgress()}
        ${this.renderSuccessSnackbar()}

        ${this._allGames.render({
          complete: (games) => this.renderGamesList(games),
          pending: () => html`
            <mwc-circular-progress indeterminate></mwc-circular-progress>
          `,
        })}

        <div style="display: flex; flex: 1;">
          <div class="content-pane" style="margin-right: ${this._selectedGameId? "0" : "220px"};">${this.renderContent()}</div>
          ${(!this._selectedGameId)
              ? html`<div class="members-sidebar">${this.renderPlayers()}</div>`
              : html``
            }
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
      "list-profiles": ListProfiles,
    };
  }

  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }

      .default-font {
        font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
      }

      .we-sidebar {
        padding: 8px;
        align-items: center;
        background: #9ca5e3;
        position: fixed;
        width: 62px;
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

      .content-pane {
        display: flex;
        flex: 1;
        flex-direction: column;
        padding: 30px;
        margin-left: 72px;
        /* margin-right: 220px; */
        width: 100%;
        position: relative;
      }

      .members-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        width: 220px;
        background-color: #dce4ff;
        height: 100%;
        padding: 2px;
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
        border-radius: 8px;
        padding: 10px;
        width: 100%;
        margin-top: 20px;
        min-height: 100px;
      }
    `;

    return [sharedStyles, localStyles];
  }
}
