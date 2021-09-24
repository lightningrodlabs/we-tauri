import { html, css, LitElement } from "lit";
import { state } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { Unsubscriber } from "svelte/store";

import { sharedStyles } from "../sharedStyles";
import { weContext, Dictionary, Signal } from "../types";
import { WeStore } from "../we.store";
import { WeGameDialog } from "./we-game-dialog";
import { WePlayer } from "./we-player";
import { WeGames } from "./we-games";
import { lightTheme, SlAvatar } from '@scoped-elements/shoelace';
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  ListItem,
  Select,
  IconButton,
  Button,
} from "@scoped-elements/material-web";

/**
 * @element we-controller
 */
export class WeController extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }

  /** Public attributes */

  /** Dependencies */

  @contextProvided({ context: weContext })
  _store!: WeStore;

  _games = new StoreSubscriber(this, () => this._store.games);
  _players = new StoreSubscriber(this, () => this._store.players);

  /** Private properties */

  @state() _current = "";

  private initialized = false;
  private initializing = false;
  firstUpdated() {
    this._store.updatePlayers();
    this.checkInit();
  }

  async checkInit() {
    if (!this.initialized && !this.initializing) {
      this.initializing = true  // because checkInit gets call whenever profiles changes...
      let games = await this._store.updateGames();
      // load up a game if there are none:
      if (Object.keys(games).length == 0) {
        console.log("no games found, initializing")
        await this.initializeGames();
        games = await this._store.updateGames();
      }
      this._current = Object.keys(games)[0];
      console.log("current game", this._current, games[this._current].name);
      this.initializing = false
    }
    this.initialized = true;
  }

  async initializeGames() {
    await this._store.addGame({
      name: "profiles",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png",
      meta: {},
    });
    await this._store.addGame({
      name: "chat",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://w7.pngwing.com/pngs/952/46/png-transparent-text-bubble-brand-logo-blue-font-chat-icon-angle-text-rectangle-thumbnail.png",
      meta: {},
    });
  }

  async refresh() {
    await this._store.updateGames();
    await this._store.updatePlayers();
  }

  async openGameDialog() {
    this.gameDialogElem.open();
  }

  get gameDialogElem() : WeGameDialog {
    return this.shadowRoot!.getElementById("game-dialog") as WeGameDialog;
  }

  private handleGameSelect(game: string): void {
    this._current = game;
  }

//    <sl-avatar .image=${profile.fields.avatar}></sl-avatar>
//    <div>${profile.nickname}</div></li>`
  render() {
    if (!this._current) return; // html`<mwc-button  @click=${() => this.checkInit()}>Start</mwc-button>`;
    const players = this._players.value.map((player)=>{
      return html`
<we-player
.hash=${player}
.size=${32}
.me=${player == this._store.myAgentPubKey}
></we-player>
`
    })

    return html`
<we-games @game-selected=${(e:any) => this.handleGameSelect(e.detail)}></we-games>
<mwc-button icon="add_circle" @click=${() =>
      this.openGameDialog()}>New</mwc-button>
<mwc-button icon="refresh" @click=${() => this.refresh()}>Refresh</mwc-button>

<div class="players">${players}</div>

<we-game-dialog id="game-dialog" @game-added=${(e:any) => this._current = e.detail}> ></we-game-dialog>
`;
  }

  static get scopedElements() {
    return {
      "mwc-select": Select,
      "mwc-list-item": ListItem,
      "mwc-icon-button": IconButton,
      "mwc-button": Button,
      "we-game-dialog" : WeGameDialog,
      "we-player" : WePlayer,
      "we-games" : WeGames,
      'sl-avatar': SlAvatar,
    };
  }

  static get styles() {
    return [
      lightTheme,
      sharedStyles,
      css`
        :host {
          margin: 10px;
        }
        .players {
           width: 40px;
           float:right;
        }
        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }
      `,
    ];
  }
}
